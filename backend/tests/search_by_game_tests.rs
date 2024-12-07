use actix_web::http::StatusCode;
use actix_web::{test, App};
use chrono::NaiveDate;
use football_game::competitions::Competition;
use football_game::countries::Country;
use football_game::services::player::player_enums::PlayerSubPosition;
use football_game::services::player::search_by_game::search_by_game;
use football_game::services::player::sql_models::PlayerGameSearchResult;
use crate::common::setup_test_db;

mod common;

#[actix_web::test]
async fn test_search_by_game_with_minute_filter() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_game)
    ).await;

    let request = test::TestRequest::get().uri("/search/game?\
    page=0\
    &limit=50\
    &seasons=2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,\
    2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024\
    &comps=GB1\
    &minfrom=1\
    &minto=46\
    &minage=14\
    &maxage=40\
    &minheight=131\
    &maxheight=192\
    &penalty=ip\
    &home=e\
    &sort=g")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);


    let body: Vec<PlayerGameSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerGameSearchResult = body[0].clone();
    let expected_result = PlayerGameSearchResult::new(
        1, 568177, String::from("Cole Palmer"), Country::England,
        String::from("gb-eng"), PlayerSubPosition::AttackingMidfield,
        String::from("https://img.a.transfermarkt.technology/portrait/header/568177-1712320986.jpg?lm=1"),
        631, "GB1".to_string(), Competition::PremierLeague, String::from("gb-eng"),
        NaiveDate::from_ymd_opt(2024, 09, 28).unwrap(), 2024, 631,
        String::from("Chelsea Football Club"), 4, 1237,
        String::from("Brighton and Hove Albion Football Club"), 2,
        46, 4, 0);

    assert_eq!(first_result, expected_result);
}

#[actix_web::test]
async fn test_search_by_game() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(search_by_game)
    ).await;

    let request = test::TestRequest::get().uri("/search/game?\
    page=0\
    &limit=50\
    &seasons=2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,\
    2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024\
    &comps=GB1,ES1,IT1\
    &maxage=18\
    &minheight=131\
    &maxheight=192\
    &penalty=ep\
    &home=e\
    &sort=a")
        .to_request();

    let response = test::call_service(&app, request).await;
    assert_eq!(response.status(), StatusCode::OK);


    let body: Vec<PlayerGameSearchResult> = test::read_body_json(response).await;
    assert_eq!(body.len(), 50);

    let first_result: PlayerGameSearchResult = body[0].clone();
    let expected_result = PlayerGameSearchResult::new(
        1, 44675, String::from("Bojan Krkic"), Country::Spain,
        String::from("es"), PlayerSubPosition::SecondStriker,
        String::from("https://img.a.transfermarkt.technology/portrait/header/44675-1583613429.jpg?lm=1"),
        131, String::from("ES1"), Competition::LaLiga, String::from("es"),
        NaiveDate::from_ymd_opt(2008, 03, 23).unwrap(), 2007, 131,
        String::from("FC Barcelona"), 4, 366,
        String::from("Real Valladolid CF"), 1,
        86, 2, 2);

    assert_eq!(first_result, expected_result);
}

