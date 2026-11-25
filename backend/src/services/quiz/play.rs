use super::{
    QuizError, QuizResult, ok,
    search::{RatedPlayer, clue},
};
use crate::countries::Country;
use crate::services::player::{
    models::SearchParams,
    search_details::{DetailRequest, load_search_details},
};
use actix_web::{
    HttpRequest, HttpResponse,
    http::{StatusCode, header},
    web,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{PgPool, types::Json};
use std::collections::{BTreeMap, BTreeSet};

pub(super) fn configure(config: &mut web::ServiceConfig) {
    config
        .route("/today", web::get().to(today))
        .route("/archive", web::get().to(archive))
        .route("/archive/{quiz}", web::get().to(past))
        .route("/{quiz}/leaderboard", web::get().to(leaderboard))
        .route("/{quiz}/answers", web::get().to(reveal))
        .route("/{quiz}/wrong-guesses", web::get().to(wrong_guesses))
        .route("/{quiz}/details/{player}/{row}", web::get().to(details))
        .route("/{quiz}/guess", web::post().to(guess))
        .route("/{quiz}/hint", web::post().to(buy_hint))
        .route("/{quiz}/finish", web::post().to(finish));
}

const WRONG_GUESS_COST: i32 = 10;
const HINT_COST: i32 = 5;

const PUBLISHED_QUIZ: &str = concat!(
    "SELECT quiz_id, quiz_date, question, search_params, answers FROM game_quizzes
     WHERE (quiz_id = $1 OR (quiz_date = $2 AND day_slot = 1))
       AND quiz_date <= ",
    current_quiz_date_sql!(),
);

#[derive(sqlx::FromRow)]
struct Quiz {
    quiz_id: i32,
    quiz_date: NaiveDate,
    question: String,
    search_params: String,
    answers: Json<Vec<RatedPlayer>>,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub(super) enum HintKind {
    Clubs,
    Nationality,
    Position,
}

impl HintKind {
    const ALL: [Self; 3] = [Self::Clubs, Self::Nationality, Self::Position];

    fn value(self, player: &RatedPlayer) -> Option<Value> {
        if self == Self::Clubs {
            let mut clubs = BTreeSet::new();
            for row in &player.rows {
                if let Some(ids) = row["clubs_played_for"].as_str() {
                    clubs.extend(
                        ids.split(',')
                            .filter_map(|id| id.trim().parse::<i32>().ok())
                            .filter(|&id| id > 0),
                    );
                }
                if let Some(id) = row["club_id"]
                    .as_i64()
                    .and_then(|id| i32::try_from(id).ok())
                    .filter(|&id| id > 0)
                {
                    clubs.insert(id);
                }
            }
            return (!clubs.is_empty()).then(|| json!(clubs));
        }

        player.rows.iter().find_map(|row| match self {
            Self::Nationality => {
                let code = row["country_code"].as_str()?;
                let country = Country::from_code(code);
                (!country.code().is_empty())
                    .then(|| json!({"code": code, "name": country.as_str()}))
            }
            Self::Position => row["sub_position"]
                .as_str()
                .filter(|value| {
                    !value.trim().is_empty() && !matches!(*value, "Missing" | "Unknown")
                })
                .map(|value| json!(value)),
            Self::Clubs => unreachable!(),
        })
    }
}

#[derive(Default, sqlx::FromRow)]
struct Attempt {
    #[sqlx(json)]
    guesses: BTreeMap<i32, i32>,
    #[sqlx(json)]
    hints: BTreeMap<i32, BTreeSet<HintKind>>,
    finished: bool,
    display_name: Option<String>,
}

fn view(quiz: &Quiz, attempt: &Attempt, reveal_answers: bool) -> QuizResult<HttpResponse> {
    if reveal_answers && !attempt.finished {
        return Err(QuizError(
            StatusCode::CONFLICT,
            "Finish the quiz to reveal the answers.",
        ));
    }
    let rows: Vec<_> = quiz
        .answers
        .iter()
        .flat_map(|player| {
            let found = attempt
                .guesses
                .get(&player.id)
                .is_some_and(|points| *points > 0);
            let reveal = reveal_answers || found;
            let purchased = attempt.hints.get(&player.id);
            let hints: BTreeMap<_, _> = purchased
                .into_iter()
                .flatten()
                .filter_map(|&kind| kind.value(player).map(|value| (kind, value)))
                .collect();
            let available_hints =
                if !attempt.finished && !reveal && can_buy_hint(player.points, hints.len()) {
                    HintKind::ALL
                        .into_iter()
                        .filter(|kind| !hints.contains_key(kind) && kind.value(player).is_some())
                        .collect()
                } else {
                    Vec::new()
                };
            player.rows.iter().enumerate().map(move |(row_index, row)| {
                let mut clue = clue(row, reveal, player.points);
                if reveal {
                    clue.result = Some(row);
                    clue.row_index = Some(row_index);
                    clue.found = reveal_answers.then_some(found);
                    clue.purchased_hints = purchased.filter(|kinds| !kinds.is_empty());
                } else {
                    clue.hints = hints.clone();
                    clue.available_hints = available_hints.clone();
                }
                clue
            })
        })
        .collect();
    // Only display settings are needed in the browser. The detail query uses the full saved filters.
    let search: SearchParams = serde_urlencoded::from_str(&quiz.search_params).unwrap_or_default();
    let is_game = quiz
        .answers
        .first()
        .and_then(|player| player.rows.first())
        .is_some_and(|row| row.get("home_club_id").is_some());
    let scope = if is_game {
        "g"
    } else {
        search.scope.as_deref().unwrap_or("o")
    };
    let mut settings = vec![
        ("scope", scope),
        ("sort", search.sort.as_deref().unwrap_or("g")),
    ];
    settings.extend(
        search
            .direction
            .as_deref()
            .map(|value| ("direction", value)),
    );
    settings.extend(search.penalty.as_deref().map(|value| ("penalty", value)));
    if search.subs_only.is_some_and(|value| value > 0) {
        settings.push(("subonly", "1"));
    }
    let detail_context =
        serde_urlencoded::to_string(settings).expect("quiz detail display settings are strings");
    Ok(ok(json!({
        "detail_context":detail_context,
        "id":quiz.quiz_id,"date":quiz.quiz_date,"question":quiz.question,"rows":rows,
        "answers_revealed":reveal_answers,
        "wrong_guess_penalty": WRONG_GUESS_COST,
        "wrong_guess_count": attempt.guesses.values().filter(|&&points| points < 0).count(),
        "hint_cost": HINT_COST,
        "total":quiz.answers.len(),"found":attempt.guesses.values().filter(|&&v| v > 0).count(),
        "score":attempt_score(attempt),
        "max_score":quiz.answers.iter().map(|player| i64::from(player.points)).sum::<i64>(),
        "finished": attempt.finished,
        "display_name": attempt.display_name,
    })))
}

pub(super) fn guest(request: &HttpRequest) -> QuizResult<&str> {
    request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .filter(|token| token.len() == 32 && token.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .ok_or(QuizError(StatusCode::BAD_REQUEST, "Invalid guest session."))
}

async fn today(pool: web::Data<PgPool>, request: HttpRequest) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let quiz = sqlx::query_as::<_, Quiz>(concat!(
        "SELECT quiz_id, quiz_date, question, search_params, answers FROM game_quizzes
         WHERE quiz_date = ",
        current_quiz_date_sql!(),
        " AND day_slot = 1",
    ))
    .fetch_optional(pool.as_ref())
    .await?;
    let Some(quiz) = quiz else {
        return Ok(ok(serde_json::Value::Null));
    };
    let attempt = read_attempt(&pool, quiz.quiz_id, guest).await?;
    view(&quiz, &attempt, false)
}

async fn read_attempt(pool: &PgPool, id: i32, guest: &str) -> QuizResult<Attempt> {
    Ok(sqlx::query_as::<_, Attempt>(
        "SELECT guesses, hints, finished, display_name FROM game_quiz_attempts WHERE quiz_id = $1 AND guest_id = $2::text::uuid",
    ).bind(id).bind(guest).fetch_optional(pool).await?.unwrap_or_default())
}

async fn archive(pool: web::Data<PgPool>, request: HttpRequest) -> QuizResult<HttpResponse> {
    let entries: Vec<(NaiveDate, String, i32, bool)> = sqlx::query_as(concat!(
        "SELECT q.quiz_date, q.question, q.quiz_id, COALESCE(a.finished, false) AS completed
         FROM game_quizzes q
         LEFT JOIN game_quiz_attempts a ON a.quiz_id = q.quiz_id AND a.guest_id = $1::text::uuid
         WHERE q.quiz_date < ",
        current_quiz_date_sql!(),
        " ORDER BY q.quiz_date DESC, q.day_slot LIMIT 365",
    ))
    .bind(guest(&request).ok())
    .fetch_all(pool.as_ref())
    .await?;
    Ok(ok(entries))
}

// Old date-based links continue to refer to the first quiz of that day.
fn quiz_key(key: &str) -> QuizResult<(Option<i32>, Option<NaiveDate>)> {
    if let Ok(id) = key.parse::<i32>() {
        return Ok((Some(id), None));
    }
    key.parse::<NaiveDate>()
        .map(|date| (None, Some(date)))
        .map_err(|_| QuizError(StatusCode::NOT_FOUND, "Quiz unavailable."))
}

async fn past(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let (id, date) = quiz_key(&key)?;
    let quiz = sqlx::query_as::<_, Quiz>(concat!(
        "SELECT quiz_id, quiz_date, question, search_params, answers FROM game_quizzes
         WHERE (quiz_id = $1 OR (quiz_date = $2 AND day_slot = 1)) AND quiz_date < ",
        current_quiz_date_sql!(),
    ))
    .bind(id)
    .bind(date)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(QuizError(StatusCode::NOT_FOUND, "Past quiz unavailable."))?;
    let attempt = read_attempt(&pool, quiz.quiz_id, guest).await?;
    view(&quiz, &attempt, false)
}

#[derive(Serialize, sqlx::FromRow)]
struct WrongGuess {
    player_id: i32,
    name: String,
    points: i32,
    #[serde(skip)]
    search_params: String,
    #[serde(skip)]
    game_scope: bool,
    #[sqlx(skip)]
    stats: Vec<serde_json::Map<String, Value>>,
}

async fn wrong_guesses(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let (id, date) = quiz_key(&key)?;
    let mut guesses = sqlx::query_as::<_, WrongGuess>(concat!(
        "SELECT guess.player_id::integer AS player_id,
                COALESCE(NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
                         NULLIF(p.name, ''), 'Player #' || guess.player_id) AS name,
                guess.points::integer AS points, q.search_params,
                COALESCE(q.answers->0->'rows'->0 ? 'home_club_id', false) AS game_scope
         FROM game_quizzes q
         JOIN game_quiz_attempts a ON a.quiz_id = q.quiz_id
         CROSS JOIN LATERAL jsonb_each_text(a.guesses) AS guess(player_id, points)
         LEFT JOIN players p ON p.player_id = guess.player_id::integer
         WHERE (q.quiz_id = $1 OR (q.quiz_date = $2 AND q.day_slot = 1))
           AND a.guest_id = $3::text::uuid
           AND guess.points::integer < 0
           AND q.quiz_date <= ",
        current_quiz_date_sql!(),
        " ORDER BY name, player_id",
    ))
    .bind(id)
    .bind(date)
    .bind(guest)
    .fetch_all(pool.as_ref())
    .await?;
    if let Some(first) = guesses.first() {
        let mut stats = super::search::wrong_guess_stats(
            &pool,
            &first.search_params,
            first.game_scope,
            guesses.iter().map(|guess| guess.player_id).collect(),
        )
        .await?;
        for guess in &mut guesses {
            guess.stats = stats.remove(&guess.player_id).unwrap_or_default();
        }
    }
    Ok(ok(guesses))
}

async fn reveal(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let (id, date) = quiz_key(&key)?;
    let quiz = sqlx::query_as::<_, Quiz>(PUBLISHED_QUIZ)
        .bind(id)
        .bind(date)
        .fetch_optional(pool.as_ref())
        .await?
        .ok_or(QuizError(StatusCode::NOT_FOUND, "Quiz unavailable."))?;
    let attempt = read_attempt(&pool, quiz.quiz_id, guest).await?;
    view(&quiz, &attempt, true)
}

#[derive(Deserialize)]
struct SavedMembership {
    qualifying_game_ids: Vec<i32>,
    #[serde(default)]
    qualifying_seasons: Vec<i32>,
    season: Option<i32>,
}

#[derive(Deserialize)]
struct DetailAccess {
    #[serde(default)]
    review: bool,
}

async fn details(
    pool: web::Data<PgPool>,
    path: web::Path<(i32, i32, usize)>,
    access: web::Query<DetailAccess>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let (quiz_id, player_id, row_index) = path.into_inner();
    let missing = QuizError(StatusCode::NOT_FOUND, "Quiz details unavailable.");
    let record: Option<(String, Json<Vec<RatedPlayer>>, bool)> = sqlx::query_as(concat!(
        "SELECT q.search_params, q.answers,
            COALESCE((a.guesses->>$3::text)::integer > 0, false)
                OR ($4 AND COALESCE(a.finished, false))
         FROM game_quizzes q
         LEFT JOIN game_quiz_attempts a ON a.quiz_id = q.quiz_id AND a.guest_id = $2::text::uuid
         WHERE q.quiz_id = $1 AND q.quiz_date <= ",
        current_quiz_date_sql!(),
    ))
    .bind(quiz_id)
    .bind(guest)
    .bind(player_id.to_string())
    .bind(access.review)
    .fetch_optional(pool.as_ref())
    .await?;
    let Some((search, answers, true)) = record else {
        return Err(missing);
    };
    let row = answers
        .iter()
        .find(|player| player.id == player_id)
        .and_then(|player| player.rows.get(row_index))
        .ok_or(missing)?;
    let membership: SavedMembership = serde_json::from_value(row.clone())
        .map_err(|_| QuizError(StatusCode::NOT_FOUND, "Quiz details unavailable."))?;
    let search = serde_urlencoded::from_str(&search).map_err(|_| {
        QuizError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The quiz search filters are unavailable.",
        )
    })?;
    let detail = DetailRequest {
        search,
        qualifying_game_ids: membership.qualifying_game_ids,
        qualifying_seasons: membership.qualifying_seasons,
        result_season: membership.season,
    };
    let games = load_search_details(&pool, player_id, &detail).await?;
    Ok(ok(games))
}

#[derive(Deserialize)]
struct Guess {
    player_id: i32,
}

#[derive(Deserialize)]
struct Finish {
    display_name: Option<String>,
}

#[derive(Deserialize)]
struct HintInput {
    row: usize,
    kind: HintKind,
}

enum Change<'a> {
    Guess(i32),
    Hint(HintInput),
    Finish(Option<&'a str>),
}

fn attempt_score(attempt: &Attempt) -> i64 {
    let guesses = attempt
        .guesses
        .values()
        .map(|&points| i64::from(points))
        .sum::<i64>();
    let hints = attempt
        .hints
        .values()
        .map(|kinds| kinds.len() as i64)
        .sum::<i64>();
    guesses - hints * i64::from(HINT_COST)
}

fn can_buy_hint(points: i32, purchased: usize) -> bool {
    (purchased as i32 + 1) * HINT_COST <= points
}

fn apply_hint(quiz: &Quiz, attempt: &mut Attempt, input: HintInput) -> QuizResult<()> {
    let player = quiz
        .answers
        .iter()
        .flat_map(|player| player.rows.iter().map(move |_| player))
        .nth(input.row)
        .ok_or(QuizError(
            StatusCode::NOT_FOUND,
            "That clue is unavailable.",
        ))?;
    let purchased = attempt.hints.entry(player.id).or_default();
    if purchased.contains(&input.kind) {
        return Ok(());
    }
    if attempt.finished
        || attempt
            .guesses
            .get(&player.id)
            .is_some_and(|&points| points > 0)
    {
        return Err(QuizError(
            StatusCode::CONFLICT,
            "Hints are only available for unguessed players while you are playing.",
        ));
    }
    if !can_buy_hint(player.points, purchased.len()) || input.kind.value(player).is_none() {
        return Err(QuizError(
            StatusCode::CONFLICT,
            "That hint is unavailable for this player.",
        ));
    }
    purchased.insert(input.kind);
    Ok(())
}

async fn buy_hint(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    input: web::Json<HintInput>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    change(
        &pool,
        &key,
        guest(&request)?,
        Change::Hint(input.into_inner()),
    )
    .await
}

async fn guess(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    input: web::Json<Guess>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    change(
        &pool,
        &key,
        guest(&request)?,
        Change::Guess(input.player_id),
    )
    .await
}

async fn finish(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    input: web::Json<Finish>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let name = input.display_name.as_deref().map(str::trim);
    if name.is_some_and(|name| {
        !(1..=32).contains(&name.chars().count()) || name.chars().any(char::is_control)
    }) {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Use 1–32 characters for your display name.",
        ));
    }
    change(&pool, &key, guest(&request)?, Change::Finish(name)).await
}

