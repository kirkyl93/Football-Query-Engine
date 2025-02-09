use actix_web::{get, web, HttpResponse};
use actix_web::web::Path;
use sqlx::{query, PgPool, Postgres, QueryBuilder};
use crate::services::base_query_builder::BaseQueryMethods;
use crate::services::player::models::ToolbarSearchParams;
use crate::services::player::sql_models::{Player, PlayerAppearances, PlayerSeasonByCompAndTeam};

#[get("/players")]
pub async fn get_players(pool: web::Data<PgPool>, params: web::Query<ToolbarSearchParams>) -> HttpResponse {
    let search_name = params.search_name().as_deref().unwrap_or("");
    let limit = params.limit().unwrap_or(10).min(100);
    let page = params.page().unwrap_or(0).max(0);

    let mut query = QueryBuilder::new("SELECT * FROM players WHERE 1=1 ");

    add_player_name_to_query(&mut query, search_name);

    query.push(" ORDER BY highest_market_value_in_eur DESC NULLS LAST, name")
        .add_limit_and_offset(limit, page);


    match query.build_query_as::<Player>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(players) => HttpResponse::Ok().json(players),
        Err(err) => {
            println!("{:?}", err.as_database_error());
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }
}

#[get("/players/{id}/games")]
pub async fn get_player_games(pool: web::Data<PgPool>, path: Path<i32>) -> HttpResponse {
    let id: i32 = path.into_inner();

    let mut query = QueryBuilder::new("
    SELECT RANK() OVER (ORDER BY g.date) AS game_number, player_club_id as club_id, home_club_id,
    home_club_name, away_club_id, away_club_name, a.competition_id, c.name as competition_name, c.type as competition_type, a.date, g.season,
    yellow_cards, red_cards, goals, penalty_goals, assists, minutes_played, played_from_minute, subbed_off_minute, home_club_goals, away_club_goals,
    goal_minutes, penalty_goal_minutes, own_goal_minutes, assist_minutes, yellow_minutes, red_minutes,
    CASE
        WHEN player_club_id = g.home_club_id AND home_club_goals > away_club_goals THEN 'Win'
        WHEN player_club_id = g.away_club_id AND away_club_goals > home_club_goals THEN 'Win'
        WHEN home_club_goals = away_club_goals THEN 'Draw'
        ELSE 'Loss'
    END AS result
    FROM appearances_with_event_times a
    JOIN
        games g ON a.game_id = g.game_id
    JOIN
        competitions c ON a.competition_id = c.competition_id
    WHERE player_id = ");

    query.push_bind(id).push("
    AND competition_type IN ('domestic_league', 'international_cup')
    ORDER BY g.date");

    match query.build_query_as::<PlayerAppearances>()
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(players) => HttpResponse::Ok().json(players),
        Err(err) => {
            println!("{:?}", err.as_database_error());
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }


}

#[get("/players/{id}")]
pub async fn fetch_player(pool: web::Data<PgPool>, path: Path<i32>) -> HttpResponse {
    let id: i32 = path.into_inner();

    match sqlx::query_as::<_, Player>(
        "SELECT * from players WHERE player_id = $1"
    )
        .bind(id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(player) => {
            if player.is_empty() {
                HttpResponse::NotFound().json("No player found")
            } else {
                HttpResponse::Ok().json(player)
            }
        }
        Err(_) => HttpResponse::NotFound().json("No player found"),
    }
}

#[get("players/{id}/season-stats")]
pub async fn fetch_player_stats_by_season(pool: web::Data<PgPool>, path: Path<i32>) -> HttpResponse {
    let id: i32 = path.into_inner();

    match sqlx::query_as::<_, PlayerSeasonByCompAndTeam>(
        "SELECT * from player_season_by_comp_view WHERE player_id = $1 ORDER BY season"
    )
        .bind(id)
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(seasons) => {
            if seasons.is_empty() {
                HttpResponse::NotFound().json("Can't find data")
            } else {
                HttpResponse::Ok().json(seasons)
            }
        }
        Err(_) => HttpResponse::NotFound().json("Can't find data"),
    }
}

pub fn add_player_name_to_query(query: &mut QueryBuilder<Postgres>, player_name: &str) {
    if !player_name.is_empty() {
        let names: Vec<&str> = player_name.split_whitespace().collect();
        let count = names.len();

        query.push("AND ");
        for (i, name) in names.iter().enumerate() {
            query.push("player_code iLIKE ");
            let like_pattern = format!("%{}%", name);
            query.push_bind(like_pattern).push(" ");
            if i < count - 1 {
                query.push("AND ");
            }
        }
    }
}