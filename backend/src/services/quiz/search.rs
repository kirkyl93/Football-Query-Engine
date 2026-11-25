use super::{QuizError, QuizResult, play::HintKind};
use crate::services::player::{
    models::{SearchParams, SortOption, StatScope},
    search_by_count::construct_number_of_games_or_seasons_query_from_params,
    search_by_game, search_by_season_or_across_seasons,
    sql_models::{PlayerGameSearchResult, PlayerNumberOfGamesOrSeasonsResult, PlayerSearchResult},
};
use actix_web::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sqlx::{PgPool, Postgres, QueryBuilder, postgres::PgRow};
use std::collections::{BTreeMap, BTreeSet, HashMap};

#[derive(Serialize, Deserialize)]
pub(super) struct RatedPlayer {
    pub id: i32,
    pub rows: Vec<Value>,
    // Jev’s original rating, separate from the derived rank and awarded points.
    pub difficulty: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty_override: Option<f64>,
    pub points: i32,
}

pub(super) struct PlayerRows {
    pub id: i32,
    pub rows: Vec<Value>,
}

pub(super) async fn players(
    pool: &PgPool,
    endpoint: &str,
    query: &str,
) -> QuizResult<Vec<PlayerRows>> {
    let parsed: SearchParams = serde_urlencoded::from_str(query)
        .map_err(|_| QuizError(StatusCode::BAD_REQUEST, "Invalid search filters."))?;
    let mut params = parsed.to_processed();
    params.pagination = None;
    let results = match endpoint {
        "game" => {
            params.scope = StatScope::Game;
            rows::<PlayerGameSearchResult>(
                pool,
                search_by_game::construct_query_from_params(params),
            )
            .await?
        }
        "occurrences"
            if matches!(
                params.sort,
                SortOption::NumberOfGamesWith | SortOption::NumberOfSeasonsWith
            ) =>
        {
            rows::<PlayerNumberOfGamesOrSeasonsResult>(
                pool,
                construct_number_of_games_or_seasons_query_from_params(params),
            )
            .await?
        }
        "totals" => {
            rows::<PlayerSearchResult>(
                pool,
                search_by_season_or_across_seasons::construct_query_from_params(params),
            )
            .await?
        }
        _ => {
            return Err(QuizError(
                StatusCode::BAD_REQUEST,
                "Invalid search result type.",
            ));
        }
    };
    group(results)
}

async fn rows<T>(pool: &PgPool, mut query: QueryBuilder<Postgres>) -> QuizResult<Vec<Value>>
where
    T: for<'row> sqlx::FromRow<'row, PgRow> + Send + Unpin + Serialize,
{
    let rows = query.build_query_as::<T>().fetch_all(pool).await?;
    rows.into_iter()
        .map(|row| {
            serde_json::to_value(row).map_err(|_| {
                QuizError(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Could not save the search result.",
                )
            })
        })
        .collect()
}

fn group(results: Vec<Value>) -> QuizResult<Vec<PlayerRows>> {
    if results.is_empty() {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "This search has no correct players.",
        ));
    }
    let mut by_id = HashMap::new();
    let mut players = Vec::<PlayerRows>::new();
    for row in results {
        let id = row["player_id"]
            .as_i64()
            .and_then(|id| i32::try_from(id).ok())
            .ok_or(QuizError(
                StatusCode::INTERNAL_SERVER_ERROR,
                "A search result is missing its player ID.",
            ))?;
        let index = *by_id.entry(id).or_insert_with(|| {
            players.push(PlayerRows {
                id,
                rows: Vec::new(),
            });
            players.len() - 1
        });
        players[index].rows.push(row);
    }
    Ok(players)
}

#[derive(Serialize)]
pub(super) struct Clue<'a> {
    pub player: Option<&'a str>,
    pub points: Option<i32>,
    pub stats: Map<String, Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<&'a Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub row_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub found: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purchased_hints: Option<&'a BTreeSet<HintKind>>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub hints: BTreeMap<HintKind, Value>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub available_hints: Vec<HintKind>,
}