async fn change(
    pool: &PgPool,
    key: &str,
    guest: &str,
    action: Change<'_>,
) -> QuizResult<HttpResponse> {
    let (id, date) = quiz_key(key)?;
    let mut tx = pool.begin().await?;
    let quiz = sqlx::query_as::<_, Quiz>(PUBLISHED_QUIZ)
        .bind(id)
        .bind(date)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(QuizError(StatusCode::NOT_FOUND, "Quiz unavailable."))?;
    sqlx::query("INSERT INTO game_quiz_attempts (quiz_id, guest_id) VALUES ($1, $2::text::uuid) ON CONFLICT DO NOTHING")
        .bind(quiz.quiz_id).bind(guest).execute(&mut *tx).await?;
    let mut attempt = sqlx::query_as::<_, Attempt>(
        "SELECT guesses, hints, finished, display_name FROM game_quiz_attempts
         WHERE quiz_id = $1 AND guest_id = $2::text::uuid FOR UPDATE",
    )
    .bind(quiz.quiz_id)
    .bind(guest)
    .fetch_one(&mut *tx)
    .await?;
    match action {
        Change::Hint(input) => apply_hint(&quiz, &mut attempt, input)?,
        Change::Guess(player) => {
            if !attempt.guesses.contains_key(&player) {
                if attempt.finished {
                    return Err(QuizError(StatusCode::CONFLICT, "This attempt is finished."));
                }
                let answer = quiz.answers.iter().find(|answer| answer.id == player);
                if answer.is_none() {
                    let valid: bool = sqlx::query_scalar(
                        "SELECT EXISTS(SELECT 1 FROM players WHERE player_id = $1)",
                    )
                    .bind(player)
                    .fetch_one(&mut *tx)
                    .await?;
                    if !valid {
                        return Err(QuizError(
                            StatusCode::BAD_REQUEST,
                            "Choose a player from the suggestions.",
                        ));
                    }
                }
                attempt.guesses.insert(
                    player,
                    answer.map_or(-WRONG_GUESS_COST, |answer| answer.points),
                );
                attempt.finished = attempt
                    .guesses
                    .values()
                    .filter(|&&points| points > 0)
                    .count()
                    == quiz.answers.len();
            }
        }
        Change::Finish(name) => {
            if name.is_some() && !attempt.finished {
                return Err(QuizError(
                    StatusCode::CONFLICT,
                    "Finish the quiz before joining the leaderboard.",
                ));
            }
            attempt.finished = true;
            if attempt.display_name.is_none() {
                attempt.display_name = name.map(str::to_owned);
            }
        }
    }
    sqlx::query("UPDATE game_quiz_attempts SET guesses = $3, hints = $4, finished = $5, display_name = $6 WHERE quiz_id = $1 AND guest_id = $2::text::uuid")
        .bind(quiz.quiz_id).bind(guest).bind(Json(&attempt.guesses)).bind(Json(&attempt.hints)).bind(attempt.finished).bind(&attempt.display_name)
        .execute(&mut *tx).await?;
    tx.commit().await?;
    view(&quiz, &attempt, false)
}

