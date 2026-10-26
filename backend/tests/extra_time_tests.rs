//! Explicit 120-minute games; separate from stoppage-time source conventions.
mod common;
use common::{SearchParamsBuilder, fixture_pool, get_rows, rows};
use football_game::competitions::Competition;
use football_game::services::player::models::PenaltyOption;
use football_game::services::player::models::SortOption;
use football_game::services::player::models::StatScope;
use serde_json::json;

#[actix_web::test]
async fn full_extra_time_appearances_and_ratios_match_in_direct_and_filtered_queries() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(120),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry"])
            .with_filters(&source);
        let games = rows(
            &pool,
            "/search/game",
            &query,
            &["date", "minutes_played", "goals"],
        )
        .await;
        assert_eq!(
            games,
            vec![json!(["2024-11-01", 120, 3]), json!(["2024-11-08", 120, 2])],
            "{query}"
        );
        for scope in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new().scope(StatScope::Season),
        ] {
            let result = rows(
                &pool,
                "/search",
                &query.clone().with_filters(&scope),
                &[
                    "total_appearances",
                    "total_minutes_played",
                    "total_goals",
                    "mins_per_goal",
                    "total_yellow_cards",
                    "total_red_cards",
                ],
            )
            .await;
            assert_eq!(result, vec![json!([2, 240, 5, 48, 3, 1])], "{query}{scope}");
        }
    }
}

#[actix_web::test]
async fn a_player_substituted_off_at_105_keeps_their_105_recorded_minutes() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(120),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Owen"])
            .with_filters(&source);
        let result = rows(
            &pool,
            "/search/game",
            &query,
            &["date", "minutes_played", "goals", "assists"],
        )
        .await;
        assert_eq!(
            result,
            vec![
                json!(["2024-11-08", 105, 1, 1]),
                json!(["2024-11-01", 90, 0, 0])
            ]
        );
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "total_appearances",
                "total_minutes_played",
                "total_goals",
                "total_assists",
            ],
        )
        .await;
        assert_eq!(result, vec![json!([2, 195, 1, 1])]);
    }
}

#[actix_web::test]
async fn regulation_and_extra_time_period_boundaries_are_inclusive_and_distinct() {
    let pool = fixture_pool().await;
    // Terry's G8 goals are at 90, 105 and 120; yellow at 105.
    for (from, to, minutes, goals, yellows) in [
        (1, 90, 90, 1, 0),
        (91, 120, 30, 2, 1),
        (91, 105, 15, 1, 1),
        (106, 120, 15, 1, 0),
        (90, 90, 1, 1, 0),
        (91, 91, 1, 0, 0),
        (105, 105, 1, 1, 1),
        (106, 106, 1, 0, 0),
        (120, 120, 1, 1, 0),
        (0, 119, 119, 2, 1),
        (1, 120, 120, 3, 1),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry"])
            .clubs_played_for(vec!["301"])
            .minute_played_from(from)
            .minute_played_to(to);
        let result = rows(&pool, "/search/game", &query, &["minutes_played", "goals"]).await;
        assert_eq!(result, vec![json!([minutes, goals])], "{query}");
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "total_appearances",
                "total_minutes_played",
                "total_goals",
                "total_yellow_cards",
            ],
        )
        .await;
        assert_eq!(result, vec![json!([1, minutes, goals, yellows])], "{query}");
    }
}

#[actix_web::test]
async fn substitutions_at_90_and_105_keep_same_minute_events_and_recorded_duration_caps() {
    let pool = fixture_pool().await;
    for (name, from, to, expected) in [
        ("Nora", 1, 89, json!([])),
        ("Nora", 90, 90, json!([[1, 0, 0]])),
        ("Nora", 91, 91, json!([[1, 1, 0]])),
        ("Nora", 90, 120, json!([[30, 1, 1]])),
        ("Nora", 91, 120, json!([[30, 1, 1]])),
        ("Nora", 1, 120, json!([[30, 1, 1]])),
        ("Quinn", 104, 104, json!([])),
        ("Quinn", 105, 105, json!([[1, 1, 0]])),
        ("Quinn", 106, 106, json!([[1, 0, 1]])),
        ("Quinn", 120, 120, json!([[1, 1, 0]])),
        ("Quinn", 105, 120, json!([[15, 2, 1]])),
        ("Quinn", 106, 120, json!([[15, 1, 1]])),
        ("Quinn", 1, 120, json!([[15, 2, 1]])),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec![name])
            .minute_played_from(from)
            .minute_played_to(to);
        let result = rows(
            &pool,
            "/search/game",
            &query,
            &["minutes_played", "goals", "assists"],
        )
        .await;
        assert_eq!(json!(result), expected, "{query}");
    }
}

