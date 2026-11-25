use super::{QuizError, QuizResult, ok, play::guest};
use crate::{
    competitions::CompetitionType,
    countries::Country,
    services::player::{
        models::SearchParams,
        search_details::{
            DetailRequest, DetailStats, load_saved_game_details, load_search_details,
        },
    },
};
use actix_web::{HttpRequest, HttpResponse, http::StatusCode, web};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{PgPool, types::Json};
use std::collections::{BTreeMap, BTreeSet};

const CLUE_INTERVAL_MS: i64 = 10_000;
const UNAVAILABLE: QuizError = QuizError(StatusCode::NOT_FOUND, "Quiz unavailable.");
const START_REQUIRED: QuizError = QuizError(StatusCode::CONFLICT, "Start the quiz first.");
const SOLVE_REQUIRED: QuizError =
    QuizError(StatusCode::CONFLICT, "Guess the player to finish the quiz.");

pub(super) fn configure(config: &mut web::ServiceConfig) {
    config.service(
        web::scope("/career")
            .route("/today", web::get().to(today))
            .route("/archive", web::get().to(archive))
            .route("/{id}", web::get().to(status))
            .route("/{id}/start", web::post().to(start))
            .route("/{id}/guess", web::post().to(guess))
            .route("/{id}/seasons/{season}", web::get().to(season_details))
            .route("/{id}/leaderboard", web::get().to(leaderboard))
            .route("/{id}/leaderboard", web::post().to(join_leaderboard)),
    );
}

#[derive(Deserialize)]
pub(super) struct ScheduleInput {
    player_id: i32,
    date: NaiveDate,
}

#[derive(sqlx::FromRow)]
struct Player {
    name: String,
    date_of_birth: NaiveDate,
    height_cm: i32,
    nationality: Option<String>,
    position: Option<String>,
}

#[derive(Default, Serialize)]
struct SeasonSummary {
    season: i32,
    clubs: BTreeSet<i32>,
    stats: DetailStats,
}

#[derive(Default)]
struct SeasonSnapshot {
    summary: SeasonSummary,
    game_ids: Vec<i32>,
}

fn eligible_competition(competition: (CompetitionType, &str)) -> bool {
    let (kind, code) = competition;
    kind == CompetitionType::League || matches!(code, "CL" | "EL" | "UCOL" | "USC")
}

