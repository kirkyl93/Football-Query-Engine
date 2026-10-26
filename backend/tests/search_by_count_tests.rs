mod common;
use common::{SearchParamsBuilder, fixture_pool, get_rows, rows};
use football_game::competitions::Competition;
use football_game::services::player::models::PenaltyOption;
use football_game::services::player::models::SortOption;
use football_game::services::player::models::StatScope;
use serde_json::{Value, json};

fn unordered(mut result: Vec<Value>) -> Value {
    // Some tied rows share the same player name; the SQL defines no season tiebreaker.
    result.sort_by_key(Value::to_string);
    json!(result)
}

#[actix_web::test]
async fn original_count_query_paths_have_exact_qualifying_games_and_seasons() {
    let pool = fixture_pool().await;
    let cases = [
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfGamesWith)
                .scope(StatScope::Season)
                .penalty(PenaltyOption::OnlyPenalties)
                .minimum_goals(1)
                .maximum_goals(1),
            "number_of_games",
            json!([[1, 2024, 1, 1], [1, 2025, 1, 1], [4, 2024, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfGamesWith)
                .scope(StatScope::Season)
                .minute_played_from(85)
                .minimum_goals(1),
            "number_of_games",
            json!([
                [1, 2024, 1, 1],
                [1, 2025, 1, 1],
                [4, 2024, 1, 1],
                [5, 2024, 1, 1],
                [2, 2024, 1, 1]
            ]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::LaLiga])
                .sort(SortOption::NumberOfGamesWith)
                .minimum_goals_and_assists(3)
                .maximum_goals_and_assists(4),
            "number_of_games",
            json!([[5, 0, 1, 1], [6, 0, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfGamesWith)
                .minute_played_from(77)
                .minimum_assists(1)
                .maximum_assists(2),
            "number_of_games",
            json!([[1, 0, 1, 1], [2, 0, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfSeasonsWith)
                .minimum_goals(3)
                .minimum_assists(1),
            "number_of_seasons",
            json!([[1, 0, 1, 1], [2, 0, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfSeasonsWith)
                .minute_played_to(15)
                .minimum_goals(1),
            "number_of_seasons",
            json!([[1, 0, 2, 1], [4, 0, 1, 2], [3, 0, 1, 2]]),
        ),
    ];
    for (query, field, expected) in cases {
        let result = rows(
            &pool,
            "/search/occurrences",
            &query,
            &["player_id", "season", field, "rank"],
        )
        .await;
        assert_eq!(
            unordered(result),
            unordered(expected.as_array().unwrap().clone()),
            "{query}"
        );
    }
}

#[actix_web::test]
async fn missing_and_zero_maximums_have_distinct_exact_results_in_both_sources() {
    let pool = fixture_pool().await;
    for (bound, games, seasons) in [
        (
            SearchParamsBuilder::new(),
            json!([
                [1, 5, 1],
                [2, 5, 1],
                [3, 5, 1],
                [4, 3, 4],
                [5, 2, 5],
                [6, 1, 6]
            ]),
            json!([
                [1, 2, 1],
                [4, 2, 1],
                [5, 2, 1],
                [2, 2, 1],
                [3, 2, 1],
                [6, 1, 6]
            ]),
        ),
        (
            SearchParamsBuilder::new().maximum_goals(0),
            json!([[3, 4, 1], [2, 2, 2], [1, 1, 3], [5, 1, 3], [6, 1, 3]]),
            json!([[5, 1, 1], [6, 1, 1], [3, 1, 1]]),
        ),
        (
            SearchParamsBuilder::new().maximum_assists(0),
            json!([
                [3, 5, 1],
                [1, 3, 2],
                [4, 3, 2],
                [5, 2, 4],
                [2, 2, 4],
                [6, 1, 6]
            ]),
            json!([[4, 2, 1], [5, 2, 1], [3, 2, 1], [1, 1, 4], [6, 1, 4]]),
        ),
        (
            SearchParamsBuilder::new().maximum_goals_and_assists(0),
            json!([[3, 4, 1], [5, 1, 2], [6, 1, 2]]),
            json!([[5, 1, 1], [6, 1, 1], [3, 1, 1]]),
        ),
    ] {
        for source in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(90),
        ] {
            for (sort, field, expected) in [
                (SortOption::NumberOfGamesWith, "number_of_games", &games),
                (
                    SortOption::NumberOfSeasonsWith,
                    "number_of_seasons",
                    &seasons,
                ),
            ] {
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .sort(sort)
                    .with_filters(&bound)
                    .with_filters(&source);
                assert_eq!(
                    json!(
                        rows(
                            &pool,
                            "/search/occurrences",
                            &query,
                            &["player_id", field, "rank"]
                        )
                        .await
                    ),
                    *expected,
                    "{query}"
                );
            }
        }
    }
}

#[actix_web::test]
async fn zero_goal_game_counts_group_by_season_without_counting_absent_players() {
    let pool = fixture_pool().await;
    let expected = json!([
        [3, 2024, 2, 1],
        [3, 2025, 2, 1],
        [2, 2024, 1, 3],
        [2, 2025, 1, 3],
        [1, 2024, 1, 3],
        [5, 2025, 1, 3],
        [6, 2024, 1, 3]
    ]);
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let result = rows(
            &pool,
            "/search/occurrences",
            &SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(SortOption::NumberOfGamesWith)
                .scope(StatScope::Season)
                .maximum_goals(0)
                .with_filters(&source),
            &["player_id", "season", "number_of_games", "rank"],
        )
        .await;
        assert_eq!(
            unordered(result),
            unordered(expected.as_array().unwrap().clone())
        );
    }
}

#[actix_web::test]
async fn min_and_max_bounds_are_inclusive_and_reject_outside_values() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (query, expected) in [
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .minimum_goals(2)
                    .maximum_goals(2),
                json!([[1, 3]]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .minimum_goals(1)
                    .maximum_goals(1),
                json!([[1, 1]]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .minimum_goals(3),
                json!([]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::ChampionsLeague])
                    .names(vec!["Jamie"])
                    .minimum_assists(3)
                    .maximum_assists(3),
                json!([[2, 1]]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::ChampionsLeague])
                    .names(vec!["Jamie"])
                    .maximum_assists(2),
                json!([]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::ChampionsLeague])
                    .names(vec!["Jamie"])
                    .minimum_assists(4),
                json!([]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::LaLiga])
                    .minimum_goals_and_assists(3)
                    .maximum_goals_and_assists(3),
                json!([[5, 1], [6, 1]]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::LaLiga])
                    .maximum_goals_and_assists(2),
                json!([]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::LaLiga])
                    .minimum_goals_and_assists(4),
                json!([]),
            ),
            (
                SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .minimum_goals(1)
                    .maximum_goals(0),
                json!([]),
            ),
        ] {
            let result = rows(
                &pool,
                "/search/occurrences",
                &query
                    .clone()
                    .sort(SortOption::NumberOfGamesWith)
                    .with_filters(&source),
                &["player_id", "number_of_games"],
            )
            .await;
            assert_eq!(json!(result), expected, "{query}{source}");
        }
        assert!(
            get_rows(
                &pool,
                "/search/occurrences",
                &SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .sort(SortOption::NumberOfSeasonsWith)
                    .minimum_goals(18)
                    .minimum_assists(5)
                    .with_filters(&source)
            )
            .await
            .is_empty()
        );
    }
}

