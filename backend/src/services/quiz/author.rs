use super::{
    QuizError, QuizResult, ok,
    search::{self, PlayerRows, RatedPlayer},
};
use actix_web::{
    HttpRequest, HttpResponse,
    http::{StatusCode, header},
    web,
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, types::Json};
use std::{
    collections::{BTreeMap, HashSet},
    time::{Duration, Instant},
};
use subtle::ConstantTimeEq;
use tokio::sync::{Mutex, MutexGuard};

pub struct Owner {
    secret: String,
    state: Mutex<Option<Session>>,
}

struct Session {
    token: String,
    expires: Instant,
    draft: Option<Draft>,
}

struct Draft {
    id: String,
    date: NaiveDate,
    question: String,
    search: String,
    players: Vec<PlayerRows>,
    scores: Option<Vec<AnswerScore>>,
    published: bool,
}

struct AnswerScore {
    raw_jev_score: f64,
    rating_override: Option<f64>,
    points: i32,
}

impl AnswerScore {
    fn calculate(
        players: &[PlayerRows],
        ratings: &[f64],
        overrides: &BTreeMap<i32, f64>,
    ) -> QuizResult<Vec<Self>> {
        let effective: Vec<_> = players
            .iter()
            .zip(ratings)
            .map(|(player, &rating)| overrides.get(&player.id).copied().unwrap_or(rating))
            .collect();
        let points = super::scoring::points(players, &effective)?;
        Ok(players
            .iter()
            .zip(ratings)
            .zip(points)
            .map(|((player, &raw_jev_score), points)| Self {
                raw_jev_score,
                rating_override: overrides.get(&player.id).copied(),
                points,
            })
            .collect())
    }

    fn saved_answer(&self, player: &PlayerRows) -> RatedPlayer {
        RatedPlayer {
            id: player.id,
            rows: player.rows.clone(),
            difficulty: self.raw_jev_score,
            difficulty_override: self.rating_override,
            points: self.points,
        }
    }
}

const UNAUTHORIZED: QuizError = QuizError(StatusCode::UNAUTHORIZED, "Sign in as the quiz master.");
const PREVIEW_REQUIRED: QuizError = QuizError(StatusCode::CONFLICT, "Preview this question again.");

impl Owner {
    pub fn from_env() -> Result<Option<Self>, &'static str> {
        let Ok(secret) = std::env::var("QUIZ_OWNER_SECRET") else {
            return Ok(None);
        };
        if secret.len() != 64 || !secret.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(
                "QUIZ_OWNER_SECRET must contain 32 random bytes encoded as 64 hex characters.",
            );
        }
        Ok(Some(Self {
            secret,

            state: Mutex::default(),
        }))
    }

    async fn authorize(
        &self,
        request: &HttpRequest,
    ) -> QuizResult<MutexGuard<'_, Option<Session>>> {
        let token = request
            .headers()
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or(UNAUTHORIZED)?;
        let guard = self.state.lock().await;
        if guard.as_ref().is_some_and(|session| {
            session.expires > Instant::now()
                && bool::from(session.token.as_bytes().ct_eq(token.as_bytes()))
        }) {
            return Ok(guard);
        }
        Err(UNAUTHORIZED)
    }
}

fn token() -> QuizResult<String> {
    let mut bytes = [0; 32];
    getrandom::fill(&mut bytes).map_err(|_| {
        QuizError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not create a secure token.",
        )
    })?;
    Ok(hex::encode(bytes))
}

pub(super) fn configure(config: &mut web::ServiceConfig) {
    config.service(
        web::scope("/owner")
            .app_data(web::JsonConfig::default().limit(16384))
            .route("/login", web::post().to(login))
            .route("/session", web::get().to(session))
            .route("/logout", web::post().to(logout))
            .route("/preview", web::post().to(preview))
            .route("/score", web::post().to(score))
            .route("/overrides", web::post().to(overrides))
            .route("/schedule", web::post().to(schedule))
            .route("/career/schedule", web::post().to(schedule_career)),
    );
}

#[derive(Deserialize)]
struct Login {
    secret: String,
}

async fn login(
    owner: Option<web::Data<Owner>>,
    input: web::Json<Login>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    if !bool::from(owner.secret.as_bytes().ct_eq(input.secret.as_bytes())) {
        return Err(UNAUTHORIZED);
    }
    let token = token()?;
    *owner.state.lock().await = Some(Session {
        token: token.clone(),
        expires: Instant::now() + Duration::from_secs(28800),
        draft: None,
    });
    Ok(ok(json!({"token":token})))
}

