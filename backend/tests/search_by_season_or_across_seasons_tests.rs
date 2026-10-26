mod common;
use common::{SearchParamsBuilder, fixture_pool, get_rows, rows};
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::models::HomeAwayOption;
use football_game::services::player::models::PenaltyOption;
use football_game::services::player::models::SortOption;
use football_game::services::player::models::StatScope;
use football_game::services::player::player_enums::PlayerSubPosition;
use serde_json::{Value, json};

#[actix_web::test]
async fn overall_results_match_every_baseline_field_and_all_returned_players() {
    let pool = fixture_pool().await;
    let expected: Value =
        serde_json::from_str(include_str!("fixtures/expected/gb1_overall.json")).unwrap();
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        assert_eq!(
            json!(
                get_rows(
                    &pool,
                    "/search",
                    &SearchParamsBuilder::new()
                        .competitions(vec![Competition::PremierLeague])
                        .with_filters(&source)
                )
                .await
            ),
            expected
        );
    }
}

#[actix_web::test]
async fn every_aggregate_sort_executes_with_correct_ranks_in_both_sources_and_scopes() {
    let pool = fixture_pool().await;
    // Independently calculated from the ledger. Pairs are [player ID, SQL RANK].
    let cases = [
        (
            SortOption::Goals,
            json!([[1, 1], [2, 2], [4, 2], [5, 4], [3, 5], [6, 6]]),
            json!([[1, 1], [2, 2], [4, 2], [5, 4], [3, 5], [6, 6]]),
        ),
        (
            SortOption::Assists,
            json!([[2, 1], [1, 2], [4, 3], [5, 3], [3, 3], [6, 3]]),
            json!([[2, 1], [1, 2], [4, 3], [5, 3], [3, 3], [6, 3]]),
        ),
        (
            SortOption::GoalsAndAssists,
            json!([[1, 1], [2, 2], [4, 3], [5, 4], [3, 5], [6, 6]]),
            json!([[1, 1], [2, 1], [4, 3], [5, 4], [3, 5], [6, 6]]),
        ),
        (
            SortOption::Appearances,
            json!([[1, 1], [2, 1], [3, 1], [4, 4], [5, 5], [6, 6]]),
            json!([[1, 1], [2, 1], [3, 1], [4, 4], [6, 5], [5, 5]]),
        ),
        (
            SortOption::MinutesPlayed,
            json!([[1, 1], [2, 1], [3, 3], [4, 4], [5, 5], [6, 6]]),
            json!([[1, 1], [2, 1], [3, 3], [4, 4], [6, 5], [5, 6]]),
        ),
        (
            SortOption::YellowCards,
            json!([[3, 1], [5, 2], [4, 3], [1, 4], [2, 4], [6, 4]]),
            json!([[3, 1], [4, 2], [1, 3], [5, 3], [2, 3], [6, 3]]),
        ),
        (
            SortOption::RedCards,
            json!([[3, 1], [5, 2], [4, 3], [1, 3], [2, 3], [6, 3]]),
            json!([[3, 1], [4, 2], [1, 2], [5, 2], [2, 2], [6, 2]]),
        ),
        (
            SortOption::MinutesPerGoal,
            json!([[5, 1], [1, 2], [4, 3], [2, 4], [3, 5], [6, 6]]),
            json!([[5, 1], [4, 2], [1, 3], [2, 4], [3, 5], [6, 6]]),
        ),
        (
            SortOption::MinutesPerAssist,
            json!([[2, 1], [1, 2], [4, 3], [5, 3], [6, 3], [3, 3]]),
            json!([[2, 1], [1, 2], [4, 3], [5, 3], [6, 3], [3, 3]]),
        ),
        (
            SortOption::MinutesPerGoalOrAssist,
            json!([[5, 1], [1, 2], [2, 3], [4, 4], [3, 5], [6, 6]]),
            json!([[5, 1], [1, 2], [2, 2], [4, 4], [3, 5], [6, 6]]),
        ),
        (
            SortOption::MinutesPerYellow,
            json!([[5, 1], [3, 2], [4, 3], [1, 4], [2, 4], [6, 4]]),
            json!([[3, 1], [4, 2], [1, 3], [5, 3], [2, 3], [6, 3]]),
        ),
        (
            SortOption::MinutesPerRed,
            json!([[5, 1], [3, 2], [1, 3], [4, 3], [2, 3], [6, 3]]),
            json!([[3, 1], [1, 2], [4, 2], [5, 2], [2, 2], [6, 2]]),
        ),
    ];
    for (sort, overall, season) in cases {
        for (scope, expected) in [
            (SearchParamsBuilder::new(), overall),
            (
                SearchParamsBuilder::new()
                    .scope(StatScope::Season)
                    .seasons(vec![2024]),
                season,
            ),
        ] {
            for source in [
                SearchParamsBuilder::new(),
                SearchParamsBuilder::new()
                    .minute_played_from(1)
                    .minute_played_to(90),
            ] {
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .sort(sort)
                    .with_filters(&scope)
                    .with_filters(&source);
                assert_eq!(
                    json!(rows(&pool, "/search", &query, &["player_id", "rank"]).await),
                    expected,
                    "{query}"
                );
            }
        }
    }
}