#[actix_web::test]
async fn transfers_count_as_one_season_and_return_both_historical_clubs() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let result = get_rows(
            &pool,
            "/search/occurrences",
            &SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .names(vec!["Alex"])
                .seasons(vec![2025])
                .sort(SortOption::NumberOfSeasonsWith)
                .minimum_goals(1)
                .with_filters(&source),
        )
        .await;
        assert_eq!(
            result,
            vec![json!({"rank":1,"player_id":1,"player_name":"Alex Striker",
            "country_of_citizenship":"England","country_code":"gb-eng","sub_position":"CF",
            "image_url":"https://example.invalid/player-1.png","clubs_played_for":[101,102],
            "season":0,"number_of_games":0,"number_of_seasons":1})]
        );
    }
}

#[actix_web::test]
async fn legacy_unbounded_sentinel_penalty_modes_and_pagination_are_preserved() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for sort in [
            SortOption::NumberOfGamesWith,
            SortOption::NumberOfSeasonsWith,
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .sort(sort)
                .with_filters(&source);
            let unbounded = get_rows(&pool, "/search/occurrences", &query).await;
            let sentinel = get_rows(
                &pool,
                "/search/occurrences",
                &query
                    .clone()
                    .maximum_goals(-1)
                    .maximum_assists(-1)
                    .maximum_goals_and_assists(-1),
            )
            .await;
            assert_eq!(sentinel, unbounded);
            for page in 0..=3 {
                let result = get_rows(
                    &pool,
                    "/search/occurrences",
                    &query.clone().page(page as i32).limit(2),
                )
                .await;
                let start = (page * 2).min(unbounded.len());
                let end = (start + 2).min(unbounded.len());
                assert_eq!(result, unbounded[start..end]);
            }
        }
        for (penalty, expected) in [
            (PenaltyOption::IncludePenalties, 1),
            (PenaltyOption::ExcludePenalties, 1),
            (PenaltyOption::OnlyPenalties, 3),
        ] {
            let result = rows(
                &pool,
                "/search/occurrences",
                &SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .sort(SortOption::NumberOfGamesWith)
                    .maximum_goals(0)
                    .penalty(penalty)
                    .with_filters(&source),
                &["player_id", "number_of_games"],
            )
            .await;
            assert_eq!(result, vec![json!([1, expected])]);
        }
    }
}
