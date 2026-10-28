mod common;
use actix_web::{App, http::StatusCode, test, web};
use common::{SearchParamsBuilder, fixture_pool, get_rows};
use football_game::competitions::Competition;
use football_game::services::player::{
    models::{HomeAwayOption, PenaltyOption, SortOption, StatScope},
    search_details::search_details,
};
use serde_json::{Value, json};
use sqlx::PgPool;

async fn details(pool: &PgPool, query: &SearchParamsBuilder, result: &Value) -> Vec<Value> {
    let params = query.clone().build();
    let season_scoped = params.scope.as_deref() == Some(StatScope::Season.as_code())
        && params.sort.as_deref() != Some(SortOption::NumberOfSeasonsWith.as_code());
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(search_details),
    )
    .await;
    let request = test::TestRequest::post()
        .uri(&format!("/players/{}/search-details", result["player_id"]))
        .set_json(json!({
            "search": params,
            "qualifying_game_ids": result.get("qualifying_game_ids").unwrap_or(&json!([])),
            "qualifying_seasons": result.get("qualifying_seasons").unwrap_or(&json!([])),
            "result_season": if season_scoped {result["season"].clone()} else {Value::Null},
        }))
        .to_request();
    let response = test::call_service(&app, request).await;
    let status = response.status();
    let body: Value = test::read_body_json(response).await;
    assert_eq!(status, StatusCode::OK, "{query}: {body}");
    body.as_array().unwrap().clone()
}

fn sum(games: &[Value], field: &str) -> i64 {
    games
        .iter()
        .filter(|game| game["qualifies"] == true)
        .map(|game| game["stats"][field].as_i64().unwrap())
        .sum()
}

#[actix_web::test]
async fn aggregate_details_reconcile_with_original_results_in_both_sources_and_scopes() {
    let pool = fixture_pool().await;
    for scope in [StatScope::Overall, StatScope::Season] {
        for window in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new()
                .minute_played_from(46)
                .minute_played_to(90),
            SearchParamsBuilder::new()
                .minute_played_from(80)
                .minute_played_to(80),
        ] {
            for penalty in [
                PenaltyOption::IncludePenalties,
                PenaltyOption::ExcludePenalties,
                PenaltyOption::OnlyPenalties,
            ] {
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .scope(scope)
                    .penalty(penalty)
                    .with_filters(&window);
                for result in get_rows(&pool, "/search", &query).await {
                    let games = details(&pool, &query, &result).await;
                    let ids: Vec<Value> = games
                        .iter()
                        .filter(|game| game["qualifies"] == true)
                        .map(|game| game["game_id"].clone())
                        .collect();
                    assert_eq!(
                        ids,
                        *result["qualifying_game_ids"].as_array().unwrap(),
                        "{query}: {result}"
                    );
                    for (field, total) in [
                        ("appearances", "total_appearances"),
                        ("minutes", "total_minutes_played"),
                        ("goals", "total_goals"),
                        ("assists", "total_assists"),
                        ("yellows", "total_yellow_cards"),
                        ("reds", "total_red_cards"),
                    ] {
                        assert_eq!(
                            sum(&games, field),
                            result[total].as_i64().unwrap(),
                            "{query} {field}: {result}"
                        );
                    }
                    if scope == StatScope::Season {
                        assert!(games.iter().all(|game| game["season"] == result["season"]));
                    }
                }
            }
        }
    }
}

#[actix_web::test]
async fn count_membership_matches_ids_and_seasons_in_all_four_query_paths() {
    let pool = fixture_pool().await;
    for sort in [
        SortOption::NumberOfGamesWith,
        SortOption::NumberOfSeasonsWith,
    ] {
        for window in [
            SearchParamsBuilder::new(),
            SearchParamsBuilder::new()
                .minute_played_from(46)
                .minute_played_to(90),
        ] {
            for bounds in [
                SearchParamsBuilder::new().minimum_goals(1),
                SearchParamsBuilder::new().maximum_goals(0),
                SearchParamsBuilder::new()
                    .minimum_assists(1)
                    .maximum_goals_and_assists(3),
            ] {
                let query = SearchParamsBuilder::new()
                    .competitions(vec![Competition::PremierLeague])
                    .sort(sort)
                    .with_filters(&window)
                    .with_filters(&bounds);
                for result in get_rows(&pool, "/search/occurrences", &query).await {
                    let games = details(&pool, &query, &result).await;
                    if sort == SortOption::NumberOfGamesWith {
                        let ids: Vec<Value> = games
                            .iter()
                            .filter(|game| game["qualifies"] == true)
                            .map(|game| game["game_id"].clone())
                            .collect();
                        assert_eq!(
                            ids.len() as i64,
                            result["number_of_games"].as_i64().unwrap()
                        );
                        assert_eq!(ids, *result["qualifying_game_ids"].as_array().unwrap());
                    } else {
                        let seasons = result["qualifying_seasons"].as_array().unwrap();
                        assert_eq!(
                            seasons.len() as i64,
                            result["number_of_seasons"].as_i64().unwrap()
                        );
                        for season in seasons {
                            assert!(
                                games
                                    .iter()
                                    .any(|game| game["season"] == *season
                                        && game["qualifies"] == true)
                            );
                        }
                        for game in &games {
                            assert_eq!(
                                game["qualifies"] == true,
                                seasons.contains(&game["season"])
                                    && game["matches_filters"] == true
                            );
                        }
                    }
                }
            }
        }
    }
}