pub(super) fn clue(row: &Value, revealed: bool, points: i32) -> Clue<'_> {
    let fields = [
        "rank",
        "season",
        "competition_country_code",
        "competition_name",
        "total_appearances",
        "substitute_appearances",
        "total_minutes_played",
        "total_goals",
        "total_assists",
        "total_yellow_cards",
        "total_red_cards",
        "mins_per_goal",
        "mins_per_assist",
        "mins_per_goal_or_assist",
        "mins_per_yellow",
        "mins_per_red",
        "number_of_games",
        "number_of_seasons",
        "minutes_played",
        "goals",
        "assists",
    ];
    let mut stats: Map<_, _> = fields
        .into_iter()
        .filter_map(|field| {
            row.get(field)
                .filter(|value| field != "season" || value.as_i64().is_some_and(|v| v > 0))
                .map(|value| (field.into(), value.clone()))
        })
        .collect();
    if revealed {
        if let Some(clubs) = row.get("clubs_played_for").or_else(|| row.get("club_id")) {
            stats.insert("clubs".into(), clubs.clone());
        }
    }
    Clue {
        player: revealed.then(|| row["player_name"].as_str()).flatten(),
        points: revealed.then_some(points),
        stats,
        result: None,
        row_index: None,
        found: None,
        purchased_hints: None,
        hints: BTreeMap::new(),
        available_hints: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn groups_repeated_rows_without_capping_the_answer_count() {
        let mut results: Vec<_> = (1..=600).map(|id| json!({"player_id":id})).collect();
        results.push(json!({"player_id":1,"season":2000}));
        let groups = group(results).unwrap();
        assert_eq!(groups.len(), 600);
        assert_eq!(groups[0].rows.len(), 2);
        assert_eq!(groups.last().unwrap().id, 600);
        assert!(group(Vec::new()).is_err());
    }

    #[test]
    fn quiz_search_queries_can_read_all_results() {
        let mut params = SearchParams::default().to_processed();
        let paginated =
            search_by_season_or_across_seasons::construct_query_from_params(params.clone());
        assert!(paginated.sql().as_str().contains("\nLIMIT "));

        params.pagination = None;
        let totals =
            search_by_season_or_across_seasons::construct_query_from_params(params.clone());
        params.scope = StatScope::Game;
        let games = search_by_game::construct_query_from_params(params.clone());
        params.scope = StatScope::Overall;
        params.sort = SortOption::NumberOfGamesWith;
        let counts = construct_number_of_games_or_seasons_query_from_params(params);
        for query in [totals, games, counts] {
            assert!(!query.sql().as_str().contains("\nLIMIT "));
            assert!(!query.sql().as_str().contains("\nOFFSET "));
        }
    }

    #[test]
    fn saved_quiz_answers_require_a_jev_rating() {
        let mut answer = json!({"id":1,"rows":[{"rank":1}],"points":1,"difficulty":2.125});
        let rated = serde_json::from_value::<RatedPlayer>(answer.clone()).unwrap();
        assert_eq!(rated.difficulty, 2.125);
        answer.as_object_mut().unwrap().remove("difficulty");
        assert!(serde_json::from_value::<RatedPlayer>(answer).is_err());
    }

    #[test]
    fn hidden_clues_keep_stats_and_remove_identity() {
        let row = json!({"player_id":3,"player_name":"Example","total_goals":30,"clubs_played_for":"1","country_code":"gb-eng"});
        let hidden = serde_json::to_value(clue(&row, false, 5)).unwrap();
        assert_eq!(
            hidden,
            json!({"player":null,"points":null,"stats":{"total_goals":30}})
        );
        assert_eq!(clue(&row, true, 5).player, Some("Example"));
    }
}