#[actix_web::test]
async fn penalty_modes_change_goals_and_ratios_in_both_sources_and_scopes() {
    let pool = fixture_pool().await;
    for (penalty, overall_goals, overall_ratio, season_goals, season_ratio) in [
        (PenaltyOption::IncludePenalties, 7, 64, 4, 67),
        (PenaltyOption::ExcludePenalties, 5, 90, 3, 90),
        (PenaltyOption::OnlyPenalties, 2, 225, 1, 270),
    ] {
        for source in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(90),
        ] {
            for (scope, expected) in [
                (
                    SearchParamsBuilder::new(),
                    json!([[1, 5, 450, overall_goals, 2, overall_ratio]]),
                ),
                (
                    SearchParamsBuilder::new()
                        .scope(StatScope::Season)
                        .seasons(vec![2024]),
                    json!([[1, 3, 270, season_goals, 2, season_ratio]]),
                ),
            ] {
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .penalty(penalty)
                    .with_filters(&scope)
                    .with_filters(&source);
                assert_eq!(
                    json!(
                        rows(
                            &pool,
                            "/search",
                            &query,
                            &[
                                "player_id",
                                "total_appearances",
                                "total_minutes_played",
                                "total_goals",
                                "total_assists",
                                "mins_per_goal"
                            ]
                        )
                        .await
                    ),
                    expected,
                    "{query}"
                );
            }
        }
    }
}