async fn session(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    let _session = owner.authorize(&request).await?;
    Ok(ok(json!({})))
}

async fn logout(owner: Option<web::Data<Owner>>, request: HttpRequest) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    *owner.authorize(&request).await? = None;
    Ok(ok(json!({})))
}

#[derive(Deserialize)]
struct PreviewInput {
    date: NaiveDate,
    question: String,
    search_type: String,
    query: String,
}

async fn preview(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
    pool: web::Data<PgPool>,
    input: web::Json<PreviewInput>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    let mut session = owner.authorize(&request).await?;
    let question = input.question.trim();
    if !(1..=500).contains(&question.chars().count()) {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Enter a question of up to 500 characters.",
        ));
    }
    let available: bool = sqlx::query_scalar(concat!(
        "SELECT $1 >= ",
        current_quiz_date_sql!(),
        "
         AND NOT EXISTS (SELECT 1 FROM game_quizzes WHERE quiz_date = $1 AND day_slot = 1)",
    ))
    .bind(input.date)
    .fetch_one(pool.as_ref())
    .await?;
    if !available {
        return Err(QuizError(StatusCode::CONFLICT, "That date is unavailable."));
    }
    let players = search::players(&pool, &input.search_type, &input.query).await?;
    let id = token()?;
    let rows: Vec<_> = players
        .iter()
        .flat_map(|player| {
            player.rows.iter().map(|row| {
                let mut clue = search::clue(row, true, 0);
                clue.result = Some(row);
                clue
            })
        })
        .collect();
    let response = ok(json!({"id":id,"rows":rows,"count":players.len()}));
    session.as_mut().unwrap().draft = Some(Draft {
        id,
        date: input.date,
        question: question.into(),
        search: input.query.clone(),
        players,
        scores: None,
        published: false,
    });
    Ok(response)
}

#[derive(Deserialize)]
struct DraftInput {
    id: String,
}

async fn score(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
    input: web::Json<DraftInput>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    let mut session = owner.authorize(&request).await?;
    let draft = session
        .as_mut()
        .and_then(|session| session.draft.as_mut())
        .filter(|draft| draft.id == input.id)
        .ok_or(PREVIEW_REQUIRED)?;
    if draft.scores.is_none() {
        let key = std::env::var("JEV_API_KEY").unwrap_or_default();
        if key.trim().is_empty() {
            return Err(QuizError(
                StatusCode::SERVICE_UNAVAILABLE,
                "Set JEV_API_KEY on the backend before scoring.",
            ));
        }
        let model = std::env::var("JEV_MODEL").unwrap_or_else(|_| "jev-latest".into());
        let client = request
            .app_data::<web::Data<reqwest::Client>>()
            .ok_or(QuizError(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Jev HTTP client is unavailable.",
            ))?;
        let ratings =
            super::scoring::rate(&client, key.trim(), &model, &draft.question, &draft.players)
                .await?;
        draft.scores = Some(AnswerScore::calculate(
            &draft.players,
            &ratings,
            &BTreeMap::new(),
        )?);
    }
    score_response(draft)
}

#[derive(Deserialize)]
struct OverrideInput {
    id: String,
    ratings: BTreeMap<i32, Option<f64>>,
}

async fn overrides(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
    input: web::Json<OverrideInput>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    let mut session = owner.authorize(&request).await?;
    let draft = session
        .as_mut()
        .and_then(|session| session.draft.as_mut())
        .filter(|draft| draft.id == input.id)
        .ok_or(PREVIEW_REQUIRED)?;
    if draft.published {
        return Err(QuizError(
            StatusCode::CONFLICT,
            "This quiz has already been scheduled.",
        ));
    }
    let scores = draft.scores.as_ref().ok_or(QuizError(
        StatusCode::CONFLICT,
        "Score the answers before changing ratings.",
    ))?;

    let player_ids: HashSet<_> = draft.players.iter().map(|player| player.id).collect();
    if input.ratings.keys().any(|id| !player_ids.contains(id))
        || input
            .ratings
            .values()
            .flatten()
            .any(|rating| !(0.0..=4.0).contains(rating))
    {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Use ratings from 0 to 4 for players in this quiz.",
        ));
    }

    let raw: Vec<_> = scores.iter().map(|score| score.raw_jev_score).collect();
    let ratings = draft
        .players
        .iter()
        .zip(scores)
        .filter_map(|(player, score)| {
            let rating = input
                .ratings
                .get(&player.id)
                .copied()
                .unwrap_or(score.rating_override);
            rating.map(|rating| (player.id, rating))
        })
        .collect();
    draft.scores = Some(AnswerScore::calculate(&draft.players, &raw, &ratings)?);
    score_response(draft)
}

