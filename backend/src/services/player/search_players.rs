use actix_web::{get, web, HttpResponse};
use actix_web::web::Path;
use sqlx::{PgPool, Postgres, QueryBuilder};
use crate::services::player::models::ToolbarSearchParams;
use crate::services::player::shared_sql_helper::add_limit_and_offset_to_query;
use crate::services::player::sql_models::{Player, PlayerSeasonByCompAndTeam};

#[get("/players")]
pub async fn get_players(pool: web::Data<PgPool>, params: web::Query<ToolbarSearchParams>) -> HttpResponse {
    let search_name = params.search_name().as_deref().unwrap_or("");
    let limit = params.limit().unwrap_or(10).min(100);
    let page = params.page().unwrap_or(0).max(0);

    let mut query = QueryBuilder::new("SELECT * FROM players WHERE 1=1 ");

    add_player_name_to_query(&mut query, search_name);

    query.push(" ORDER BY highest_market_value_in_eur DESC NULLS LAST, name");

    add_limit_and_offset_to_query(&mut query, limit, page);

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