#[actix_web::test]
async fn wider_context_keeps_competitions_and_seasons_but_reveals_other_games() {
    let pool = fixture_pool().await;
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .seasons(vec![2024])
        .names(vec!["Alex"])
        .home_or_away(HomeAwayOption::Away);
    let results = get_rows(&pool, "/search", &query).await;
    let result = results.iter().find(|row| row["player_id"] == 1).unwrap();
    let games = details(&pool, &query, result).await;
    assert_eq!(
        games
            .iter()
            .map(|game| game["game_id"].clone())
            .collect::<Vec<_>>(),
        json!([1, 2, 3]).as_array().unwrap().clone()
    );
    assert!(
        games
            .iter()
            .all(|game| game["season"] == 2024 && game["competition_id"] == "GB1")
    );
    assert_eq!(
        games
            .iter()
            .filter(|game| game["qualifies"] == true)
            .map(|game| game["game_id"].clone())
            .collect::<Vec<_>>(),
        vec![json!(2)]
    );
}

#[actix_web::test]
async fn detail_statistics_and_chart_events_respect_minute_and_penalty_settings() {
    let pool = fixture_pool().await;
    let query = SearchParamsBuilder::new()
        .competitions(vec![Competition::PremierLeague])
        .names(vec!["Alex"])
        .seasons(vec![2024])
        .minute_played_from(45)
        .minute_played_to(46)
        .penalty(PenaltyOption::ExcludePenalties);
    let result = &get_rows(&pool, "/search", &query).await[0];
    let games = details(&pool, &query, result).await;
    let first = games.iter().find(|game| game["game_id"] == 1).unwrap();
    assert_eq!(first["stats"]["minutes"], 2);
    assert_eq!(first["stats"]["goals"], 0);
    assert_eq!(first["goal_minutes"], json!([]));
    assert_eq!(first["penalty_goal_minutes"], json!([]));
    assert_eq!(first["assist_minutes"], json!([46]));
    assert_eq!(first["minutes_played"], json!([45, 46]));
}

#[actix_web::test]
async fn season_detail_totals_use_all_original_filters_even_for_nonqualifying_seasons() {
    let pool = fixture_pool().await;
    for window in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(1)
            .minute_played_to(45),
    ] {
        let filters = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Alex"])
            .home_or_away(HomeAwayOption::Away)
            .clubs_played_for(vec!["101"])
            .penalty(PenaltyOption::IncludePenalties)
            .with_filters(&window);
        let query = filters
            .clone()
            .sort(SortOption::NumberOfSeasonsWith)
            .minimum_goals(1);
        let results = get_rows(&pool, "/search/occurrences", &query).await;
        assert_eq!(results.len(), 1, "{query}");
        let games = details(&pool, &query, &results[0]).await;
        let seasons = get_rows(&pool, "/search", &filters.clone().scope(StatScope::Season)).await;
        assert_eq!(seasons.len(), 2);
        for season in seasons {
            let contributing: Vec<Value> = games
                .iter()
                .filter(|game| {
                    game["season"] == season["season"] && game["matches_filters"] == true
                })
                .map(|game| {
                    let mut game = game.clone();
                    game["qualifies"] = json!(true);
                    game
                })
                .collect();
            for (field, total) in [
                ("appearances", "total_appearances"),
                ("minutes", "total_minutes_played"),
                ("goals", "total_goals"),
                ("assists", "total_assists"),
            ] {
                assert_eq!(
                    sum(&contributing, field),
                    season[total].as_i64().unwrap(),
                    "{filters} {field}"
                );
            }
        }
    }
}

