mod common;
use common::{SearchParamsBuilder, fixture_pool, get_rows, rows};
use football_game::competitions::Competition;
use football_game::services::player::models::{HomeAwayOption, SortOption, StatScope};
use football_game::services::player::player_enums::PlayerSubPosition;
use serde_json::json;

#[actix_web::test]
async fn season_counts_apply_combined_minimum_and_positive_maximum_bounds() {
    let pool = fixture_pool().await;
    // GB1 season contributions: Alex 6/3, Jamie 6/2, Finch 3/1,
    // Vale 2/0, Sam 1/0, Pat 0 (2024 only).
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (bounds, expected) in [
            (
                SearchParamsBuilder::new()
                    .minimum_goals_and_assists(3)
                    .maximum_goals_and_assists(3),
                json!([[1, 1], [4, 1]]),
            ),
            (
                SearchParamsBuilder::new()
                    .minimum_goals_and_assists(6)
                    .maximum_goals_and_assists(6),
                json!([[1, 1], [2, 1]]),
            ),
            (
                SearchParamsBuilder::new().minimum_goals_and_assists(7),
                json!([]),
            ),
            (
                SearchParamsBuilder::new().maximum_goals_and_assists(2),
                json!([[5, 2], [3, 2], [4, 1], [2, 1], [6, 1]]),
            ),
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfSeasonsWith)
                .with_filters(&bounds)
                .with_filters(&source);
            let result = rows(
                &pool,
                "/search/occurrences",
                &query,
                &["player_id", "number_of_seasons"],
            )
            .await;
            assert_eq!(json!(result), expected, "{query}");
        }
    }
}

#[actix_web::test]
async fn multiple_positions_and_clubs_select_the_union_within_each_filter() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (filters, aggregates, counts) in [
            (
                SearchParamsBuilder::new().positions(vec![
                    PlayerSubPosition::CentralMidfield,
                    PlayerSubPosition::CentreBack,
                ]),
                json!([[2, 5, 4, 4], [3, 5, 1, 0]]),
                json!([[2, 5], [3, 5]]),
            ),
            (
                SearchParamsBuilder::new()
                    .names(vec!["Alex", "David Finch"])
                    .clubs_played_for(vec!["101", "102"]),
                json!([[1, 5, 7, 2], [4, 2, 3, 0]]),
                json!([[1, 5], [4, 2]]),
            ),
            (
                SearchParamsBuilder::new()
                    .names(vec!["Alex"])
                    .clubs_played_against("101,102"),
                json!([[1, 3, 4, 2]]),
                json!([[1, 3]]),
            ),
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .with_filters(&filters)
                .with_filters(&source);
            let result = rows(
                &pool,
                "/search",
                &query,
                &[
                    "player_id",
                    "total_appearances",
                    "total_goals",
                    "total_assists",
                ],
            )
            .await;
            assert_eq!(json!(result), aggregates, "{query}");
            let result = rows(
                &pool,
                "/search/occurrences",
                &query.clone().sort(SortOption::NumberOfGamesWith),
                &["player_id", "number_of_games"],
            )
            .await;
            assert_eq!(json!(result), counts, "{query}");
        }
    }
}

#[actix_web::test]
async fn substitute_entry_bounds_work_across_aggregate_game_and_count_queries() {
    let pool = fixture_pool().await;
    // Vale enters at 60 in G3 and 45 in G6; his G4 appearance is a start.
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (limits, expected_games, appearances, goals, assists) in [
            (
                SearchParamsBuilder::new(),
                json!([["2024-09-07", 30, 2, 0], ["2024-10-01", 45, 1, 1]]),
                2,
                3,
                1,
            ),
            (
                SearchParamsBuilder::new().earliest_sub_on_time(60),
                json!([["2024-09-07", 30, 2, 0]]),
                1,
                2,
                0,
            ),
            (
                SearchParamsBuilder::new().latest_sub_on_time(45),
                json!([["2024-10-01", 45, 1, 1]]),
                1,
                1,
                1,
            ),
            (
                SearchParamsBuilder::new()
                    .earliest_sub_on_time(46)
                    .latest_sub_on_time(59),
                json!([]),
                0,
                0,
                0,
            ),
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![
                    Competition::PremierLeague,
                    Competition::ChampionsLeague,
                ])
                .clubs_played_for(vec!["103"])
                .names(vec!["David Vale"])
                .subs_only(true)
                .with_filters(&limits)
                .with_filters(&source);
            let games = rows(
                &pool,
                "/search/game",
                &query,
                &["date", "minutes_played", "goals", "assists"],
            )
            .await;
            assert_eq!(json!(games), expected_games, "{query}");
            let aggregate = rows(
                &pool,
                "/search",
                &query,
                &[
                    "player_id",
                    "total_appearances",
                    "total_goals",
                    "total_assists",
                ],
            )
            .await;
            let expected = if appearances == 0 {
                vec![]
            } else {
                vec![json!([5, appearances, goals, assists])]
            };
            assert_eq!(aggregate, expected, "{query}");
            for (sort, scope, field, count) in [
                (
                    SortOption::NumberOfGamesWith,
                    StatScope::Overall,
                    "number_of_games",
                    appearances,
                ),
                (
                    SortOption::NumberOfGamesWith,
                    StatScope::Season,
                    "number_of_games",
                    appearances,
                ),
                (
                    SortOption::NumberOfSeasonsWith,
                    StatScope::Overall,
                    "number_of_seasons",
                    1,
                ),
            ] {
                let result = rows(
                    &pool,
                    "/search/occurrences",
                    &query.clone().sort(sort).scope(scope),
                    &["player_id", field],
                )
                .await;
                let expected = if appearances == 0 {
                    vec![]
                } else {
                    vec![json!([5, count])]
                };
                assert_eq!(result, expected, "{query}, {sort:?}, {scope:?}");
            }
        }
    }
}

#[actix_web::test]
async fn player_names_combine_word_tokens_and_alternatives_and_escape_wildcards() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .with_filters(&source);
        let result = rows(
            &pool,
            "/search",
            &query.clone().names(vec!["David Finch", "Pat Forward"]),
            &["player_id", "total_goals"],
        )
        .await;
        assert_eq!(result, vec![json!([4, 4]), json!([6, 0])]);
        for literal in ["%", "_", "\\"] {
            assert!(
                get_rows(&pool, "/search", &query.clone().names(vec![literal]))
                    .await
                    .is_empty(),
                "{literal}"
            );
        }
    }
}

#[actix_web::test]
async fn game_pagination_preserves_rank_and_stops_after_the_last_game() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .seasons(vec![2024])
            .names(vec!["Alex", "Jamie"])
            .home_or_away(HomeAwayOption::Home)
            .clubs_played_against("102")
            .limit(1)
            .with_filters(&source);
        for (page, expected) in [
            (0, json!([[1, 1, "2024-08-10", 2, 1]])),
            (1, json!([[2, 2, "2024-08-10", 1, 1]])),
            (2, json!([])),
        ] {
            let result = rows(
                &pool,
                "/search/game",
                &query.clone().page(page),
                &["player_id", "rank", "date", "goals", "assists"],
            )
            .await;
            assert_eq!(json!(result), expected, "page {page}, {source}");
        }
    }
}
