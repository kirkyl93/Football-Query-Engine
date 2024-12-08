use actix_web::{test, App};
use actix_web::http::StatusCode;
use football_game::countries::Country;
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::search_by_season_or_across_seasons::search_by_season_or_across_seasons;
use football_game::services::player::sql_models::{PlayerSearchResult};
use crate::common::setup_test_db;

mod common;

#[actix_web::test]
async fn test_search_across_seasons() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_season_or_across_seasons)
    ).await;

    let request = test::TestRequest::get().uri("/search?\
    &comps=GB1")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let player_with_most_goals: PlayerSearchResult = body[0].clone();
    let expected_result = PlayerSearchResult::new(
        1, 3110, String::from("Alan Shearer"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/3110-1485180006.jpg?lm=1"),
        441, 14, 260, 68,
        44, 2, 38199, String::from("164, 762"), 146,
        561, 116, 868, 19099, 0);

    assert_eq!(player_with_most_goals, expected_result);

    let second_request = test::TestRequest::get().uri("/search?\
    &comps=GB1\
    &c=tg,au\
    &penalty=ip\
    &home=e\
    &sort=mpg\
    &ma=50\
    &scope=o")
        .to_request();

    let second_response = test::call_service(&app, second_request).await;
    assert_eq!(second_response.status(), StatusCode::OK);

    let body: Vec<PlayerSearchResult> = test::read_body_json(second_response).await;
    assert_eq!(body.len(), 15);

    let player_from_togo_or_aus_with_most_prem_goals: PlayerSearchResult = body[0].clone();
    let expected_result = PlayerSearchResult::new(
        1, 8883, String::from("Emmanuel Adebayor"), Country::Togo,
        String::from("tg"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/8883-1565870134.jpg?lm=1"),
        242, 43, 97, 40,
        20, 2, 17928, String::from("11, 148, 281, 873"), 184,
        448, 130, 896, 8964, 0);

    assert_eq!(player_from_togo_or_aus_with_most_prem_goals, expected_result);
}

#[actix_web::test]
async fn test_search_across_seasons_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_season_or_across_seasons)
    ).await;

    let request = test::TestRequest::get().uri("/search?\
    &comps=GB1\
    &minfrom=3\
    &minto=90\
    &positions=CB\
    &home=e\
    &sort=o")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerSearchResult = body[0].clone();
    let expected_result = PlayerSearchResult::new(
        1, 3160, String::from("John Terry"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::CentreBack,
        String::from("https://img.a.transfermarkt.technology/portrait/header/3160-1462887884.jpg?lm=1"),
        492, 19, 44, 16,
        53, 5, 41044, String::from("631"), 932,
        2565, 684, 774, 8208, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_search_by_season() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_season_or_across_seasons)
    ).await;

    let request = test::TestRequest::get().uri("/search?\
    names=David\
    &penalty=ep\
    &home=h\
    &sort=mpga\
    &ma=15\
    &scope=s")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerSearchResult = body[0].clone();
    let expected_result = PlayerSearchResult::new(
        1, 4146, String::from("David Trezeguet"), Country::France,
        String::from("fr"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/4146-1491231443.jpg?lm=1"),
        19, 7, 17, 1,
        0, 0, 1205, String::from("162"), 70,
        1205, 66, 0, 0, 1997);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_search_by_season_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_season_or_across_seasons)
    ).await;

    let request = test::TestRequest::get().uri("/search?\
    comps=GB1,CL\
    &minfrom=60\
    &clubspf=399\
    &minto=88\
    &penalty=ep\
    &home=e\
    &sort=g\
    &scope=s\
    &subonly=1\
    &earliestsub=45")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<PlayerSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerSearchResult = body[0].clone();
    let expected_result = PlayerSearchResult::new(
        1, 131505, String::from("Rodrigo"), Country::Spain,
        String::from("es"), PlayerSubPosition::CentreForward,
        String::from("https://img.a.transfermarkt.technology/portrait/header/131505-1686816509.jpg?lm=1"),
        10, 10, 3, 0,
        1, 0, 245, String::from("399"), 81,
        0, 81, 245, 0, 2020);

    assert_eq!(first_result, expected_result);
}


