//! Read-only boundary tests against the shared, once-seeded football fixture.
mod common;
use common::{SearchParamsBuilder, fixture_pool, rows};
use football_game::competitions::Competition;
use football_game::services::player::models::HomeAwayOption;
use football_game::services::player::models::SortOption;
use football_game::services::player::models::StatScope;
use serde_json::json;

#[actix_web::test]
async fn half_time_substitute_plays_46_through_90_without_a_phantom_minute_91() {
    let pool = fixture_pool().await;
    let player = SearchParamsBuilder::new().names(vec!["Harper Half"]);
    for (from, to, minutes, goals) in [
        (1, 45, 0, 0),
        (46, 46, 1, 1),
        (46, 90, 45, 1),
        (90, 90, 1, 0),
        (1, 120, 45, 1),
        (91, 91, 0, 0),
        (91, 120, 0, 0),
    ] {
        let query = player.clone().minute_played_from(from).minute_played_to(to);
        for (endpoint, fields) in [
            ("/search/game", ["minutes_played", "goals"]),
            ("/search", ["total_minutes_played", "total_goals"]),
        ] {
            let result = rows(&pool, endpoint, &query, &fields).await;
            let expected = if minutes == 0 {
                vec![]
            } else {
                vec![json!([minutes, goals])]
            };
            assert_eq!(result, expected, "{endpoint}: {from}–{to}");
        }
    }
    for (sort, scope) in [
        (SortOption::NumberOfGamesWith, StatScope::Overall),
        (SortOption::NumberOfGamesWith, StatScope::Season),
        (SortOption::NumberOfSeasonsWith, StatScope::Overall),
    ] {
        let result = rows(
            &pool,
            "/search/occurrences",
            &player
                .clone()
                .minute_played_from(91)
                .minute_played_to(120)
                .maximum_goals_and_assists(0)
                .sort(sort)
                .scope(scope),
            &["player_id"],
        )
        .await;
        assert!(result.is_empty(), "{sort:?}, {scope:?}");
    }
}

#[actix_web::test]
async fn event_windows_include_45_and_start_the_second_half_at_46() {
    let pool = fixture_pool().await;
    let game = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .names(vec!["Alex"])
        .seasons(vec![2024])
        .home_or_away(HomeAwayOption::Home)
        .clubs_played_against("102");
    for (from, to, expected) in [
        (1, 45, json!([[1, 45, 2, 0]])),
        (45, 45, json!([[1, 1, 1, 0]])),
        (46, 46, json!([[1, 1, 0, 1]])),
        (46, 90, json!([[1, 45, 0, 1]])),
    ] {
        let result = rows(
            &pool,
            "/search/game",
            &game.clone().minute_played_from(from).minute_played_to(to),
            &["player_id", "minutes_played", "goals", "assists"],
        )
        .await;
        assert_eq!(json!(result), expected, "window {from}–{to}");
    }
}

#[actix_web::test]
async fn substitution_minute_counts_for_both_players_and_preserves_a_same_minute_goal() {
    let pool = fixture_pool().await;
    let game = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .seasons(vec![2024])
        .names(vec!["Pat", "David Vale"]);
    for (from, to, expected) in [
        (1, 60, json!([[5, 1, 1], [6, 60, 0]])),
        (60, 60, json!([[5, 1, 1], [6, 1, 0]])),
        (61, 61, json!([[5, 1, 0]])),
        (61, 90, json!([[5, 30, 1]])),
        (60, 90, json!([[5, 30, 2], [6, 1, 0]])),
        (90, 90, json!([[5, 1, 0]])),
        (91, 120, json!([])),
    ] {
        let result = rows(
            &pool,
            "/search/game",
            &game.clone().minute_played_from(from).minute_played_to(to),
            &["player_id", "minutes_played", "goals"],
        )
        .await;
        assert_eq!(json!(result), expected, "window {from}–{to}");
    }
}