#[derive(Serialize, sqlx::FromRow)]
struct Standing {
    rank: i64,
    total: i64,
    display_name: String,
    score: i64,
    yours: bool,
}

async fn leaderboard(
    pool: web::Data<PgPool>,
    key: web::Path<String>,
    request: HttpRequest,
) -> QuizResult<HttpResponse> {
    let guest = guest(&request)?;
    let (id, date) = quiz_key(&key)?;
    let quiz_id: i32 = sqlx::query_scalar(concat!(
        "SELECT q.quiz_id
         FROM game_quizzes q
         JOIN game_quiz_attempts a ON a.quiz_id = q.quiz_id
         WHERE (q.quiz_id = $1 OR (q.quiz_date = $2 AND q.day_slot = 1))
           AND q.quiz_date <= ",
        current_quiz_date_sql!(),
        "
           AND a.guest_id = $3::text::uuid AND a.finished",
    ))
    .bind(id)
    .bind(date)
    .bind(guest)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(QuizError(
        StatusCode::FORBIDDEN,
        "Finish the quiz to view the leaderboard.",
    ))?;

    let board: Vec<Standing> = sqlx::query_as(
        "WITH scores AS (
            SELECT a.display_name, a.guest_id,
                COALESCE((SELECT sum(value::integer) FROM jsonb_each_text(a.guesses)), 0)
                    - $3::bigint * COALESCE((SELECT sum(jsonb_array_length(value)) FROM jsonb_each(a.hints)), 0) AS score
            FROM game_quiz_attempts a
            WHERE a.quiz_id = $1 AND a.display_name IS NOT NULL
        ), ranked AS (
            SELECT display_name, score, guest_id = $2::text::uuid AS yours,
                rank() OVER (ORDER BY score DESC) AS rank,
                row_number() OVER (ORDER BY score DESC, guest_id) AS position,
                count(*) OVER () AS total
            FROM scores
        )
        SELECT rank, total, display_name, score, yours FROM ranked
        WHERE position <= 50 OR yours ORDER BY position",
    )
    .bind(quiz_id)
    .bind(guest)
    .bind(i64::from(HINT_COST))
    .fetch_all(pool.as_ref())
    .await?;
    Ok(ok(board))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::body::to_bytes;

    #[actix_web::test]
    async fn paid_hints_are_masked_idempotent_and_capped_per_player() {
        let player = |id, points| RatedPlayer {
            id,
            points,
            difficulty: 2.0,
            difficulty_override: None,
            rows: vec![json!({"player_id":id, "player_name":"Masked",
                "clubs_played_for":"10,20","country_of_citizenship":"England","country_code":"gb-eng","sub_position":"CF"})],
        };
        let quiz = Quiz {
            quiz_id: 1,
            quiz_date: NaiveDate::from_ymd_opt(2026, 11, 23).unwrap(),
            question: "Who qualifies?".into(),
            search_params: "scope=o".into(),
            answers: Json(vec![player(1, 16), player(2, 7)]),
        };
        let mut attempt = Attempt::default();
        let buy =
            |attempt: &mut Attempt, row, kind| apply_hint(&quiz, attempt, HintInput { row, kind });
        buy(&mut attempt, 0, HintKind::Clubs).unwrap();
        buy(&mut attempt, 0, HintKind::Clubs).unwrap();
        assert_eq!(attempt_score(&attempt), -5);

        let bytes = to_bytes(view(&quiz, &attempt, false).unwrap().into_body())
            .await
            .unwrap();
        let payload: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(payload["rows"][0]["hints"], json!({"clubs":[10,20]}));
        assert_eq!(
            payload["rows"][0]["available_hints"],
            json!(["nationality", "position"])
        );
        assert!(payload["rows"][0]["player"].is_null());
        assert!(payload["rows"][0].get("result").is_none());
        assert!(payload["rows"][1].get("hints").is_none());

        buy(&mut attempt, 0, HintKind::Nationality).unwrap();
        buy(&mut attempt, 0, HintKind::Position).unwrap();
        assert_eq!(attempt_score(&attempt), -15);
        let bytes = to_bytes(view(&quiz, &attempt, false).unwrap().into_body())
            .await
            .unwrap();
        let payload: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(
            payload["rows"][0]["hints"]["nationality"],
            json!({"code":"gb-eng", "name":"England"})
        );
        assert!(payload["rows"][0]["player"].is_null());
        attempt.guesses.insert(1, 16);
        assert_eq!(attempt_score(&attempt), 1);
        buy(&mut attempt, 1, HintKind::Nationality).unwrap();
        assert!(buy(&mut attempt, 1, HintKind::Position).is_err());
        assert_eq!(attempt_score(&attempt), -4);
        attempt.finished = true;
        assert!(buy(&mut attempt, 1, HintKind::Clubs).is_err());

        for reveal_answers in [false, true] {
            let bytes = to_bytes(view(&quiz, &attempt, reveal_answers).unwrap().into_body())
                .await
                .unwrap();
            let payload: Value = serde_json::from_slice(&bytes).unwrap();
            assert_eq!(
                payload["rows"][0]["purchased_hints"],
                json!(["clubs", "nationality", "position"]),
            );
            assert!(payload["rows"][0].get("hints").is_none());
            if reveal_answers {
                assert_eq!(
                    payload["rows"][1]["purchased_hints"],
                    json!(["nationality"])
                );
            } else {
                assert!(payload["rows"][1].get("purchased_hints").is_none());
                assert!(payload["rows"][1]["player"].is_null());
            }
        }
    }

    #[actix_web::test]
    async fn view_exposes_saved_details_only_for_revealed_players() {
        let quiz = Quiz {
            quiz_id: 14,
            quiz_date: NaiveDate::from_ymd_opt(2026, 11, 23).unwrap(),
            question: "Which players qualify?".into(),
            search_params: "scope=s&sort=g&names=Hidden".into(),
            answers: Json(vec![
                RatedPlayer {
                    id: 1,
                    difficulty: 0.75,
                    difficulty_override: None,
                    points: 1,
                    rows: vec![
                        json!({"player_id":1,"player_name":"Revealed","season":2025,"qualifying_game_ids":[10]}),
                    ],
                },
                RatedPlayer {
                    id: 2,
                    difficulty: 2.5,
                    difficulty_override: None,
                    points: 2,
                    rows: vec![
                        json!({"player_id":2,"player_name":"Hidden","season":2025,"clubs_played_for":"123","image_url":"https://example.com/hidden.png","qualifying_game_ids":[20]}),
                    ],
                },
            ]),
        };
        let attempt = Attempt {
            guesses: BTreeMap::from([(1, 1), (3, -3)]),
            ..Attempt::default()
        };
        let bytes = to_bytes(view(&quiz, &attempt, false).unwrap().into_body())
            .await
            .unwrap();
        let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(
            value["rows"][0]["result"]["qualifying_game_ids"],
            json!([10])
        );
        assert_eq!(value["rows"][0]["row_index"], 0);
        assert_eq!(value["score"], -2);
        assert_eq!(value["max_score"], 3);
        assert_eq!(value["wrong_guess_penalty"], 10);
        assert!(value["rows"][1].get("result").is_none());
        assert!(value["rows"][1].get("row_index").is_none());
        assert_eq!(value["rows"][1]["player"], serde_json::Value::Null);
        assert_eq!(value["rows"][1]["stats"], json!({"season":2025}));
        assert_eq!(value["detail_context"], "scope=s&sort=g");
        assert!(!String::from_utf8_lossy(&bytes).contains("Hidden"));
        assert_eq!(value["answers_revealed"], false);
        assert_eq!(
            view(&quiz, &attempt, true).unwrap_err().0,
            StatusCode::CONFLICT
        );

        let finished = Attempt {
            finished: true,
            ..attempt
        };
        for reveal in [false, true] {
            let response = view(&quiz, &finished, reveal).unwrap();
            let bytes = to_bytes(response.into_body()).await.unwrap();
            let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
            assert_eq!(value["answers_revealed"], reveal);
            assert_eq!(value["score"], -2);
            assert_eq!(value["found"], 1);
            if reveal {
                assert_eq!(value["rows"][0]["found"], true);
                assert_eq!(value["rows"][1]["found"], false);
                assert_eq!(value["rows"][1]["player"], "Hidden");
            } else {
                assert!(value["rows"][1].get("found").is_none());
                assert!(value["rows"][1]["player"].is_null());
            }
        }
    }
}
