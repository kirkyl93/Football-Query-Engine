use crate::services::errors::db_list_result;
use crate::services::player::models::{PenaltyOption, SearchParams, SortOption, StatScope};
use crate::services::player::player_query_builder::{
    PlayerFilterMethods, PlayerMinuteFilterMethods,
};
use crate::services::player::sql_models::PlayerAppearances;
use actix_web::{HttpResponse, post, web};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, Postgres, QueryBuilder, Row, postgres::PgRow};

/// Membership comes from the original search; full records are loaded only on expansion.
#[derive(Deserialize)]
pub struct DetailRequest {
    pub search: SearchParams,
    #[serde(default)]
    pub qualifying_game_ids: Vec<i32>,
    #[serde(default)]
    pub qualifying_seasons: Vec<i32>,
    pub result_season: Option<i32>,
}

#[derive(Serialize)]
pub struct DetailStats {
    appearances: i64,
    minutes: i64,
    goals: i64,
    assists: i64,
    yellows: i64,
    reds: i64,
}

#[derive(Serialize)]
pub struct DetailGame {
    #[serde(flatten)]
    appearance: PlayerAppearances,
    qualifies: bool,
    matches_filters: bool,
    stats: DetailStats,
}

impl<'r> FromRow<'r, PgRow> for DetailGame {
    fn from_row(row: &'r PgRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            appearance: PlayerAppearances::from_row(row)?,
            qualifies: row.try_get("qualifies")?,
            matches_filters: row.try_get("matches_filters")?,
            stats: DetailStats {
                appearances: row.try_get("counted_appearances")?,
                minutes: row.try_get("counted_minutes")?,
                goals: row.try_get("counted_goals")?,
                assists: row.try_get("counted_assists")?,
                yellows: row.try_get("counted_yellows")?,
                reds: row.try_get("counted_reds")?,
            },
        })
    }
}

#[post("/players/{id}/search-details")]
pub async fn search_details(
    pool: web::Data<PgPool>,
    player: web::Path<i32>,
    request: web::Json<DetailRequest>,
) -> HttpResponse {
    let mut query = build_detail_query(player.into_inner(), &request);
    db_list_result(
        query
            .build_query_as::<DetailGame>()
            .fetch_all(pool.get_ref())
            .await,
    )
}

