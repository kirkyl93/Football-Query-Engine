use actix_cors::Cors;
use actix_web::{
    App, HttpServer,
    web::{self},
};
use dotenv::dotenv;
use football_game::config::parse_allowed_origins;
use football_game::services::club::search_clubs::get_clubs;
use football_game::services::player::search_by_count::search_by_count;
use football_game::services::player::search_by_game::search_by_game;
use football_game::services::player::search_by_season_or_across_seasons::search_by_season_or_across_seasons;
use football_game::services::player::search_players::{
    fetch_player, fetch_player_stats_by_season, get_player_games, get_players,
};
use football_game::services::query_cache::{DEFAULT_TTL_SECS, QueryCache};
use sqlx::postgres::PgPoolOptions;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool");

    // Response cache kill switch: QUERY_CACHE_TTL_SECONDS=0 disables it.
    let cache_ttl = std::env::var("QUERY_CACHE_TTL_SECONDS")
        .ok()
        .and_then(|v| match v.parse::<u64>() {
            Ok(secs) => Some(std::time::Duration::from_secs(secs)),
            Err(_) => {
                log::warn!(
                    "ignoring invalid QUERY_CACHE_TTL_SECONDS={v:?}, using default {DEFAULT_TTL_SECS}s"
                );
                None
            }
        })
        .unwrap_or(std::time::Duration::from_secs(DEFAULT_TTL_SECS));
    if cache_ttl.is_zero() {
        log::warn!("query cache disabled via QUERY_CACHE_TTL_SECONDS=0");
    }
    let query_cache = QueryCache::new(cache_ttl);

    // CORS origins via env, e.g. ALLOWED_ORIGINS="https://myapp.com,https://www.myapp.com"
    // Falls back to local dev default when unset. Fails fast on typos like
    // trailing slashes (which browsers would never match).
    let allowed_origins_raw =
        std::env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let allowed_origins =
        parse_allowed_origins(&allowed_origins_raw).expect("invalid ALLOWED_ORIGINS");

    HttpServer::new(move || {
        let mut cors = Cors::default().max_age(3600);
        for origin in &allowed_origins {
            cors = cors.allowed_origin(origin);
        }
        App::new()
            .wrap(cors)
            .wrap(query_cache.clone())
            .app_data(web::Data::new(pool.clone()))
            .service(get_players)
            .service(fetch_player)
            .service(fetch_player_stats_by_season)
            .service(search_by_season_or_across_seasons)
            .service(search_by_game)
            .service(get_clubs)
            .service(search_by_count)
            .service(get_player_games)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
