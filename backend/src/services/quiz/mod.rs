// Shift London wall time before taking the date so the cutoff is 06:00 in GMT and BST.
macro_rules! current_quiz_date_sql {
    () => {
        "((now() AT TIME ZONE 'Europe/London') - interval '6 hours')::date"
    };
}

mod author;
mod play;
mod scoring;
mod search;

use actix_web::{
    HttpResponse, ResponseError,
    http::{StatusCode, header},
    web,
};
use serde::Serialize;

pub use author::Owner;

pub fn configure(config: &mut web::ServiceConfig) {
    config.service(
        web::scope("/quiz")
            .configure(author::configure)
            .configure(play::configure),
    );
}

#[derive(Debug)]
struct QuizError(StatusCode, &'static str);

impl std::fmt::Display for QuizError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.1)
    }
}

impl ResponseError for QuizError {
    fn status_code(&self) -> StatusCode {
        self.0
    }

    fn error_response(&self) -> HttpResponse {
        response(self.0, serde_json::json!({"message": self.1}))
    }
}

impl From<sqlx::Error> for QuizError {
    fn from(error: sqlx::Error) -> Self {
        log::error!("Quiz database request failed: {error}");
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The quiz database is unavailable.",
        )
    }
}

type QuizResult<T> = Result<T, QuizError>;

fn response(status: StatusCode, value: impl Serialize) -> HttpResponse {
    HttpResponse::build(status)
        .insert_header((header::CACHE_CONTROL, "no-store"))
        .json(value)
}

fn ok(value: impl Serialize) -> HttpResponse {
    response(StatusCode::OK, value)
}