#[actix_web::test]
async fn incoming_player_can_assist_during_the_substitution_minute() {
    let pool = fixture_pool().await;
    let result = rows(
        &pool,
        "/search/game",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Pat", "David Vale"])
            .minute_played_from(45)
            .minute_played_to(45),
        &["player_id", "minutes_played", "goals", "assists"],
    )
    .await;
    assert_eq!(result, vec![json!([6, 1, 1, 0]), json!([5, 1, 0, 1])]);
    let result = rows(
        &pool,
        "/search",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["David Vale"])
            .minute_played_from(45)
            .minute_played_to(45)
            .sort(SortOption::MinutesPerAssist),
        &[
            "total_appearances",
            "total_minutes_played",
            "total_assists",
            "mins_per_assist",
        ],
    )
    .await;
    assert_eq!(result, vec![json!([1, 1, 1, 1])]);
}

#[actix_web::test]
async fn credited_time_never_exceeds_the_selected_window() {
    let pool = fixture_pool().await;
    for (from, to, ceiling) in [
        (0, 90, 90),
        (1, 90, 90),
        (1, 120, 120),
        (0, 45, 45),
        (1, 45, 45),
        (46, 90, 45),
        (60, 60, 1),
    ] {
        let result = rows(
            &pool,
            "/search/game",
            &SearchParamsBuilder::new()
                .minute_played_from(from)
                .minute_played_to(to),
            &["player_id", "minutes_played"],
        )
        .await;
        assert!(!result.is_empty());
        for row in result {
            let minutes = row[1].as_i64().unwrap();
            assert!((1..=ceiling).contains(&minutes), "{from}–{to}: {row}");
        }
    }
    // Alex plays five full GB1 matches: each half must contribute 45, not 46.
    for (from, to, expected) in [
        (0, 90, 450),
        (1, 120, 450),
        (0, 45, 225),
        (1, 45, 225),
        (46, 90, 225),
    ] {
        let result = rows(
            &pool,
            "/search",
            &SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .names(vec!["Alex"])
                .minute_played_from(from)
                .minute_played_to(to),
            &["total_appearances", "total_minutes_played"],
        )
        .await;
        assert_eq!(result, vec![json!([5, expected])]);
    }
}

#[actix_web::test]
async fn same_minute_goals_and_assists_are_included_in_occurrence_counts() {
    let pool = fixture_pool().await;
    for (query, bound) in [
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .seasons(vec![2024])
                .names(vec!["David Vale"])
                .minute_played_from(60)
                .minute_played_to(60),
            SearchParamsBuilder::new().minimum_goals(1).maximum_goals(1),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::ChampionsLeague])
                .names(vec!["David Vale"])
                .minute_played_from(45)
                .minute_played_to(45),
            SearchParamsBuilder::new()
                .minimum_assists(1)
                .maximum_assists(1),
        ),
    ] {
        for (sort, field) in [
            (SortOption::NumberOfGamesWith, "number_of_games"),
            (SortOption::NumberOfSeasonsWith, "number_of_seasons"),
        ] {
            let result = rows(
                &pool,
                "/search/occurrences",
                &query.clone().with_filters(&bound).sort(sort),
                &["player_id", field],
            )
            .await;
            assert_eq!(result, vec![json!([5, 1])]);
            let result = rows(
                &pool,
                "/search/occurrences",
                &query.clone().maximum_goals_and_assists(0).sort(sort),
                &["player_id"],
            )
            .await;
            assert!(result.is_empty());
        }
    }
}