#[actix_web::test]
async fn detail_minutes_reconcile_at_half_time_and_extra_time_boundaries() {
    let pool = fixture_pool().await;
    for query in [
        SearchParamsBuilder::new()
            .competitions(vec![Competition::Ligue1])
            .names(vec!["Harper"])
            .minute_played_from(46)
            .minute_played_to(46),
        SearchParamsBuilder::new()
            .competitions(vec![Competition::ChampionsLeague])
            .names(vec!["Terry"])
            .minute_played_from(105)
            .minute_played_to(120),
        SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .names(vec!["Sam"])
            .minute_played_from(80)
            .minute_played_to(80),
    ] {
        for result in get_rows(&pool, "/search", &query).await {
            let games = details(&pool, &query, &result).await;
            assert_eq!(
                sum(&games, "minutes"),
                result["total_minutes_played"].as_i64().unwrap()
            );
            assert_eq!(
                sum(&games, "reds"),
                result["total_red_cards"].as_i64().unwrap()
            );
        }
    }
}

#[actix_web::test]
async fn card_season_details_reconcile_with_the_qualifying_seasons() {
    let pool = fixture_pool().await;
    for window in [
        SearchParamsBuilder::new(),
        SearchParamsBuilder::new()
            .minute_played_from(46)
            .minute_played_to(90),
    ] {
        let query = SearchParamsBuilder::new()
            .competitions(vec![Competition::PremierLeague])
            .sort(SortOption::NumberOfSeasonsWith)
            .minimum_yellow_cards(1)
            .minimum_red_cards(1)
            .with_filters(&window);
        let results = get_rows(&pool, "/search/occurrences", &query).await;
        assert_eq!(results.len(), 2);
        for result in results {
            let games = details(&pool, &query, &result).await;
            let years = result["qualifying_seasons"].as_array().unwrap();
            assert_eq!(
                years.len(),
                result["number_of_seasons"].as_u64().unwrap() as usize
            );
            for game in &games {
                if game["qualifies"] == true {
                    assert!(years.contains(&game["season"]));
                }
            }
            assert!(sum(&games, "yellows") >= 1);
            assert!(sum(&games, "reds") >= 1);
        }
    }
}

#[actix_web::test]
async fn own_goals_do_not_inflate_search_totals_details_or_qualifying_counts() {
    let pool = fixture_pool().await;
    let player = SearchParamsBuilder::new().names(vec!["Robin Repeat"]);

    // G11 has three regular goals, two penalties and two own goals.
    // At minute 90, two regular goals, both penalties and both own goals coexist.
    for (window, goals, non_penalty_goals, regular_minutes) in [
        (SearchParamsBuilder::new(), 5, 3, json!([10, 90, 90])),
        (
            SearchParamsBuilder::new()
                .minute_played_from(1)
                .minute_played_to(90),
            5,
            3,
            json!([10, 90, 90]),
        ),
        (
            SearchParamsBuilder::new()
                .minute_played_from(90)
                .minute_played_to(90),
            4,
            2,
            json!([90, 90]),
        ),
    ] {
        for (penalty, expected_goals) in [
            (PenaltyOption::IncludePenalties, goals),
            (PenaltyOption::ExcludePenalties, non_penalty_goals),
            (PenaltyOption::OnlyPenalties, 2),
        ] {
            let query = player.clone().with_filters(&window).penalty(penalty);
            let results = get_rows(&pool, "/search", &query).await;
            assert_eq!(results.len(), 1, "{query}");
            assert_eq!(results[0]["total_goals"], json!(expected_goals), "{query}");

            let games = details(&pool, &query, &results[0]).await;
            assert_eq!(games.len(), 1, "{query}");
            assert_eq!(games[0]["stats"]["goals"], json!(expected_goals), "{query}");
            assert_eq!(games[0]["own_goal_minutes"], json!([90, 90]), "{query}");
            assert_eq!(
                games[0]["goal_minutes"],
                if penalty == PenaltyOption::OnlyPenalties {
                    json!([])
                } else {
                    regular_minutes.clone()
                },
                "{query}"
            );

            let game_results = get_rows(&pool, "/search/game", &query).await;
            assert_eq!(game_results.len(), 1, "{query}");
            assert_eq!(game_results[0]["goals"], json!(expected_goals), "{query}");

            for sort in [
                SortOption::NumberOfGamesWith,
                SortOption::NumberOfSeasonsWith,
            ] {
                let field = if sort == SortOption::NumberOfGamesWith {
                    "number_of_games"
                } else {
                    "number_of_seasons"
                };
                let exact = query.clone().sort(sort)
                    .minimum_goals(expected_goals).maximum_goals(expected_goals);
                let counts = get_rows(&pool, "/search/occurrences", &exact).await;
                assert_eq!(counts.len(), 1, "{exact}");
                assert_eq!(counts[0][field], json!(1), "{exact}");
                let too_many = query.clone().sort(sort).minimum_goals(expected_goals + 1);
                assert!(
                    get_rows(&pool, "/search/occurrences", &too_many).await.is_empty(),
                    "{too_many}"
                );
            }
        }
    }
}
