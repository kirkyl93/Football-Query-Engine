mod common;
use common::{SearchParamsBuilder, fixture_pool, get_rows, rows};
use football_game::competitions::Competition;
use football_game::services::player::models::HomeAwayOption;
use football_game::services::player::models::PenaltyOption;
use football_game::services::player::models::SortOption;
use serde_json::json;

#[actix_web::test]
async fn first_half_result_maps_all_player_and_match_fields() {
    let pool = fixture_pool().await;
    let result = get_rows(
        &pool,
        "/search/game",
        &SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .seasons(vec![2024])
            .names(vec!["Alex"])
            .home_or_away(HomeAwayOption::Home)
            .clubs_played_against("102")
            .minute_played_from(1)
            .minute_played_to(45)
            .minimum_age(14)
            .maximum_age(40)
            .minimum_height(131)
            .maximum_height(210)
            .page(0)
            .limit(50),
    )
    .await;
    assert_eq!(
        result,
        vec![json!({
            "rank":1,"player_id":1,"player_name":"Alex Striker","country_of_citizenship":"England",
            "country_code":"gb-eng","sub_position":"CF","image_url":"https://example.invalid/player-1.png",
            "club_id":101,"competition_id":"GB1","competition_name":"Premier League","competition_country_code":"gb-eng",
            "date":"2024-08-10","season":2024,"home_club_id":101,"home_club_name":"Northbridge FC","home_club_goals":3,
            "away_club_id":102,"away_club_name":"Riverside FC","away_club_goals":1,"minutes_played":45,"goals":2,"assists":0
        })]
    );
}

#[actix_web::test]
async fn game_sort_and_penalty_matrix_has_exact_nonempty_results_from_both_sources() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (penalty, alex_goals, jamie_goals) in [
            (PenaltyOption::IncludePenalties, 2, 1),
            (PenaltyOption::ExcludePenalties, 1, 1),
            (PenaltyOption::OnlyPenalties, 1, 0),
        ] {
            for sort in [
                SortOption::Goals,
                SortOption::Assists,
                SortOption::GoalsAndAssists,
            ] {
                let jamie_rank =
                    if penalty == PenaltyOption::ExcludePenalties || sort == SortOption::Assists {
                        1
                    } else {
                        2
                    };
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .seasons(vec![2024])
                    .names(vec!["Alex", "Jamie"])
                    .home_or_away(HomeAwayOption::Home)
                    .clubs_played_against("102")
                    .penalty(penalty)
                    .sort(sort)
                    .with_filters(&source);
                let result = rows(
                    &pool,
                    "/search/game",
                    &query,
                    &["player_id", "rank", "minutes_played", "goals", "assists"],
                )
                .await;
                assert_eq!(
                    result,
                    vec![
                        json!([1, 1, 90, alex_goals, 1]),
                        json!([2, jamie_rank, 90, jamie_goals, 1])
                    ],
                    "{query}"
                );
            }
        }
    }
}

#[actix_web::test]
async fn multiple_seasons_competitions_age_and_height_filters_work_together() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        let result = rows(
            &pool,
            "/search/game",
            &SearchParamsBuilder::new()
                .seasons(vec![2024, 2025])
                .competitions(vec![
                    Competition::PremierLeague,
                    Competition::ChampionsLeague,
                    Competition::LaLiga,
                ])
                .maximum_age(18)
                .minimum_height(131)
                .maximum_height(192)
                .penalty(PenaltyOption::ExcludePenalties)
                .sort(SortOption::Assists)
                .with_filters(&source),
            &["player_id", "date", "rank", "goals", "assists"],
        )
        .await;
        assert_eq!(
            result,
            vec![
                json!([1, "2024-08-10", 1, 1, 1]),
                json!([1, "2024-08-17", 1, 0, 1]),
                json!([1, "2024-10-01", 3, 3, 0]),
                json!([1, "2024-09-07", 3, 2, 0]),
                json!([1, "2025-08-10", 3, 1, 0])
            ]
        );
    }
}

#[actix_web::test]
async fn age_is_evaluated_on_the_match_date_with_inclusive_birthday_bounds() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for (bounds, dates) in [
            (
                SearchParamsBuilder::new().maximum_age(17),
                json!([["2024-08-10"]]),
            ),
            (
                SearchParamsBuilder::new().minimum_age(18).maximum_age(18),
                json!([["2024-08-17"], ["2024-09-07"], ["2025-08-10"]]),
            ),
            (
                SearchParamsBuilder::new().minimum_age(19),
                json!([["2025-08-17"]]),
            ),
        ] {
            let mut result = rows(
                &pool,
                "/search/game",
                &SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .names(vec!["Alex"])
                    .with_filters(&bounds)
                    .with_filters(&source),
                &["date"],
            )
            .await;
            result.sort_by_key(|row| row[0].as_str().unwrap().to_owned());
            assert_eq!(json!(result), dates, "{bounds}");
        }
    }
}

#[actix_web::test]
async fn unmatched_game_filters_return_an_empty_successful_response() {
    let pool = fixture_pool().await;
    for source in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(90),
    ] {
        for filter in [
            SearchParamsBuilder::new().names(vec!["Nobody"]),
            SearchParamsBuilder::new().seasons(vec![2026]),
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .minimum_height(181),
            SearchParamsBuilder::new()
                .names(vec!["Alex"])
                .maximum_height(179),
        ] {
            assert!(
                get_rows(
                    &pool,
                    "/search/game",
                    &SearchParamsBuilder::new()
                        .competitions(vec![Competition::PremierLeague])
                        .with_filters(&filter)
                        .with_filters(&source)
                )
                .await
                .is_empty()
            );
        }
    }
}
