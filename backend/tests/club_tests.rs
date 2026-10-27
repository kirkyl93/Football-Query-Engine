mod common;
use common::{fixture_pool, get_rows};
use serde_json::json;

#[actix_web::test]
async fn club_search_prioritises_leagues_before_stadium_capacity() {
    let pool = fixture_pool().await;
    assert_eq!(
        get_rows(&pool, "/clubs", "search_name=ranking").await,
        vec![
            json!({"club_id":401,"name":"Ranking English"}),
            json!({"club_id":402,"name":"Ranking Spanish"}),
            json!({"club_id":403,"name":"Ranking Italian"}),
            json!({"club_id":404,"name":"Ranking French"}),
            json!({"club_id":405,"name":"Ranking German"}),
            json!({"club_id":406,"name":"Ranking Unlisted"}),
        ]
    );
    assert_eq!(
        get_rows(&pool, "/clubs", "search_name=ranking&limit=1").await,
        vec![json!({"club_id":401,"name":"Ranking English"})]
    );
}

#[actix_web::test]
async fn club_search_matches_code_tokens_case_insensitively_and_orders_by_capacity() {
    let pool = fixture_pool().await;
    for query in ["search_name=lee", "search_name=LEE"] {
        assert_eq!(
            get_rows(&pool, "/clubs", query).await,
            vec![
                json!({"club_id":301,"name":"Leeds Grove"}),
                json!({"club_id":302,"name":"Lee Harbour"})
            ]
        );
    }
    assert_eq!(
        get_rows(&pool, "/clubs", "search_name=leeds%20grove").await,
        vec![json!({"club_id":301,"name":"Leeds Grove"})]
    );
}

#[actix_web::test]
async fn club_pagination_and_empty_search_results_are_exact() {
    let pool = fixture_pool().await;
    for (query, expected) in [
        (
            "search_name=lee&limit=1&page=0",
            json!([{"club_id":301,"name":"Leeds Grove"}]),
        ),
        (
            "search_name=lee&limit=1&page=1",
            json!([{"club_id":302,"name":"Lee Harbour"}]),
        ),
        ("search_name=lee&limit=1&page=2", json!([])),
        ("search_name=not-a-club", json!([])),
        ("search_name=%25", json!([])),
        ("search_name=%5F", json!([])),
    ] {
        assert_eq!(
            json!(get_rows(&pool, "/clubs", query).await),
            expected,
            "{query}"
        );
    }
}