fn build_detail_query(player_id: i32, request: &DetailRequest) -> QueryBuilder<Postgres> {
    let mut search = request.search.to_processed();
    if search.scope == StatScope::Season && search.sort != SortOption::NumberOfSeasonsWith {
        if let Some(season) = request.result_season {
            search.seasons = vec![season];
        }
    }
    // Wider context retains seasons/competitions. Other filters determine membership,
    // while the same minute window and penalty setting apply to every displayed row.
    let mut context = SearchParams::default().to_processed();
    context.seasons = search.seasons.clone();
    context.competitions = search.competitions.clone();
    context.minute_window = search.minute_window;

    let mut query = QueryBuilder::new("");
    if search.has_minute_filter() {
        query.construct_player_appearances_using_minute_filters(&context, Some(player_id));
    } else {
        query
            .push(
                "WITH games_minute_appearance_filter AS (
                    SELECT a.player_id, a.game_id, a.player_club_id AS club_id, g.season,
                        a.goals, a.penalty_goals, a.assists, a.yellow_cards, a.red_cards,
                        a.minutes_played, 1 AS appearances
                    FROM appearances_enhanced a
                    JOIN games g ON g.game_id = a.game_id
                    JOIN players p ON p.player_id = a.player_id
                    WHERE a.player_id = ",
            )
            .push_bind(player_id)
            .add_player_filters(&context)
            .push(")");
    }
    query.push(", eligible AS (SELECT DISTINCT a.game_id FROM appearances_enhanced a JOIN games g ON g.game_id = a.game_id JOIN players p ON p.player_id = a.player_id WHERE a.player_id = ")
        .push_bind(player_id).add_player_filters(&search).push(") SELECT ");

    if search.sort == SortOption::NumberOfSeasonsWith {
        query
            .push("(a.season = ANY(")
            .push_bind(request.qualifying_seasons.clone())
            .push(") AND eligible.game_id IS NOT NULL AND a.appearances > 0)");
    } else {
        query
            .push("a.game_id = ANY(")
            .push_bind(request.qualifying_game_ids.clone())
            .push(")");
    }
    query.push(
        " AS qualifies, (eligible.game_id IS NOT NULL AND a.appearances > 0) AS matches_filters,
        a.game_id, ROW_NUMBER() OVER (ORDER BY g.date, a.game_id) AS game_number,
        a.club_id, g.home_club_id, g.home_club_name, g.away_club_id, g.away_club_name,
        g.home_club_goals, g.away_club_goals, g.date, a.season,
        g.competition_id, c.name AS competition_name, c.type AS competition_type,
        a.goals, a.penalty_goals, a.assists, a.yellow_cards, a.red_cards,
        e.played_from_minute, e.subbed_off_minute,
        CASE WHEN (a.club_id = g.home_club_id AND g.home_club_goals > g.away_club_goals)
               OR (a.club_id = g.away_club_id AND g.away_club_goals > g.home_club_goals) THEN 'Win'
             WHEN g.home_club_goals = g.away_club_goals THEN 'Draw' ELSE 'Loss' END AS result,
        a.appearances::bigint AS counted_appearances, a.minutes_played::bigint AS counted_minutes,",
    );
    query
        .push(match search.penalty {
            PenaltyOption::ExcludePenalties => "(a.goals - a.penalty_goals)",
            PenaltyOption::OnlyPenalties => "a.penalty_goals",
            _ => "a.goals",
        })
        .push(
            "::bigint AS counted_goals, a.assists::bigint AS counted_assists,
        a.yellow_cards::bigint AS counted_yellows, ",
        );
    query
        .push(if search.has_minute_filter() {
            "a.red_cards"
        } else {
            "(a.red_cards + CASE WHEN a.yellow_cards >= 2 THEN 1 ELSE 0 END)"
        })
        .push("::bigint AS counted_reds, ");
    for column in [
        "goal_minutes",
        "penalty_goal_minutes",
        "own_goal_minutes",
        "assist_minutes",
        "yellow_minutes",
        "red_minutes",
    ] {
        let hidden = (column == "goal_minutes" && search.penalty == PenaltyOption::OnlyPenalties)
            || (column == "penalty_goal_minutes"
                && search.penalty == PenaltyOption::ExcludePenalties);
        if hidden {
            query.push("ARRAY[]::integer[]");
        } else if search.has_minute_filter() {
            query
                .push("ARRAY(SELECT minute FROM UNNEST(e.")
                .push(column)
                .push(") AS minute WHERE minute BETWEEN ")
                .push_bind(search.minute_window.from)
                .push(" AND ")
                .push_bind(search.minute_window.to)
                .push(" ORDER BY minute)");
        } else {
            query.push("e.").push(column);
        }
        query.push(" AS ").push(column).push(", ");
    }
    if search.has_minute_filter() {
        query
            .push("ARRAY[GREATEST(e.minutes_played[1], ")
            .push_bind(search.minute_window.from)
            .push("), GREATEST(GREATEST(e.minutes_played[1], ")
            .push_bind(search.minute_window.from)
            .push("), LEAST(e.minutes_played[2], ")
            .push_bind(search.minute_window.to)
            .push("))] AS minutes_played ");
    } else {
        query.push("e.minutes_played ");
    }
    query.push(
        "FROM games_minute_appearance_filter a
        JOIN games g ON g.game_id = a.game_id
        JOIN competitions c ON c.competition_id = g.competition_id
        JOIN appearances_with_event_times e ON e.game_id = a.game_id AND e.player_id = a.player_id
        LEFT JOIN eligible ON eligible.game_id = a.game_id ORDER BY g.date, a.game_id",
    );
    query
}