pub(super) async fn schedule(pool: &PgPool, input: ScheduleInput) -> QuizResult<HttpResponse> {
    let player = sqlx::query_as::<_, Player>(
        "SELECT COALESCE(NULLIF(trim(concat_ws(' ', first_name, last_name)), ''), name) AS name,
                date_of_birth, height_in_cm AS height_cm, country_of_citizenship AS nationality,
                COALESCE(NULLIF(NULLIF(NULLIF(trim(sub_position), ''), 'Missing'), 'Unknown'),
                         NULLIF(NULLIF(NULLIF(trim(\"position\"), ''), 'Missing'), 'Unknown')) AS position
         FROM players WHERE player_id = $1 AND date_of_birth IS NOT NULL AND height_in_cm > 0
           AND COALESCE(NULLIF(trim(concat_ws(' ', first_name, last_name)), ''), NULLIF(name, '')) IS NOT NULL",
    )
    .bind(input.player_id)
    .fetch_optional(pool)
    .await?
    .ok_or(QuizError(
        StatusCode::BAD_REQUEST,
        "Choose a player with a date of birth and height.",
    ))?;
    let games = load_search_details(
        pool,
        input.player_id,
        &DetailRequest {
            search: SearchParams::default(),
            qualifying_game_ids: Vec::new(),
            qualifying_seasons: Vec::new(),
            result_season: None,
        },
    )
    .await?;
    let mut seasons = BTreeMap::<i32, SeasonSnapshot>::new();
    for game in games {
        let season = game.appearance.season();
        if season <= 0
            || !game.matches_filters
            || !eligible_competition(game.appearance.competition())
        {
            continue;
        }
        let entry = seasons.entry(season).or_default();
        entry.summary.season = season;
        let club_id = game.appearance.club_id();
        if club_id > 0 {
            entry.summary.clubs.insert(club_id);
        }
        let total = &mut entry.summary.stats;
        total.appearances += game.stats.appearances;
        total.minutes += game.stats.minutes;
        total.goals += game.stats.goals;
        total.assists += game.stats.assists;
        total.yellows += game.stats.yellows;
        total.reds += game.stats.reds;
        entry.game_ids.push(game.appearance.game_id());
    }
    if seasons.is_empty() {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Choose a player with domestic league or European competition appearances.",
        ));
    }
    let eligible: Vec<_> = seasons.keys().copied().collect();
    let reveal_order: Vec<i32> = sqlx::query_scalar(
        "SELECT season FROM unnest($1::integer[]) AS s(season) ORDER BY random()",
    )
    .bind(&eligible)
    .fetch_all(pool)
    .await?;
    let country = Country::from_str(player.nationality.as_deref().unwrap_or_default());
    let known_country = !country.code().is_empty();
    let personal_clues = usize::from(known_country) + usize::from(player.position.is_some());
    let timed_steps = eligible.len().saturating_sub(1).max(personal_clues) as i32;
    let mut personal_steps = sqlx::query_scalar::<_, i32>(
        "SELECT step FROM generate_series(1, $1) AS steps(step) ORDER BY random() LIMIT $2",
    )
    .bind(timed_steps)
    .bind(personal_clues as i64)
    .fetch_all(pool)
    .await?
    .into_iter();
    let nationality_step = if known_country {
        personal_steps.next()
    } else {
        None
    };
    let position_step = if player.position.is_some() {
        personal_steps.next()
    } else {
        None
    };
    let mut tx = pool.begin().await?;
    let id: i32 = sqlx::query_scalar(concat!(
        "INSERT INTO game_career_quizzes
            (quiz_date, day_slot, player_id, player_name, date_of_birth, height_cm, country_code,
             country_name, position, nationality_reveal_step, position_reveal_step)
         SELECT $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10 WHERE $1 >= ",
        current_quiz_date_sql!(),
        " ON CONFLICT (quiz_date, day_slot) DO UPDATE SET
            player_id = EXCLUDED.player_id, player_name = EXCLUDED.player_name,
            date_of_birth = EXCLUDED.date_of_birth, height_cm = EXCLUDED.height_cm,
            country_code = EXCLUDED.country_code, country_name = EXCLUDED.country_name,
            position = EXCLUDED.position, nationality_reveal_step = EXCLUDED.nationality_reveal_step,
            position_reveal_step = EXCLUDED.position_reveal_step
         WHERE NOT EXISTS (SELECT FROM game_career_seasons s WHERE s.quiz_id = game_career_quizzes.quiz_id)
           AND NOT EXISTS (SELECT FROM game_career_attempts a WHERE a.quiz_id = game_career_quizzes.quiz_id)
         RETURNING quiz_id",
    ))
    .bind(input.date)
    .bind(input.player_id)
    .bind(&player.name)
    .bind(player.date_of_birth)
    .bind(player.height_cm)
    .bind(known_country.then(|| country.code()))
    .bind(known_country.then(|| country.as_str()))
    .bind(&player.position)
    .bind(nationality_step)
    .bind(position_step)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(QuizError(StatusCode::CONFLICT, "That date is unavailable."))?;
    for (index, season) in reveal_order.into_iter().enumerate() {
        let mut snapshot = seasons
            .remove(&season)
            .expect("reveal order comes from the saved season keys");
        snapshot.game_ids.sort_unstable();
        snapshot.game_ids.dedup();
        sqlx::query(
            "INSERT INTO game_career_seasons (quiz_id, season, reveal_order, summary, game_ids)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(id)
        .bind(season)
        .bind((index + 1) as i32)
        .bind(Json(&snapshot.summary))
        .bind(&snapshot.game_ids)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(ok(json!({"date": input.date, "player": player.name})))
}

#[derive(sqlx::FromRow)]
struct Round {
    id: i32,
    player_id: i32,
    date: NaiveDate,
    name: String,
    date_of_birth: NaiveDate,
    height_cm: i32,
    country_code: Option<String>,
    country_name: Option<String>,
    position: Option<String>,
    nationality_reveal_step: Option<i32>,
    position_reveal_step: Option<i32>,
    elapsed_ms: Option<i64>,
    completed: bool,
    display_name: Option<String>,
    season_count: i64,
}

impl Round {
    fn visible_seasons(&self) -> i64 {
        if self.completed {
            return self.season_count;
        }
        self.elapsed_ms
            .map_or(0, |elapsed| elapsed.max(0) / CLUE_INTERVAL_MS + 1)
            .min(self.season_count)
    }

    fn clue_visible(&self, step: Option<i32>) -> bool {
        self.completed
            || self
                .elapsed_ms
                .zip(step)
                .is_some_and(|(elapsed, step)| elapsed >= i64::from(step) * CLUE_INTERVAL_MS)
    }

    fn next_reveal(&self) -> Option<i64> {
        let elapsed = self.elapsed_ms?;
        if self.completed {
            return None;
        }
        let visible = self.visible_seasons();
        (visible < self.season_count)
            .then_some(visible * CLUE_INTERVAL_MS)
            .into_iter()
            .chain(
                [self.nationality_reveal_step, self.position_reveal_step]
                    .into_iter()
                    .flatten()
                    .map(|step| i64::from(step) * CLUE_INTERVAL_MS)
                    .filter(|&time| time > elapsed),
            )
            .min()
    }
}

async fn load_round(pool: &PgPool, guest: &str, id: Option<i32>) -> QuizResult<Option<Round>> {
    Ok(sqlx::query_as::<_, Round>(concat!(
        "SELECT q.quiz_id AS id, q.player_id, q.quiz_date AS date, q.player_name AS name,
                q.date_of_birth, q.height_cm, q.country_code, q.country_name, q.position,
                q.nationality_reveal_step, q.position_reveal_step,
                floor(EXTRACT(EPOCH FROM (COALESCE(a.completed_at, statement_timestamp()) - a.started_at))
                      * 1000)::bigint AS elapsed_ms,
                a.completed_at IS NOT NULL AS completed, a.display_name,
                (SELECT count(*) FROM game_career_seasons WHERE quiz_id = q.quiz_id) AS season_count
         FROM game_career_quizzes q
         LEFT JOIN game_career_attempts a ON a.quiz_id = q.quiz_id AND a.guest_id = $1::text::uuid
         WHERE (q.quiz_id = $2 OR ($2 IS NULL AND q.day_slot = 1 AND q.quiz_date = ",
        current_quiz_date_sql!(),
        ")) AND q.quiz_date <= ",
        current_quiz_date_sql!(),
    ))
    .bind(guest)
    .bind(id)
    .fetch_optional(pool)
    .await?)
}

async fn view(pool: &PgPool, round: Round, correct: Option<bool>) -> QuizResult<HttpResponse> {
    let started = round.elapsed_ms.is_some();
    let seasons: Vec<Option<Json<Value>>> = if started {
        sqlx::query_scalar(
            "SELECT CASE WHEN row_number() OVER (ORDER BY reveal_order) <= $2 THEN summary END
             FROM game_career_seasons WHERE quiz_id = $1 ORDER BY season DESC",
        )
        .bind(round.id)
        .bind(round.visible_seasons())
        .fetch_all(pool)
        .await?
    } else {
        Vec::new()
    };
    let nationality = if round.clue_visible(round.nationality_reveal_step) {
        round
            .country_code
            .as_ref()
            .zip(round.country_name.as_ref())
            .map(|(code, name)| json!({"code": code, "name": name}))
    } else {
        None
    };
    Ok(ok(json!({
        "id": round.id,
        "date": round.date,
        "elapsed_ms": round.elapsed_ms,
        "finished": round.completed,
        "next_reveal_ms": round.next_reveal(),
        "date_of_birth": started.then_some(round.date_of_birth),
        "height_cm": started.then_some(round.height_cm),
        "nationality": nationality,
        "position": round.position.as_ref().filter(|_| round.clue_visible(round.position_reveal_step)),
        "seasons": seasons,
        "answer": round.completed.then_some(&round.name),
        "display_name": round.display_name,
        "correct": correct,
    })))
}

async fn archive(pool: web::Data<PgPool>, request: HttpRequest) -> QuizResult<HttpResponse> {
    let entries: Vec<(NaiveDate, i32, i32, bool)> = sqlx::query_as(concat!(
        "SELECT q.quiz_date, q.quiz_id, q.day_slot, a.completed_at IS NOT NULL AS completed
         FROM game_career_quizzes q
         LEFT JOIN game_career_attempts a ON a.quiz_id = q.quiz_id AND a.guest_id = $1::text::uuid
         WHERE q.quiz_date < ",
        current_quiz_date_sql!(),
        " AND EXISTS (SELECT FROM game_career_seasons s WHERE s.quiz_id = q.quiz_id)
          ORDER BY q.quiz_date DESC, q.day_slot LIMIT 365",
    ))
    .bind(guest(&request).ok())
    .fetch_all(pool.as_ref())
    .await?;
    Ok(ok(entries))
}

async fn today(pool: web::Data<PgPool>, request: HttpRequest) -> QuizResult<HttpResponse> {
    match load_round(&pool, guest(&request)?, None).await? {
        Some(round) if round.season_count > 0 || round.elapsed_ms.is_some() => {
            view(&pool, round, None).await
        }
        _ => Ok(ok(Value::Null)),
    }
}

async fn status(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    id: web::Path<i32>,
) -> QuizResult<HttpResponse> {
    view(
        &pool,
        load_round(&pool, guest(&request)?, Some(id.into_inner()))
            .await?
            .ok_or(UNAVAILABLE)?,
        None,
    )
    .await
}

async fn start(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    id: web::Path<i32>,
) -> QuizResult<HttpResponse> {
    let id = id.into_inner();
    let guest = guest(&request)?;
    sqlx::query(concat!(
        "INSERT INTO game_career_attempts (quiz_id, guest_id)
         SELECT quiz_id, $2::text::uuid FROM game_career_quizzes WHERE quiz_id = $1 AND quiz_date <= ",
        current_quiz_date_sql!(),
        " AND EXISTS (SELECT FROM game_career_seasons s WHERE s.quiz_id = $1)
         ON CONFLICT (quiz_id, guest_id) DO NOTHING",
    ))
    .bind(id)
    .bind(guest)
    .execute(pool.as_ref())
    .await?;
    view(
        &pool,
        load_round(&pool, guest, Some(id))
            .await?
            .ok_or(UNAVAILABLE)?,
        None,
    )
    .await
}

#[derive(Deserialize)]
struct GuessInput {
    player_id: i32,
}

async fn guess(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    id: web::Path<i32>,
    input: web::Json<GuessInput>,
) -> QuizResult<HttpResponse> {
    let id = id.into_inner();
    let guest = guest(&request)?;
    let accepted = sqlx::query(concat!(
        "UPDATE game_career_attempts a SET completed_at = clock_timestamp()
         FROM game_career_quizzes q
         WHERE a.quiz_id = q.quiz_id AND a.quiz_id = $1 AND a.guest_id = $2::text::uuid
           AND a.completed_at IS NULL AND q.player_id = $3 AND q.quiz_date <= ",
        current_quiz_date_sql!(),
    ))
    .bind(id)
    .bind(guest)
    .bind(input.player_id)
    .execute(pool.as_ref())
    .await?
    .rows_affected()
        > 0;
    let round = load_round(&pool, guest, Some(id))
        .await?
        .ok_or(UNAVAILABLE)?;
    if round.elapsed_ms.is_none() {
        return Err(START_REQUIRED);
    }
    let correct = (accepted || !round.completed).then_some(accepted);
    view(&pool, round, correct).await
}

async fn season_details(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    path: web::Path<(i32, i32)>,
) -> QuizResult<HttpResponse> {
    let (id, season) = path.into_inner();
    let round = load_round(&pool, guest(&request)?, Some(id))
        .await?
        .ok_or(UNAVAILABLE)?;
    let game_ids: Vec<i32> = sqlx::query_scalar(
        "SELECT game_ids FROM game_career_seasons
         WHERE quiz_id = $1 AND season = $2 AND season IN (
             SELECT season FROM game_career_seasons WHERE quiz_id = $1 ORDER BY reveal_order LIMIT $3
         )",
    )
    .bind(id)
    .bind(season)
    .bind(round.visible_seasons())
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or(QuizError(
        StatusCode::NOT_FOUND,
        "That season is still hidden.",
    ))?;
    Ok(ok(load_saved_game_details(
        &pool,
        round.player_id,
        game_ids,
    )
    .await?))
}

#[derive(Serialize, sqlx::FromRow)]
struct Standing {
    rank: i64,
    display_name: String,
    elapsed_ms: i64,
    yours: bool,
}

async fn leaderboard(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    id: web::Path<i32>,
) -> QuizResult<HttpResponse> {
    let id = id.into_inner();
    let guest = guest(&request)?;
    let round = load_round(&pool, guest, Some(id))
        .await?
        .ok_or(UNAVAILABLE)?;
    if !round.completed {
        return Err(SOLVE_REQUIRED);
    }
    let standings = sqlx::query_as::<_, Standing>(
        "WITH entries AS (
             SELECT guest_id, display_name,
                    floor(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::bigint AS elapsed_ms
             FROM game_career_attempts WHERE quiz_id = $1 AND display_name IS NOT NULL
         ), ranked AS (
             SELECT rank() OVER (ORDER BY elapsed_ms) AS rank, display_name, elapsed_ms,
                    guest_id = $2::text::uuid AS yours, guest_id
             FROM entries
         )
         SELECT rank, display_name, elapsed_ms, yours FROM ranked
         WHERE rank <= 50 OR yours ORDER BY rank, guest_id",
    )
    .bind(id)
    .bind(guest)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(ok(standings))
}

#[derive(Deserialize)]
struct NameInput {
    display_name: String,
}

async fn join_leaderboard(
    pool: web::Data<PgPool>,
    request: HttpRequest,
    id: web::Path<i32>,
    input: web::Json<NameInput>,
) -> QuizResult<HttpResponse> {
    let name = input.display_name.trim();
    if !(1..=32).contains(&name.chars().count()) {
        return Err(QuizError(
            StatusCode::BAD_REQUEST,
            "Enter a name of 1 to 32 characters.",
        ));
    }
    let id = id.into_inner();
    let guest = guest(&request)?;
    let updated = sqlx::query(concat!(
        "UPDATE game_career_attempts a SET display_name = COALESCE(a.display_name, $3)
         FROM game_career_quizzes q WHERE q.quiz_id = a.quiz_id AND a.quiz_id = $1
           AND a.guest_id = $2::text::uuid AND a.completed_at IS NOT NULL AND q.quiz_date <= ",
        current_quiz_date_sql!(),
    ))
    .bind(id)
    .bind(guest)
    .bind(name)
    .execute(pool.as_ref())
    .await?;
    if updated.rows_affected() == 0 {
        return Err(SOLVE_REQUIRED);
    }
    view(
        &pool,
        load_round(&pool, guest, Some(id))
            .await?
            .ok_or(UNAVAILABLE)?,
        None,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn competition_rules_exclude_domestic_cups_world_cups_and_qualifiers() {
        assert!(eligible_competition((CompetitionType::League, "GB1")));
        assert!(eligible_competition((CompetitionType::Europe, "CL")));
        assert!(eligible_competition((CompetitionType::Europe, "EL")));
        assert!(eligible_competition((CompetitionType::Europe, "UCOL")));
        assert!(eligible_competition((CompetitionType::Europe, "USC")));
        assert!(!eligible_competition((CompetitionType::DomesticCup, "FAC")));
        for code in ["KLUB", "CLQ", "ELQ", "ECLQ"] {
            assert!(!eligible_competition((CompetitionType::Europe, code)));
        }
    }

    #[test]
    fn seasons_unlock_in_order_and_stop_at_the_saved_count() {
        let mut round = Round {
            id: 1,
            player_id: 42,
            date: NaiveDate::from_ymd_opt(2026, 11, 24).unwrap(),
            name: "Example Player".into(),
            date_of_birth: NaiveDate::from_ymd_opt(1994, 1, 12).unwrap(),
            height_cm: 182,
            country_code: Some("gb-eng".into()),
            country_name: Some("England".into()),
            position: Some("Centre-Forward".into()),
            nationality_reveal_step: Some(2),
            position_reveal_step: Some(1),
            elapsed_ms: None,
            completed: false,
            display_name: None,
            season_count: 2,
        };
        assert_eq!(round.visible_seasons(), 0);
        assert_eq!(round.next_reveal(), None);
        round.elapsed_ms = Some(0);
        assert_eq!(round.visible_seasons(), 1);
        assert!(!round.clue_visible(round.nationality_reveal_step));
        assert!(!round.clue_visible(round.position_reveal_step));
        assert_eq!(round.next_reveal(), Some(10_000));
        round.elapsed_ms = Some(10_000);
        assert_eq!(round.visible_seasons(), 2);
        assert!(round.clue_visible(round.position_reveal_step));
        assert!(!round.clue_visible(round.nationality_reveal_step));
        assert_eq!(round.next_reveal(), Some(20_000));
        round.elapsed_ms = Some(20_000);
        assert_eq!(round.visible_seasons(), 2);
        assert!(round.clue_visible(round.nationality_reveal_step));
        assert_eq!(round.next_reveal(), None);
        round.elapsed_ms = Some(1_000);
        round.completed = true;
        assert_eq!(round.visible_seasons(), 2);
        assert!(round.clue_visible(round.nationality_reveal_step));
        assert_eq!(round.next_reveal(), None);
    }
}
