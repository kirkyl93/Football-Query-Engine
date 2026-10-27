use std::time::Duration;
use actix_cors::Cors;
use actix_web::{
    App, HttpServer,
    http::{header, Method},
    web::{self},
};
use dotenv::dotenv;
use reqwest::Client;
use football_game::config::parse_allowed_origins;
use football_game::services::club::search_clubs::get_clubs;
use football_game::services::player::search_by_count::search_by_count;
use football_game::services::player::search_details::search_details;
use football_game::services::player::search_by_game::search_by_game;
use football_game::services::player::search_by_season_or_across_seasons::search_by_season_or_across_seasons;
use football_game::services::player::search_players::{
    fetch_player, get_player_games, get_players,
};
use football_game::services::query_cache::{DEFAULT_TTL_SECS, QueryCache};
use football_game::services::natural_language_search::translate_search;
use football_game::services::llm::LlmService;
use sqlx::postgres::PgPoolOptions;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let llm_service = web::Data::new(
        LlmService::from_env().map_err(|message| {
            std::io::Error::new(std::io::ErrorKind::InvalidInput, message)
        })?,
    );
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();
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

    let http_client = Client::builder()
        .timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(10)
        .build()
        .expect("Failed to build HTTP client");

    let shared_http_client = web::Data::new(http_client);

    HttpServer::new(move || {
        let mut cors = Cors::default()
            .allowed_methods([Method::GET, Method::HEAD, Method::POST])
            .allowed_headers([header::CONTENT_TYPE])
            .max_age(3600);

        for origin in &allowed_origins {
            cors = cors.allowed_origin(origin);
        }

        App::new()
            .wrap(query_cache.clone())
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .app_data(shared_http_client.clone())
            .app_data(llm_service.clone())
            .service(get_players)
            .service(fetch_player)
            .service(search_by_season_or_across_seasons)
            .service(search_by_game)
            .service(get_clubs)
            .service(search_by_count)
            .service(get_player_games)
            .service(search_details)
            .service(translate_search)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
