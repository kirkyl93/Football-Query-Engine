use super::{QuizError, QuizResult, play::HintKind};
use crate::services::player::{
    models::{ProcessedSearchParams, SearchParams, SortOption, StatScope, StatThresholds},
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
    group(result_rows(pool, endpoint, params).await?)
}

async fn result_rows(
    pool: &PgPool,
    endpoint: &str,
    mut params: ProcessedSearchParams,
) -> QuizResult<Vec<Value>> {
    match endpoint {
        "game" => {
            params.scope = StatScope::Game;
            rows::<PlayerGameSearchResult>(
                pool,
                search_by_game::construct_query_from_params(params),
            )
            .await
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
            .await
        }
        "totals" => {
            rows::<PlayerSearchResult>(
                pool,
                search_by_season_or_across_seasons::construct_query_from_params(params),
            )
            .await
        }
        _ => Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Invalid search result type.",
        )),
    }
}

pub(super) async fn wrong_guess_stats(
    pool: &PgPool,
    search: &str,
    game_scope: bool,
    player_ids: Vec<i32>,
) -> QuizResult<HashMap<i32, Vec<Map<String, Value>>>> {
    let (mut params, endpoint) = wrong_guess_search(search, game_scope)?;
    let thresholds = params.thresholds;
    let fields = relevant_stats(&params, endpoint);
    if endpoint != "occurrences" {
        params.thresholds = StatThresholds::default();
    }
    params.player_ids = player_ids;
    let mut rows_by_player = HashMap::<i32, Vec<Map<String, Value>>>::new();
    let mut rows = result_rows(pool, endpoint, params).await?;
    if endpoint == "totals" {
        // Preserve search order for seasons equally close to the stat thresholds.
        rows.sort_by_cached_key(|row| threshold_gap(row, thresholds));
    }
    for row in rows {
        if let Some(id) = row["player_id"]
            .as_i64()
            .and_then(|id| i32::try_from(id).ok())
        {
            rows_by_player
                .entry(id)
                .or_default()
                .push(project_stats(&row, &fields));
        }
    }
    Ok(rows_by_player)
}

fn wrong_guess_search(
    search: &str,
    game_scope: bool,
) -> QuizResult<(ProcessedSearchParams, &'static str)> {
    let parsed: SearchParams = serde_urlencoded::from_str(search).map_err(|_| {
        QuizError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not read the saved quiz filters.",
        )
    })?;
    let mut params = parsed.to_processed();
    params.pagination = None;
    let endpoint = if game_scope {
        "game"
    } else if matches!(
        params.sort,
        SortOption::NumberOfGamesWith | SortOption::NumberOfSeasonsWith
    ) {
        "occurrences"
    } else {
        "totals"
    };
    Ok((params, endpoint))
}

fn relevant_stats(params: &ProcessedSearchParams, endpoint: &str) -> Vec<&'static str> {
    if endpoint == "totals" {
        let filtered: Vec<_> = stat_thresholds(params.thresholds)
            .into_iter()
            .filter(|&(field, min, max)| {
                max >= 0 || min >= 0 && (field != "total_appearances" || min > 0)
            })
            .map(|(field, _, _)| field)
            .collect();
        if !filtered.is_empty() {
            return filtered;
        }
    }

    vec![match params.sort {
        SortOption::Goals => "total_goals",
        SortOption::Assists => "total_assists",
        SortOption::GoalsAndAssists => "goals_and_assists",
        SortOption::Appearances => "total_appearances",
        SortOption::MinutesPlayed => "total_minutes_played",
        SortOption::YellowCards => "total_yellow_cards",
        SortOption::RedCards => "total_red_cards",
        SortOption::MinutesPerGoal => "mins_per_goal",
        SortOption::MinutesPerAssist => "mins_per_assist",
        SortOption::MinutesPerGoalOrAssist => "mins_per_goal_or_assist",
        SortOption::MinutesPerYellow => "mins_per_yellow",
        SortOption::MinutesPerRed => "mins_per_red",
        SortOption::NumberOfGamesWith => "number_of_games",
        SortOption::NumberOfSeasonsWith => "number_of_seasons",
    }]
}

fn project_stats(row: &Value, fields: &[&str]) -> Map<String, Value> {
    let mut stats: Map<_, _> = ["season", "date", "competition_name"]
        .into_iter()
        .filter_map(|field| {
            row.get(field)
                .filter(|value| {
                    field != "season" || value.as_i64().is_some_and(|season| season > 0)
                })
                .map(|value| (field.into(), value.clone()))
        })
        .collect();
    for &field in fields {
        if let Some(value) = stat_value(row, field) {
            stats.insert(field.into(), value);
        }
    }
    stats
}