#[actix_web::test]
async fn whole_match_event_queries_preserve_stored_durations() {
    let pool = fixture_pool().await;
    for name in ["Alex", "Sam", "David Vale", "Pat"] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec![name]);
        let fields = [
            "player_id",
            "total_appearances",
            "total_minutes_played",
            "total_goals",
            "total_assists",
            "total_yellow_cards",
            "total_red_cards",
        ];
        let direct = rows(&pool, "/search", &query, &fields).await;
        for window in [
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(90),
            SearchParamsBuilder::new()
                .minute_played_from(0)
                .minute_played_to(90),
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(120),
        ] {
            let filtered = rows(
                &pool,
                "/search",
                &query.clone().with_filters(&window),
                &fields,
            )
            .await;
            assert_eq!(filtered, direct, "{name}, {window}");
        }
    }
}

#[actix_web::test]
async fn same_minute_goal_has_one_credited_minute_and_a_nonzero_ratio() {
    let pool = fixture_pool().await;
    let result = rows(
        &pool,
        "/search",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .seasons(vec![2024])
            .names(vec!["David Vale"])
            .minute_played_from(60)
            .minute_played_to(60)
            .sort(SortOption::MinutesPerGoal),
        &[
            "player_id",
            "total_appearances",
            "total_minutes_played",
            "total_goals",
            "mins_per_goal",
        ],
    )
    .await;
    assert_eq!(result, vec![json!([5, 1, 1, 1, 1])]);
}

#[actix_web::test]
async fn no_contributions_does_not_mean_no_appearance_in_game_search() {
    let pool = fixture_pool().await;
    let mut result = rows(
        &pool,
        "/search/game",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Sam"])
            .minute_played_from(85)
            .minute_played_to(90),
        &["date", "minutes_played", "goals", "assists"],
    )
    .await;
    // Exact-date ordering is not specified for otherwise tied game results.
    result.sort_by_key(|row| row[0].as_str().unwrap().to_owned());
    assert_eq!(
        result,
        vec![
            json!(["2024-09-07", 6, 0, 0]),
            json!(["2025-08-10", 6, 0, 0]),
            json!(["2025-08-17", 6, 0, 0])
        ]
    );
    let result = rows(
        &pool,
        "/search",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Sam"])
            .minute_played_from(85)
            .minute_played_to(90),
        &[
            "total_appearances",
            "total_minutes_played",
            "total_goals",
            "total_assists",
        ],
    )
    .await;
    assert_eq!(result, vec![json!([3, 18, 0, 0])]);
}

#[actix_web::test]
async fn zero_bounds_only_count_games_and_seasons_with_a_real_window_appearance() {
    let pool = fixture_pool().await;
    for bound in [
        SearchParamsBuilder::new().maximum_goals(0),
        SearchParamsBuilder::new().maximum_assists(0),
        SearchParamsBuilder::new().maximum_goals_and_assists(0),
    ] {
        let base = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Sam"])
            .minute_played_from(85)
            .minute_played_to(90)
            .with_filters(&bound);
        let result = rows(
            &pool,
            "/search/occurrences",
            &base.clone().sort(SortOption::NumberOfGamesWith),
            &["player_id", "number_of_games"],
        )
        .await;
        assert_eq!(result, vec![json!([3, 3])], "{bound}");
        let mut result = rows(
            &pool,
            "/search/occurrences",
            &base
                .clone()
                .sort(SortOption::NumberOfGamesWith)
                .scope(StatScope::Season),
            &["season", "number_of_games"],
        )
        .await;
        result.sort_by_key(|row| row[0].as_i64().unwrap());
        assert_eq!(result, vec![json!([2024, 1]), json!([2025, 2])], "{bound}");
        let result = rows(
            &pool,
            "/search/occurrences",
            &base.clone().sort(SortOption::NumberOfSeasonsWith),
            &["player_id", "number_of_seasons"],
        )
        .await;
        assert_eq!(result, vec![json!([3, 2])], "{bound}");
    }
}

