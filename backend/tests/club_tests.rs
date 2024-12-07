mod common;

use actix_web::{test, App};
use actix_web::http::StatusCode;
use common::setup_test_db;
use football_game::club::Club;
use football_game::services::club::search_clubs::get_clubs;

#[actix_web::test]
async fn test_get_clubs() {
    let pool = setup_test_db().await;

    let app = test::init_service(
        App::new()
            .app_data(actix_web::web::Data::new(pool))
            .service(get_clubs)
    ).await;

    let request = test::TestRequest::get()
        .uri("/clubs?search_name=lee")
        .to_request();

    let response = test::call_service(&app, request).await;

    assert_eq!(response.status(), StatusCode::OK);

    let body: Vec<Club> = test::read_body_json(response).await;
    assert_eq!(body.len(), 3);

    let first_result: Club = body[0].clone();
    let expected_result = Club::new(399, "Leeds United".to_string());
    assert_eq!(first_result, expected_result);
}