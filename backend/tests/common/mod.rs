//! Shared read-only HTTP harness. Seed the database once before starting tests.
mod search_params_builder;
#[allow(unused_imports)]
pub use search_params_builder::SearchParamsBuilder;

use actix_web::{App, http::StatusCode, test, web};
use football_game::services::{
    club::search_clubs::get_clubs,
    player::{
        search_by_count::search_by_count, search_by_game::search_by_game,
        search_by_season_or_across_seasons::search_by_season_or_across_seasons,
        search_players::get_player_games,
    },
};
use serde_json::Value;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub async fn fixture_pool() -> PgPool {
    let url = dotenv::var("TEST_DATABASE_URL")
        .expect("Set TEST_DATABASE_URL in the environment or .env; see tests/fixtures/README.md");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&url)
        .await
        .unwrap();
    let database: String = sqlx::query_scalar("SELECT current_database()")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert!(
        database.ends_with("_test"),
        "Use a dedicated database ending in _test"
    );
    let version: i32 = sqlx::query_scalar(
        "SELECT version FROM public.test_fixture_metadata WHERE name = 'football-boundaries'",
    )
    .fetch_one(&pool)
    .await
    .expect("Load tests/fixtures/bootstrap.sql before running integration tests");
    assert_eq!(
        version, 2,
        "Bootstrap a fresh database with the current fixture"
    );
    pool
}

pub async fn get_rows(
    pool: &PgPool,
    endpoint: &str,
    query: &(impl std::fmt::Display + ?Sized),
) -> Vec<Value> {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(search_by_game)
            .service(search_by_count)
            .service(search_by_season_or_across_seasons)
            .service(get_player_games)
            .service(get_clubs),
    )
    .await;
    let request = test::TestRequest::get()
        .uri(&format!("{endpoint}?{query}"))
        .to_request();
    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK, "{endpoint}?{query}");
    let mut body: Vec<Value> = test::read_body_json(response).await;
    // STRING_AGG(DISTINCT ...) has no guaranteed internal order. Do not deduplicate:
    // duplicate clubs are still a test failure, not hidden by normalization.
    for row in &mut body {
        if let Some(clubs) = row.get_mut("clubs_played_for") {
            let mut ids: Vec<i32> = clubs
                .as_str()
                .unwrap()
                .split(',')
                .map(|id| id.trim().parse().expect("Malformed club ID"))
                .collect();
            ids.sort_unstable();
            *clubs = serde_json::json!(ids);
        }
    }
    body
}

#[allow(dead_code)] // Some binaries compare complete objects instead of projections.
pub async fn rows(
    pool: &PgPool,
    endpoint: &str,
    query: &(impl std::fmt::Display + ?Sized),
    fields: &[&str],
) -> Vec<Value> {
    get_rows(pool, endpoint, query)
        .await
        .iter()
        .map(|row| {
            Value::Array(
                fields
                    .iter()
                    .map(|field| {
                        row.get(*field)
                            .unwrap_or_else(|| panic!("Missing {field}: {row}"))
                            .clone()
                    })
                    .collect(),
            )
        })
        .collect()
}