#[actix_web::test]
async fn second_yellow_uses_history_but_counts_cards_only_inside_the_window() {
    let pool = fixture_pool().await;
    let game = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .names(vec!["Sam"])
        .seasons(vec![2024])
        .home_or_away(HomeAwayOption::Home)
        .clubs_played_against("102");
    for (from, to, expected) in [
        (20, 79, json!([[1, 0, 60]])),
        (21, 79, json!([[0, 0, 59]])),
        (46, 80, json!([[1, 1, 35]])),
        (80, 80, json!([[1, 1, 1]])),
        (81, 90, json!([])),
    ] {
        let result = rows(
            &pool,
            "/search",
            &game.clone().minute_played_from(from).minute_played_to(to),
            &[
                "total_yellow_cards",
                "total_red_cards",
                "total_minutes_played",
            ],
        )
        .await;
        assert_eq!(json!(result), expected, "window {from}–{to}");
    }
}

#[actix_web::test]
async fn dismissals_count_at_the_exit_minute_but_not_after_it() {
    let pool = fixture_pool().await;
    for (game, exit, expected) in [
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .names(vec!["Sam"])
                .seasons(vec![2024])
                .home_or_away(HomeAwayOption::Away)
                .clubs_played_against("102"),
            60,
            json!([[0, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .names(vec!["David Vale"])
                .seasons(vec![2025]),
            46,
            json!([[1, 1, 1]]),
        ),
    ] {
        let result = rows(
            &pool,
            "/search",
            &game.clone().minute_played_from(exit).minute_played_to(exit),
            &[
                "total_yellow_cards",
                "total_red_cards",
                "total_minutes_played",
            ],
        )
        .await;
        assert_eq!(json!(result), expected);
        for (endpoint, sort) in [
            ("/search", SortOption::Goals),
            ("/search/game", SortOption::Goals),
            ("/search/occurrences", SortOption::NumberOfGamesWith),
            ("/search/occurrences", SortOption::NumberOfSeasonsWith),
        ] {
            let result = rows(
                &pool,
                endpoint,
                &game
                    .clone()
                    .minute_played_from(exit + 1)
                    .minute_played_to(90)
                    .sort(sort)
                    .maximum_goals_and_assists(0),
                &["player_id"],
            )
            .await;
            assert!(result.is_empty(), "{endpoint}, {game}: {result:?}");
        }
    }
}

#[actix_web::test]
async fn the_seed_has_consistent_appearance_totals_and_real_materialized_views() {
    let pool = fixture_pool().await;
    let counts: (i64,i64,i64,i64) = sqlx::query_as(
        "SELECT (SELECT COUNT(*) FROM appearances), (SELECT COUNT(*) FROM game_events),
         (SELECT COUNT(*) FROM appearances_enhanced), (SELECT COUNT(*) FROM appearances_with_event_times)",
    ).fetch_one(&pool).await.unwrap();
    assert_eq!(counts, (39, 67, 39, 39));
    let mismatch: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM appearances a WHERE
         a.goals <> (SELECT COUNT(*) FROM game_events e WHERE e.game_id=a.game_id AND e.player_id=a.player_id AND e.type='Goals' AND e.description NOT ILIKE '%own-goal%')
         OR a.assists <> (SELECT COUNT(*) FROM game_events e WHERE e.game_id=a.game_id AND e.player_assist_id=a.player_id AND e.type='Goals')
         OR a.yellow_cards <> (SELECT COUNT(*) FROM game_events e WHERE e.game_id=a.game_id AND e.player_id=a.player_id AND e.type='Cards' AND e.is_yellow)
         OR a.red_cards <> (SELECT COUNT(*) FROM game_events e WHERE e.game_id=a.game_id AND e.player_id=a.player_id AND e.type='Cards' AND e.is_red)",
    ).fetch_one(&pool).await.unwrap();
    assert_eq!(mismatch, 0);
    let derived: (i32, i32, i32) = sqlx::query_as(
        "SELECT played_from_minute, minutes_played, penalty_goals FROM appearances_enhanced WHERE game_id=6 AND player_id=5",
    ).fetch_one(&pool).await.unwrap();
    assert_eq!(derived, (45, 45, 1));
}