#[actix_web::test]
async fn filters_have_independent_matching_and_excluded_examples() {
    let pool = fixture_pool().await;
    let cases = [
        (
            SearchParamsBuilder::new()
                .countries(vec![Country::Togo, Country::Australia])
                .sort(SortOption::MinutesPerGoal),
            json!([[5, 2, 2, 0], [4, 3, 4, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .countries(vec![Country::Togo, Country::Australia])
                .sort(SortOption::MinutesPerGoal)
                .minimum_appearances(3),
            json!([[4, 3, 4, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .countries(vec![Country::Togo, Country::Australia])
                .sort(SortOption::MinutesPerGoal)
                .minimum_appearances(4),
            json!([]),
        ),
        (
            SearchParamsBuilder::new().positions(vec![PlayerSubPosition::CentreBack]),
            json!([[3, 5, 1, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex", "Sam"])
                .minimum_height(180)
                .maximum_height(180),
            json!([[1, 5, 7, 2]]),
        ),
        (
            SearchParamsBuilder::new()
                .countries(vec![Country::England])
                .minimum_height(181)
                .maximum_height(189),
            json!([]),
        ),
        (
            SearchParamsBuilder::new().names(vec!["David"]),
            json!([[4, 3, 4, 0], [5, 2, 2, 0]]),
        ),
        (
            SearchParamsBuilder::new().names(vec!["DAVID FINCH"]),
            json!([[4, 3, 4, 0]]),
        ),
        (
            SearchParamsBuilder::new().names(vec!["Alex", "David"]),
            json!([[1, 5, 7, 2], [4, 3, 4, 0], [5, 2, 2, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .home_or_away(HomeAwayOption::Home),
            json!([[1, 2, 4, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .home_or_away(HomeAwayOption::Away),
            json!([[1, 3, 3, 1]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .clubs_played_for(vec!["101"]),
            json!([[1, 4, 5, 2]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .clubs_played_for(vec!["102"]),
            json!([[1, 1, 2, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .clubs_played_against("102"),
            json!([[1, 2, 2, 2]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .seasons(vec![2025]),
            json!([[1, 2, 3, 0]]),
        ),
        (
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .seasons(vec![2024, 2025]),
            json!([[1, 5, 7, 2]]),
        ),
        (
            SearchParamsBuilder::new().minimum_appearances(50),
            json!([]),
        ),
        (SearchParamsBuilder::new().names(vec!["Nobody"]), json!([])),
        (SearchParamsBuilder::new().seasons(vec![2026]), json!([])),
    ];
    for (filters, expected) in cases {
        for source in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(90),
        ] {
            let query = SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .with_filters(&filters)
                .with_filters(&source);
            assert_eq!(
                json!(
                    rows(
                        &pool,
                        "/search",
                        &query,
                        &[
                            "player_id",
                            "total_appearances",
                            "total_goals",
                            "total_assists"
                        ]
                    )
                    .await
                ),
                expected,
                "{query}"
            );
        }
    }
}

#[actix_web::test]
async fn season_and_assist_sort_do_not_leak_other_seasons() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let result = rows(
            &pool,
            "/search",
            &SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .seasons(vec![2024])
                .sort(SortOption::Assists)
                .with_filters(&source),
            &["player_id", "total_goals", "total_assists"],
        )
        .await;
        assert_eq!(
            result,
            vec![
                json!([2, 3, 3]),
                json!([1, 4, 2]),
                json!([4, 3, 0]),
                json!([5, 2, 0]),
                json!([3, 1, 0]),
                json!([6, 0, 0])
            ]
        );
        let result = rows(
            &pool,
            "/search",
            &SearchParamsBuilder::new()
                .competitions(vec![Competition::PremierLeague])
                .seasons(vec![2025])
                .sort(SortOption::GoalsAndAssists)
                .with_filters(&source),
            &["player_id", "total_goals", "total_assists"],
        )
        .await;
        assert_eq!(
            result,
            vec![
                json!([1, 3, 0]),
                json!([2, 1, 1]),
                json!([4, 1, 0]),
                json!([5, 0, 0]),
                json!([3, 0, 0])
            ]
        );
    }
}

#[actix_web::test]
async fn combined_filters_apply_before_season_aggregation() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Alex"])
            .home_or_away(HomeAwayOption::Home)
            .penalty(PenaltyOption::ExcludePenalties)
            .scope(StatScope::Season)
            .minimum_appearances(2)
            .sort(SortOption::MinutesPerGoalOrAssist)
            .with_filters(&source);
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "player_id",
                "season",
                "total_appearances",
                "total_minutes_played",
                "total_goals",
                "total_assists",
                "mins_per_goal_or_assist",
            ],
        )
        .await;
        assert_eq!(result, vec![json!([1, 2024, 2, 180, 3, 1, 45])]);
    }
}

#[actix_web::test]
async fn partial_minute_position_and_substitute_filters_produce_exact_aggregates() {
    let pool = fixture_pool().await;
    let result = rows(
        &pool,
        "/search",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .positions(vec![PlayerSubPosition::CentreBack])
            .minute_played_from(3)
            .minute_played_to(90),
        &[
            "player_id",
            "total_appearances",
            "total_goals",
            "total_minutes_played",
            "total_yellow_cards",
            "total_red_cards",
        ],
    )
    .await;
    assert_eq!(result, vec![json!([3, 5, 0, 400, 3, 2])]);
    for (limits, apps, goals, minutes) in [
        (
            SearchParamsBuilder::new().earliest_sub_on_time(45),
            2,
            2,
            58,
        ),
        (
            SearchParamsBuilder::new().earliest_sub_on_time(60),
            1,
            2,
            29,
        ),
        (
            SearchParamsBuilder::new()
                .earliest_sub_on_time(45)
                .latest_sub_on_time(45),
            1,
            0,
            29,
        ),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![
                Competition::PremierLeague,
                Competition::ChampionsLeague,
            ])
            .clubs_played_for(vec!["103"])
            .subs_only(true)
            .with_filters(&limits)
            .penalty(PenaltyOption::ExcludePenalties)
            .scope(StatScope::Season)
            .minute_played_from(60)
            .minute_played_to(88);
        let result = rows(
            &pool,
            "/search",
            &query,
            &[
                "player_id",
                "season",
                "total_appearances",
                "substitute_appearances",
                "total_goals",
                "total_assists",
                "total_minutes_played",
            ],
        )
        .await;
        assert_eq!(
            result,
            vec![json!([5, 2024, apps, apps, goals, 0, minutes])],
            "{query}"
        );
    }
}

#[actix_web::test]
async fn pagination_preserves_global_rank_and_returns_an_empty_page_after_the_end() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (page, expected) in [
            (0, json!([[1, 1], [2, 2]])),
            (1, json!([[4, 2], [5, 4]])),
            (2, json!([[3, 5], [6, 6]])),
            (3, json!([])),
        ] {
            let result = rows(
                &pool,
                "/search",
                &SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .limit(2)
                    .page(page as i32)
                    .with_filters(&source),
                &["player_id", "rank"],
            )
            .await;
            assert_eq!(json!(result), expected);
        }
    }
}