fn score_response(draft: &Draft) -> QuizResult<HttpResponse> {
    let scores: Vec<_> = draft
        .players
        .iter()
        .zip(draft.scores.as_ref().unwrap())
        .map(|(player, score)| {
            Ok(json!({
                "player_id":player.id,
                "name":player.rows[0]["player_name"],
                "rank":super::scoring::search_rank(player)?,
                "jev_rating":score.raw_jev_score,
                "override_rating":score.rating_override,
                "points":score.points,
            }))
        })
        .collect::<QuizResult<_>>()?;
    Ok(ok(scores))
}

async fn schedule_career(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
    pool: web::Data<PgPool>,
    input: web::Json<super::career::ScheduleInput>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    drop(owner.authorize(&request).await?);
    super::career::schedule(&pool, input.into_inner()).await
}

async fn schedule(
    owner: Option<web::Data<Owner>>,
    request: HttpRequest,
    pool: web::Data<PgPool>,
    input: web::Json<DraftInput>,
) -> QuizResult<HttpResponse> {
    let owner = owner.ok_or(UNAUTHORIZED)?;
    let mut session = owner.authorize(&request).await?;
    let draft = session
        .as_mut()
        .and_then(|session| session.draft.as_mut())
        .filter(|draft| draft.id == input.id)
        .ok_or(PREVIEW_REQUIRED)?;
    let scores = draft.scores.as_ref().ok_or(QuizError(
        StatusCode::CONFLICT,
        "Score the answers before scheduling.",
    ))?;
    if !draft.published {
        let answers: Vec<_> = draft
            .players
            .iter()
            .zip(scores)
            .map(|(player, score)| score.saved_answer(player))
            .collect();
        let inserted = sqlx::query(concat!(
            "INSERT INTO game_quizzes (quiz_date, day_slot, question, search_params, answers)
             SELECT $1, 1, $2, $3, $4 WHERE $1 >= ",
            current_quiz_date_sql!(),
            "
             ON CONFLICT (quiz_date, day_slot) DO NOTHING",
        ))
        .bind(draft.date)
        .bind(&draft.question)
        .bind(&draft.search)
        .bind(Json(answers))
        .execute(pool.as_ref())
        .await?;
        if inserted.rows_affected() == 0 {
            return Err(QuizError(StatusCode::CONFLICT, "That date is unavailable."));
        }
        draft.published = true;
    }
    Ok(ok(json!({"date":draft.date})))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{App, test};

    #[actix_web::test]
    async fn saved_answers_keep_raw_jev_ratings_alongside_awarded_points() {
        let players = [
            PlayerRows {
                id: 30,
                rows: vec![json!({"rank":1})],
            },
            PlayerRows {
                id: 10,
                rows: vec![json!({"rank":6})],
            },
        ];
        let raw_ratings = [3.625, 0.375];
        let scores =
            AnswerScore::calculate(&players, &raw_ratings, &BTreeMap::from([(30, 3.0)])).unwrap();
        let saved: Vec<_> = players
            .iter()
            .zip(&scores)
            .map(|(player, score)| score.saved_answer(player))
            .collect();

        assert_eq!(
            serde_json::to_value(saved).unwrap(),
            json!([
                {"id":30,"rows":[{"rank":1}],"difficulty":3.625,"difficulty_override":3.0,"points":16},
                {"id":10,"rows":[{"rank":6}],"difficulty":0.375,"points":17},
            ])
        );
    }

    #[actix_web::test]
    async fn scores_and_overrides_reuse_cached_ratings_without_a_jev_client() {
        let players = [1, 2, 3]
            .into_iter()
            .map(|id| PlayerRows {
                id,
                rows: vec![json!({"player_name": format!("Player {id}"), "rank": id})],
            })
            .collect::<Vec<_>>();
        let scores = AnswerScore::calculate(&players, &[3.5, 0.5, 2.0], &BTreeMap::new()).unwrap();
        let owner = web::Data::new(Owner {
            secret: "a".repeat(64),
            state: Mutex::new(Some(Session {
                token: "owner-session".into(),
                expires: Instant::now() + Duration::from_secs(60),
                draft: Some(Draft {
                    id: "draft".into(),
                    date: NaiveDate::from_ymd_opt(2099, 1, 1).unwrap(),
                    question: "Which players qualify?".into(),
                    search: "scope=o".into(),
                    players,
                    scores: Some(scores),
                    published: false,
                }),
            })),
        });
        let app = test::init_service(
            App::new()
                .app_data(owner.clone())
                .configure(super::super::configure),
        )
        .await;
        let request = |path: &str, body: serde_json::Value| {
            test::TestRequest::post()
                .uri(path)
                .insert_header((header::AUTHORIZATION, "Bearer owner-session"))
                .set_json(body)
                .to_request()
        };
        let initial: serde_json::Value = test::call_and_read_body_json(
            &app,
            request("/quiz/owner/score", json!({"id":"draft"})),
        )
        .await;
        assert_eq!(initial[0]["points"], 17);
        assert_eq!(initial[1]["points"], 16);
        assert_eq!(initial[0]["jev_rating"], 3.5);

        for ratings in [json!({"1":5.0}), json!({"999":1.0})] {
            let rejected = test::call_service(
                &app,
                request(
                    "/quiz/owner/overrides",
                    json!({"id":"draft","ratings":ratings}),
                ),
            )
            .await;
            assert_eq!(rejected.status(), StatusCode::BAD_REQUEST);
        }
        let edited: serde_json::Value = test::call_and_read_body_json(
            &app,
            request(
                "/quiz/owner/overrides",
                json!({"id":"draft","ratings":{"1":0}}),
            ),
        )
        .await;
        assert_eq!(edited[0]["jev_rating"], 3.5);
        assert_eq!(edited[0]["override_rating"], 0.0);
        assert_eq!(edited[0]["points"], 16);
        assert_eq!(edited[1]["points"], 17);

        let cleared: serde_json::Value = test::call_and_read_body_json(
            &app,
            request(
                "/quiz/owner/overrides",
                json!({"id":"draft","ratings":{"1":null}}),
            ),
        )
        .await;
        assert_eq!(cleared, initial);

        owner
            .state
            .lock()
            .await
            .as_mut()
            .unwrap()
            .draft
            .as_mut()
            .unwrap()
            .published = true;
        let scheduled = test::call_service(
            &app,
            request(
                "/quiz/owner/overrides",
                json!({"id":"draft","ratings":{"1":0}}),
            ),
        )
        .await;
        assert_eq!(scheduled.status(), StatusCode::CONFLICT);
    }

    #[actix_web::test]
    async fn public_requests_cannot_preview_score_or_schedule() {
        let owner = Owner {
            secret: "a".repeat(64),

            state: Mutex::default(),
        };
        let pool = sqlx::postgres::PgPoolOptions::new()
            .connect_lazy("postgres://unused@localhost/unused")
            .unwrap();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool))
                .app_data(web::Data::new(owner))
                .configure(super::super::configure),
        )
        .await;
        for route in [
            "preview",
            "score",
            "overrides",
            "schedule",
            "career/schedule",
        ] {
            let req = test::TestRequest::post().uri(&format!("/quiz/owner/{route}"))
                .set_json(json!({"id":"x","player_id":123,"date":"2099-01-01","question":"Who?","search_type":"totals","query":"scope=o","ratings":{}})).to_request();
            assert_eq!(
                test::call_service(&app, req).await.status(),
                StatusCode::UNAUTHORIZED
            );
        }
        let req = test::TestRequest::post()
            .uri("/quiz/owner/login")
            .set_json(json!({"secret":"a".repeat(64)}))
            .to_request();
        let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
        let auth = format!("Bearer {}", body["token"].as_str().unwrap());
        let req = test::TestRequest::get()
            .uri("/quiz/owner/session")
            .insert_header((header::AUTHORIZATION, auth))
            .to_request();
        assert_eq!(test::call_service(&app, req).await.status(), StatusCode::OK);
    }
}
