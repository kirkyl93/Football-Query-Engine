use actix_web::HttpResponse;
use serde::Serialize;

/// Maps a list-query DB result to a response without leaking internals.
/// Lenient contract preserved: success returns the bare array.
pub fn db_list_result<T: Serialize>(result: Result<T, sqlx::Error>) -> HttpResponse {
    match result {
        Ok(rows) => HttpResponse::Ok().json(rows),
        Err(err) => {
            log::error!("database query failed: {:?}", err);
            HttpResponse::InternalServerError().json(serde_json_error())
        }
    }
}

/// Maps a `fetch_all` by id to 200/404/500.
/// `RowNotFound` and empty vec both mean "no data"; any other DB error is 500.
pub fn db_rows_or_not_found<T: Serialize>(
    result: Result<Vec<T>, sqlx::Error>,
    empty_message: &str,
) -> HttpResponse {
    match result {
        Ok(rows) if rows.is_empty() => HttpResponse::NotFound().json(empty_message),
        Ok(rows) => HttpResponse::Ok().json(rows),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(empty_message),
        Err(err) => {
            log::error!("database query failed: {:?}", err);
            HttpResponse::InternalServerError().json(serde_json_error())
        }
    }
}

fn serde_json_error() -> serde_json::Value {
    serde_json::json!({ "error": "internal error" })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_result_ok_is_200() {
        let resp = db_list_result::<Vec<i32>>(Ok(vec![1]));
        assert_eq!(resp.status(), actix_web::http::StatusCode::OK);
    }

    #[test]
    fn list_result_err_is_500_without_leak() {
        let resp = db_list_result::<Vec<i32>>(Err(sqlx::Error::RowNotFound));
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn empty_rows_is_404() {
        let resp = db_rows_or_not_found::<Vec<i32>>(Ok(vec![]), "No player found");
        assert_eq!(resp.status(), actix_web::http::StatusCode::NOT_FOUND);
    }
}
