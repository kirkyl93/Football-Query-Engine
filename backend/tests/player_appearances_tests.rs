mod common;
use common::{fixture_pool, get_rows, rows};
use serde_json::{Value, json};

#[actix_web::test]
async fn player_page_returns_the_seed_players_games_in_chronological_order() {
    let pool = fixture_pool().await;
    let games = get_rows(&pool, "/players/1/games", "").await;
    // Alex's six games, calculated from the seed ledger, including his transfer.
    let expected: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/expected/alex_appearances.json")).unwrap();
    assert_eq!(games, expected);
}

#[actix_web::test]
async fn player_page_preserves_distinct_events_at_the_same_minute() {
    let pool = fixture_pool().await;
    let games = rows(
        &pool,
        "/players/13/games",
        "",
        &[
            "game_id",
            "goals",
            "penalty_goals",
            "assists",
            "yellow_cards",
            "red_cards",
            "goal_minutes",
            "penalty_goal_minutes",
            "own_goal_minutes",
            "assist_minutes",
            "yellow_minutes",
            "red_minutes",
            "minutes_played",
        ],
    )
    .await;
    // G11 includes multiple events in every category, without multiplying joins.
    assert_eq!(
        games,
        vec![json!([
            11,
            5,
            2,
            3,
            2,
            2,
            [10, 90, 90],
            [90, 90],
            [90, 90],
            [30, 90, 90],
            [90, 90],
            [90, 90],
            [0, 90]
        ])]
    );
}

#[actix_web::test]
async fn player_page_returns_empty_event_arrays_for_a_late_substitute() {
    let pool = fixture_pool().await;
    let games = rows(
        &pool,
        "/players/15/games",
        "",
        &[
            "game_id",
            "goal_minutes",
            "penalty_goal_minutes",
            "own_goal_minutes",
            "assist_minutes",
            "yellow_minutes",
            "red_minutes",
            "minutes_played",
        ],
    )
    .await;
    assert_eq!(games, vec![json!([11, [], [], [], [], [], [], [89, 90]])]);
}
