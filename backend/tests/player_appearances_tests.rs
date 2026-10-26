mod common;
use common::{fixture_pool, get_rows};
use serde_json::Value;

#[actix_web::test]
async fn player_page_returns_the_seed_players_games_in_chronological_order() {
    let pool = fixture_pool().await;
    let games = get_rows(&pool, "/players/1/games", "").await;
    // Alex's six games, calculated from the seed ledger, including his transfer.
    let expected: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/expected/alex_appearances.json")).unwrap();
    assert_eq!(games, expected);
}