#[actix_web::test]
async fn outgoing_players_do_not_become_zero_contribution_appearances_after_extra_time_subs() {
    let pool = fixture_pool().await;
    for (club, exit) in [(301, 90), (302, 105)] {
        for (endpoint, sort) in [
            ("/search/game", SortOption::Goals),
            ("/search", SortOption::Goals),
            ("/search/occurrences", SortOption::NumberOfGamesWith),
            ("/search/occurrences", SortOption::NumberOfSeasonsWith),
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![Competition::ChampionsLeague])
                .names(vec!["Owen"])
                .clubs_played_for(vec![&club.to_string()])
                .minute_played_from(exit + 1)
                .minute_played_to(120)
                .sort(sort)
                .maximum_goals_and_assists(0);
            assert!(
                get_rows(&pool, endpoint, &query).await.is_empty(),
                "{endpoint}?{query}"
            );
        }
    }
    let result = rows(
        &pool,
        "/search/game",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Owen", "Quinn"])
            .clubs_played_for(vec!["302"])
            .minute_played_from(105)
            .minute_played_to(105),
        &["player_id", "minutes_played", "goals", "assists"],
    )
    .await;
    assert_eq!(result, vec![json!([9, 1, 1, 1]), json!([10, 1, 1, 0])]);
}

#[actix_web::test]
async fn extra_time_goals_count_as_two_games_and_one_season_in_both_game_scopes() {
    let pool = fixture_pool().await;
    for (sort, scope, bound, field, expected) in [
        (
            SortOption::NumberOfGamesWith,
            StatScope::Overall,
            SearchParamsBuilder::new().minimum_goals(2).maximum_goals(2),
            "number_of_games",
            2,
        ),
        (
            SortOption::NumberOfGamesWith,
            StatScope::Season,
            SearchParamsBuilder::new().minimum_goals(2).maximum_goals(2),
            "number_of_games",
            2,
        ),
        (
            SortOption::NumberOfSeasonsWith,
            StatScope::Overall,
            SearchParamsBuilder::new().minimum_goals(4).maximum_goals(4),
            "number_of_seasons",
            1,
        ),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry"])
            .minute_played_from(91)
            .minute_played_to(120)
            .sort(sort)
            .scope(scope)
            .with_filters(&bound);
        let result = rows(&pool, "/search/occurrences", &query, &["player_id", field]).await;
        assert_eq!(result, vec![json!([7, expected])]);
    }
    // Nora remains on the pitch with no contributions after 105. Owen does not.
    let result = rows(
        &pool,
        "/search/occurrences",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry", "Nora", "Owen", "Quinn"])
            .minute_played_from(106)
            .minute_played_to(120)
            .maximum_goals_and_assists(0)
            .sort(SortOption::NumberOfGamesWith),
        &["player_id", "number_of_games"],
    )
    .await;
    assert_eq!(result, vec![json!([8, 1])]);
}

#[actix_web::test]
async fn extra_time_penalty_and_same_minute_ratios_use_15_minutes_not_a_regulation_cap() {
    let pool = fixture_pool().await;
    for (penalty, goals, ratio) in [
        (PenaltyOption::IncludePenalties, 2, 7),
        (PenaltyOption::ExcludePenalties, 1, 15),
        (PenaltyOption::OnlyPenalties, 1, 15),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Quinn"])
            .minute_played_from(105)
            .minute_played_to(120)
            .penalty(penalty);
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "total_minutes_played",
                "total_goals",
                "total_assists",
                "mins_per_goal",
            ],
        )
        .await;
        assert_eq!(result, vec![json!([15, goals, 1, ratio])]);
    }
    for (minute, field, ratio_field) in [
        (105, "total_goals", "mins_per_goal"),
        (106, "total_assists", "mins_per_assist"),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Quinn"])
            .minute_played_from(minute)
            .minute_played_to(minute);
        let result = rows(
            &pool,
            "/search",
            &query,
            &["total_minutes_played", field, ratio_field],
        )
        .await;
        assert_eq!(result, vec![json!([1, 1, 1])]);
    }
}

#[actix_web::test]
async fn second_yellow_at_120_uses_extra_time_history_without_recounting_earlier_cards() {
    let pool = fixture_pool().await;
    for (from, to, minutes, yellows, reds) in [
        (106, 106, 1, 1, 0),
        (106, 120, 15, 2, 1),
        (120, 120, 1, 1, 1),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry"])
            .clubs_played_for(vec!["302"])
            .minute_played_from(from)
            .minute_played_to(to);
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "total_minutes_played",
                "total_yellow_cards",
                "total_red_cards",
            ],
        )
        .await;
        assert_eq!(result, vec![json!([minutes, yellows, reds])]);
    }
}