fn stat_value(row: &Value, field: &str) -> Option<Value> {
    if field == "goals_and_assists" {
        let goals = stat_value(row, "total_goals")?.as_i64()?;
        let assists = stat_value(row, "total_assists")?.as_i64()?;
        return Some(Value::from(goals + assists));
    }
    row.get(field)
        .or_else(|| match field {
            "total_goals" => row.get("goals"),
            "total_assists" => row.get("assists"),
            "total_minutes_played" => row.get("minutes_played"),
            _ => None,
        })
        .cloned()
}

fn stat_thresholds(t: StatThresholds) -> [(&'static str, i32, i32); 6] {
    [
        ("total_appearances", t.min_appearances, t.max_appearances),
        ("total_goals", t.min_goals, t.max_goals),
        ("total_assists", t.min_assists, t.max_assists),
        (
            "goals_and_assists",
            t.min_goals_and_assists,
            t.max_goals_and_assists,
        ),
        ("total_yellow_cards", t.min_yellow_cards, t.max_yellow_cards),
        ("total_red_cards", t.min_red_cards, t.max_red_cards),
    ]
}

fn threshold_gap(row: &Value, thresholds: StatThresholds) -> i64 {
    stat_thresholds(thresholds)
        .into_iter()
        .map(|(field, min, max)| {
            let value = stat_value(row, field)
                .and_then(|value| value.as_i64())
                .unwrap_or_default();
            (i64::from(min) - value).max(0)
                + if max >= 0 {
                    (value - i64::from(max)).max(0)
                } else {
                    0
                }
        })
        .sum()
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
    fn wrong_guess_stats_only_include_the_question_metrics() {
        let totals = json!({"season": 2024, "rank": 8, "total_goals": 8, "total_assists": 3,
            "total_appearances": 24, "mins_per_goal": null});
        for (query, expected) in [
            ("ming=10", json!({"season": 2024, "total_goals": 8})),
            ("mina=5", json!({"season": 2024, "total_assists": 3})),
            (
                "ming=10&mina=5",
                json!({"season": 2024, "total_goals": 8, "total_assists": 3}),
            ),
            ("minga=15", json!({"season": 2024, "goals_and_assists": 11})),
            ("maxap=0", json!({"season": 2024, "total_appearances": 24})),
            ("sort=mpg", json!({"season": 2024, "mins_per_goal": null})),
        ] {
            let (params, endpoint) = wrong_guess_search(query, false).unwrap();
            assert_eq!(
                Value::Object(project_stats(&totals, &relevant_stats(&params, endpoint))),
                expected
            );
        }
        let (params, endpoint) = wrong_guess_search("sort=sw&ming=5", false).unwrap();
        assert_eq!(relevant_stats(&params, endpoint), ["number_of_seasons"]);
        let (params, endpoint) = wrong_guess_search("sort=ga", true).unwrap();
        let game = json!({"date": "2024-08-20", "goals": 1, "assists": 2, "minutes_played": 90});
        assert_eq!(
            Value::Object(project_stats(&game, &relevant_stats(&params, endpoint))),
            json!({"date": "2024-08-20", "goals_and_assists": 3})
        );
    }

    #[test]
    fn wrong_guess_stats_keep_the_query_context_and_rank_closest_seasons_first() {
        let (mut params, endpoint) =
            wrong_guess_search("scope=s&comps=GB1&clubspa=31&ming=5&maxa=2", false).unwrap();
        assert_eq!(endpoint, "totals");
        assert_eq!(params.scope, StatScope::Season);
        assert_eq!(params.competitions.len(), 1);
        assert_eq!(params.clubs_played_against, [31]);

        let near = json!({"total_goals": 4, "total_assists": 2});
        let far = json!({"total_goals": 7, "total_assists": 5});
        assert_eq!(threshold_gap(&near, params.thresholds), 1);
        assert_eq!(threshold_gap(&far, params.thresholds), 3);
        params.player_ids = vec![12, 35];
        params.thresholds = StatThresholds::default();
        let query = search_by_season_or_across_seasons::construct_query_from_params(params);
        assert!(query.sql().as_str().contains("AND a.player_id = ANY("));

        let (params, endpoint) = wrong_guess_search("sort=sw&ming=5", false).unwrap();
        assert_eq!(endpoint, "occurrences");
        assert_eq!(params.thresholds.min_goals, 5);
    }

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
