use actix_web::{test, App};
use actix_web::http::StatusCode;
use football_game::countries::Country;
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::search_by_count::search_by_count;
use football_game::services::player::sql_models::PlayerNumberOfGamesOrSeasonsResult;
use crate::common::setup_test_db;

mod common;

#[actix_web::test]
async fn test_number_of_games_in_a_season() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=GB1\
    &penalty=op\
    &home=e\
    &sort=gw\
    &ming=1\
    &maxg=1\
    &scope=s")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 3110, String::from("Alan Shearer"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/3110-1485180006.jpg?lm=1"),
        String::from("164"), 1994, 9, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_number_of_games_in_a_season_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=GB1\
    &penalty=ip\
    &home=e\
    &minfrom=85\
    &sort=gw\
    &ming=1\
    &scope=s")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 3163, String::from("Frank Lampard"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::CentralMidfield,
        String::from("https://img.a.transfermarkt.technology/portrait/header/3163-1674475335.jpg?lm=1"),
        String::from("631"), 2009, 6, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_number_of_games_overall() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=ES1\
    &home=e\
    &sort=gw\
    &minga=3\
    &maxga=4\
    &scope=o")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 28003, String::from("Lionel Messi"), Country::Argentina,
        String::from("ar"), PlayerSubPosition::RightWinger,
        String::from("https://img.a.transfermarkt.technology/portrait/header/28003-1671435885.jpg?lm=1"),
        String::from("131"), 0, 84, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_number_of_games_overall_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=GB1\
    &home=e\
    &sort=gw\
    &minfrom=77\
    &mina=1\
    &maxa=2\
    &scope=o")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 3406, String::from("Ryan Giggs"), Country::Wales,
        String::from("gb-wls"), PlayerSubPosition::LeftMidfield,
        String::from("https://img.a.transfermarkt.technology/portrait/header/3406-1589198838.jpg?lm=1"),
        String::from("985"), 0, 41, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_number_of_seasons() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=GB1\
    &home=e\
    &sort=sw\
    &mina=5\
    &ming=18")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 148455, String::from("Mohamed Salah"), Country::Egypt,
        String::from("eg"), PlayerSubPosition::RightWinger,
        String::from("https://img.a.transfermarkt.technology/portrait/header/148455-1727337594.jpg?lm=1"),
        String::from("31"), 0, 0, 7);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_number_of_seasons_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_count)
    ).await;

    let request = test::TestRequest::get().uri("/search/occurrences?\
    comps=GB1\
    &home=e\
    &sort=sw\
    &minto=15\
    &ming=3")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerNumberOfGamesOrSeasonsResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerNumberOfGamesOrSeasonsResult = body[0].clone();
    let expected_result = PlayerNumberOfGamesOrSeasonsResult::new(
        1, 132098, String::from("Harry Kane"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/132098-1700211169.jpg?lm=1"),
        String::from("148"), 0, 0, 7);

    assert_eq!(first_result, expected_result);
}


