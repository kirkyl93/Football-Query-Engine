use actix_web::{test};
use football_game::club::Club;
use crate::common::test_search;

const BASE_CLUB_URL: &str = "/clubs?";
pub mod common;
#[test]
async fn test_get_clubs() {
        test_search(
            BASE_CLUB_URL,
            "search_name=lee",
            3,
            Club::new(399, "Leeds United Association Football Club".to_string())).await;
}

