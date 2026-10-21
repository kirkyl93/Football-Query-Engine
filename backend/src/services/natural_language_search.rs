use std::time::Duration;

use actix_web::{error, post, web, HttpResponse, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::competitions::Competition;
use crate::countries::Country;
use crate::services::player::models::{
    HomeAwayOption, PenaltyOption, SortOption, StatScope,
};
use crate::services::player::player_enums::PlayerSubPosition;

const SYSTEM_PROMPT: &str = include_str!("../prompts/natural_language_search.md");

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TranslateSearchRequest {
    query: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterProposal {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seasons: Option<Vec<i32>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub competitions: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub positions: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minute_from: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minute_to: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_age: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_age: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_height: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_height: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player_names: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub penalties: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub home_or_away: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stat_scope: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub countries: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_appearances: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_goals: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum_goals: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_assists: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum_assists: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_goals_and_assists: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum_goals_and_assists: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateSearchResponse {
    pub summary: String,
    pub needs_more_info: bool,
    pub clarification_question: Option<String>,
    pub error_code: Option<String>,
    pub filters: FilterProposal,
}

/// The classified result of a model reply that passed parsing and validation.
#[derive(Debug)]
pub enum Outcome {
    Ok(TranslateSearchResponse),
    NeedsClarification(TranslateSearchResponse),
    Unsupported {
        error_code: String,
        response: TranslateSearchResponse,
    },
}

impl Outcome {
    /// Maps the outcome onto the current HTTP contract. When the response
    /// envelope is unified, this is the only function that changes.
    fn into_http(self) -> HttpResponse {
        match self {
            Outcome::Ok(r) | Outcome::NeedsClarification(r) => {
                HttpResponse::Ok().json(r)
            }
            Outcome::Unsupported { error_code, response } => {
                HttpResponse::UnprocessableEntity().json(json!({
                    "error": error_code,
                    "message": response.summary,
                    "filters": response.filters
                }))
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatCompletionChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoice {
    message: ChatCompletionMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionMessage {
    content: Option<String>,
}

struct LlmConfig {
    url: String,
    key: String,
    model: String,
}

impl LlmConfig {
    fn from_env() -> Result<Self> {
        let var = |name: &str, message: &'static str| {
            std::env::var(name)
                .map_err(|_| error::ErrorInternalServerError(message))
        };

        Ok(Self {
            url: var("LLM_API_URL", "LLM URL is not configured")?,
            key: var("LLM_API_KEY", "LLM API key is not configured")?,
            model: var("LLM_MODEL", "LLM model is not configured")?,
        })
    }
}

/// One provider round trip. Returns the raw model text, or an HTTP-ready error
/// for transport failures, non-2xx statuses, empty replies and truncation.
async fn call_llm(
    client: &Client,
    cfg: &LlmConfig,
    messages: &[Value],
) -> Result<String> {
    let response = client
        .post(&cfg.url)
        .timeout(Duration::from_secs(30))
        .bearer_auth(&cfg.key)
        .json(&json!({
            "model": cfg.model,
            "messages": messages,
            "temperature": 0,
            "max_completion_tokens": 1000,
            "reasoning_effort": "low",
            "response_format": { "type": "json_object" }
        }))
        .send()
        .await
        .map_err(|err| {
            log::error!("Search translation provider request failed: {}", err);
            error::ErrorBadGateway("Search translation service is unavailable")
        })?;

    if !response.status().is_success() {
        let status = response.status();
        log::error!(
            "Search translation provider returned HTTP status {}",
            status
        );

        if status.as_u16() == 429 {
            return Err(error::ErrorServiceUnavailable(
                "Search translation is temporarily rate limited",
            ));
        }

        return Err(error::ErrorBadGateway(
            "Could not translate the search query",
        ));
    }

    let completion: ChatCompletionResponse =
        response.json().await.map_err(|err| {
            log::error!("Invalid search translation provider response: {}", err);
            error::ErrorBadGateway(
                "Invalid response from search translation service",
            )
        })?;

    let choice = completion.choices.into_iter().next().ok_or_else(|| {
        error::ErrorBadGateway("Search translation returned no result")
    })?;

    if choice.finish_reason.as_deref() == Some("length") {
        log::error!(
            "Search translation was truncated; consider raising max_completion_tokens"
        );
        return Err(error::ErrorBadGateway(
            "Search translation was truncated",
        ));
    }

    choice.message.content.ok_or_else(|| {
        error::ErrorBadGateway("Search translation returned no result")
    })
}

#[post("/natural-language-search")]
pub async fn translate_search(
    request: web::Json<TranslateSearchRequest>,
    client: web::Data<Client>,
) -> Result<HttpResponse> {
    let query = request.query.trim();

    if query.is_empty() || query.chars().count() > 500 {
        return Err(error::ErrorBadRequest(
            "Query must contain between 1 and 500 characters",
        ));
    }

    let cfg = LlmConfig::from_env()?;
    let mut messages = initial_messages(query);

    for attempt in 1..=MAX_ATTEMPTS {
        // Transport, rate-limit and truncation errors are not retried here:
        // feeding validation feedback back would not fix them
        let raw = call_llm(&client, &cfg, &messages).await?;

        match interpret(&raw) {
            Ok(outcome) => return Ok(outcome.into_http()),
            Err(reason) => {
                if attempt == MAX_ATTEMPTS {
                    log::error!(
                        "Search translation rejected after {attempt} attempts: {reason}"
                    );
                    break;
                }

                log::warn!(
                    "Search translation rejected (attempt {attempt}), retrying: {reason}"
                );
                append_retry_feedback(&mut messages, &raw, &reason);
            }
        }
    }

    Err(error::ErrorBadGateway(
        "Search translation returned an invalid result",
    ))
}

/// Total provider calls per request: the first try plus one retry.
const MAX_ATTEMPTS: usize = 2;

const MAX_FEEDBACK_REASON_CHARS: usize = 300;

fn initial_messages(query: &str) -> Vec<Value> {
    vec![
        json!({ "role": "system", "content": SYSTEM_PROMPT }),
        json!({ "role": "user", "content": query }),
    ]
}

/// Appends the rejected reply and the validation error so the model can
/// correct itself. The system prompt and original query stay untouched at the
/// front, which keeps the prefix cache-friendly.
fn append_retry_feedback(messages: &mut Vec<Value>, raw: &str, reason: &str) {
    let reason: String = reason.chars().take(MAX_FEEDBACK_REASON_CHARS).collect();

    messages.push(json!({ "role": "assistant", "content": raw }));
    messages.push(json!({
        "role": "user",
        "content": format!(
            "That output was rejected: {reason}. Return the corrected JSON object only, \
             following all of the original rules."
        )
    }));
}

/// Parses, normalizes, validates and classifies a raw model reply.
///
/// The `Err` string describes what was wrong with the reply. It is only logged
/// today; the retry step will feed it back to the model.
pub fn interpret(raw: &str) -> std::result::Result<Outcome, String> {
    let mut result: TranslateSearchResponse = serde_json::from_str(raw)
        .map_err(|err| format!("response was not valid JSON for the schema: {err}"))?;

    let summary = result.summary.trim();
    if summary.is_empty() || summary.chars().count() > 500 {
        return Err("summary must be 1 to 500 characters".into());
    }
    result.summary = summary.to_string();

    normalize_country_codes(&mut result.filters);

    if let Some(error_code) = result.error_code.clone() {
        if !matches!(
            error_code.as_str(),
            "unsupported_competition" | "unsupported_filter"
        ) {
            return Err(format!("unknown errorCode '{error_code}'"));
        }

        if result.needs_more_info {
            return Err(
                "errorCode and needsMoreInfo must not both be set".into()
            );
        }

        // Supported filters retained alongside the error must still be valid.
        validate_filters(&result.filters)?;

        return Ok(Outcome::Unsupported {
            error_code,
            response: result,
        });
    }

    validate_filters(&result.filters)?;

    if result.needs_more_info {
        let question = result
            .clarification_question
            .as_deref()
            .map(str::trim)
            .filter(|q| !q.is_empty())
            .ok_or("needsMoreInfo is true but clarificationQuestion is missing")?;

        if question.chars().count() > 300 {
            return Err("clarificationQuestion is longer than 300 characters".into());
        }

        result.clarification_question = Some(question.to_string());
        return Ok(Outcome::NeedsClarification(result));
    }

    result.clarification_question = None;
    Ok(Outcome::Ok(result))
}
fn normalize_country_codes(filters: &mut FilterProposal) {
    if let Some(countries) = &mut filters.countries {
        for country in countries {
            *country = country.trim().to_ascii_lowercase();
        }
    }
}

fn validate_filters(filters: &FilterProposal) -> std::result::Result<(), String> {
    validate_range(filters.minute_from, filters.minute_to, 0, 120, "minute")?;
    validate_range(filters.min_age, filters.max_age, 15, 100, "age")?;
    validate_range(filters.min_height, filters.max_height, 100, 250, "height")?;
    validate_range(
        filters.minimum_goals,
        filters.maximum_goals,
        0,
        1000,
        "goals",
    )?;
    validate_range(
        filters.minimum_assists,
        filters.maximum_assists,
        0,
        1000,
        "assists",
    )?;
    validate_range(
        filters.minimum_goals_and_assists,
        filters.maximum_goals_and_assists,
        0,
        2000,
        "goals and assists",
    )?;

    if let Some(seasons) = &filters.seasons {
        if let Some(bad) = seasons.iter().find(|s| !(1992..=2025).contains(*s)) {
            return Err(format!("season {bad} is outside 1992..=2025"));
        }
    }

    if let Some(competitions) = &filters.competitions {
        if let Some(bad) = competitions.iter().find(|code| {
            Competition::from_code(code).competition_code() != code.as_str()
        }) {
            return Err(format!("unsupported competition code '{bad}'"));
        }
    }

    if let Some(positions) = &filters.positions {
        if let Some(bad) = positions.iter().find(|code| {
            PlayerSubPosition::from_code(code).as_code() != code.as_str()
        }) {
            return Err(format!("unsupported position code '{bad}'"));
        }
    }

    if let Some(penalties) = &filters.penalties {
        if PenaltyOption::from_code(penalties).as_code() != penalties.as_str() {
            return Err(format!("unsupported penalties value '{penalties}'"));
        }
    }

    if let Some(home_or_away) = &filters.home_or_away {
        if HomeAwayOption::from_code(home_or_away).as_code()
            != home_or_away.as_str()
        {
            return Err(format!("unsupported homeOrAway value '{home_or_away}'"));
        }
    }

    if let Some(stat_scope) = &filters.stat_scope {
        if StatScope::from_code(stat_scope).as_code() != stat_scope.as_str() {
            return Err(format!("unsupported statScope value '{stat_scope}'"));
        }
    }

    if let Some(sort_by) = &filters.sort_by {
        if SortOption::from_code(sort_by).as_code() != sort_by.as_str() {
            return Err(format!("unsupported sortBy value '{sort_by}'"));
        }
    }

    if let Some(countries) = &filters.countries {
        if let Some(bad) = countries.iter().find(|code| {
            let country = Country::from_code(code);
            country == Country::Missing || country.code() != code.as_str()
        }) {
            return Err(format!("unsupported country code '{bad}'"));
        }
    }

    let scope = filters.stat_scope.as_deref().unwrap_or("o");
    let sort = filters.sort_by.as_deref().unwrap_or("g");

    if (scope == "g" && !matches!(sort, "g" | "a" | "ga"))
        || (scope == "s" && sort == "sw")
    {
        return Err(format!(
            "sortBy '{sort}' is not compatible with statScope '{scope}'"
        ));
    }

    if let Some(names) = &filters.player_names {
        if names.len() > 10
            || names
            .iter()
            .any(|n| n.trim().is_empty() || n.chars().count() > 100)
        {
            return Err(
                "playerNames must have at most 10 non-empty names of at most 100 characters"
                    .into(),
            );
        }
    }

    if let Some(appearances) = filters.minimum_appearances {
        if !(0..=2000).contains(&appearances) {
            return Err(format!(
                "minimumAppearances {appearances} is outside 0..=2000"
            ));
        }
    }

    Ok(())
}

fn validate_range(
    minimum: Option<i32>,
    maximum: Option<i32>,
    allowed_minimum: i32,
    allowed_maximum: i32,
    field_name: &str,
) -> std::result::Result<(), String> {
    let allowed = allowed_minimum..=allowed_maximum;

    if [minimum, maximum]
        .into_iter()
        .flatten()
        .any(|value| !allowed.contains(&value))
    {
        return Err(format!(
            "{field_name} value is outside {allowed_minimum}..={allowed_maximum}"
        ));
    }

    if let (Some(minimum), Some(maximum)) = (minimum, maximum) {
        if minimum > maximum {
            return Err(format!("{field_name} range is inverted"));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_age_range() {
        assert!(validate_range(Some(20), Some(25), 15, 100, "age").is_ok());
    }

    #[test]
    fn rejects_inverted_age_range() {
        assert!(validate_range(Some(30), Some(20), 15, 100, "age").is_err());
    }

    #[test]
    fn rejects_out_of_range_minutes() {
        assert!(validate_range(Some(-1), Some(90), 0, 120, "minute").is_err());
        assert!(validate_range(Some(0), Some(121), 0, 120, "minute").is_err());
    }

    fn valid_filters() -> FilterProposal {
        FilterProposal {
            seasons: Some(vec![2020]),
            competitions: Some(vec!["GB1".into(), "CL".into()]),
            positions: Some(vec!["GK".into(), "LW".into()]),
            penalties: Some("ep".into()),
            home_or_away: Some("h".into()),
            stat_scope: Some("s".into()),
            sort_by: Some("mpg".into()),
            countries: Some(vec!["es".into(), "gb-eng".into(), "de".into()]),
            ..Default::default()
        }
    }

    #[test]
    fn accepts_valid_filter_codes() {
        assert!(validate_filters(&valid_filters()).is_ok());
    }

    #[test]
    fn rejects_display_name_as_position_code() {
        let mut f = valid_filters();
        f.positions = Some(vec!["Goalkeeper".into()]);
        assert!(validate_filters(&f).is_err());
    }

    #[test]
    fn rejects_invalid_sort_option() {
        let f = FilterProposal {
            sort_by: Some("not-a-sort".into()),
            ..Default::default()
        };
        assert!(validate_filters(&f).is_err());
    }

    #[test]
    fn season_bounds() {
        for (season, ok) in [(1991, false), (1992, true), (2025, true), (2026, false)] {
            let f = FilterProposal {
                seasons: Some(vec![season]),
                ..Default::default()
            };
            assert_eq!(validate_filters(&f).is_ok(), ok, "season {season}");
        }
    }

    #[test]
    fn normalizes_country_codes() {
        let mut f = valid_filters();
        f.countries = Some(vec![" ES ".into(), "GB-ENG".into()]);
        normalize_country_codes(&mut f);
        assert_eq!(f.countries, Some(vec!["es".to_string(), "gb-eng".to_string()]));
        assert!(validate_filters(&f).is_ok());
    }

    #[test]
    fn rejects_invalid_country_code() {
        for code in ["xx", "", "  "] {
            let mut f = valid_filters();
            f.countries = Some(vec![code.into()]);
            assert!(validate_filters(&f).is_err(), "code {code:?}");
        }
    }

    #[test]
    fn rejects_incompatible_scope_and_sort() {
        let mut f = valid_filters();

        f.stat_scope = Some("g".into());
        f.sort_by = Some("ap".into());
        assert!(validate_filters(&f).is_err());

        f.sort_by = Some("gw".into());
        assert!(validate_filters(&f).is_err());

        f.stat_scope = Some("s".into());
        f.sort_by = Some("sw".into());
        assert!(validate_filters(&f).is_err());
    }

    #[test]
    fn accepts_compatible_scope_and_sort() {
        let mut f = valid_filters();

        f.stat_scope = Some("g".into());
        f.sort_by = Some("ga".into());
        assert!(validate_filters(&f).is_ok());

        f.stat_scope = Some("s".into());
        f.sort_by = Some("gw".into());
        assert!(validate_filters(&f).is_ok());

        f.stat_scope = None;
        f.sort_by = Some("sw".into());
        assert!(validate_filters(&f).is_ok());
    }

    fn reply(overrides: serde_json::Value) -> String {
        let mut base = json!({
            "summary": "Premier League top scorers",
            "needsMoreInfo": false,
            "clarificationQuestion": null,
            "errorCode": null,
            "filters": { "competitions": ["GB1"], "sortBy": "g" }
        });
        for (k, v) in overrides.as_object().unwrap() {
            base[k] = v.clone();
        }
        base.to_string()
    }

    #[test]
    fn interpret_ok() {
        let out = interpret(&reply(json!({}))).unwrap();
        assert!(matches!(out, Outcome::Ok(_)));
    }

    #[test]
    fn interpret_clears_stray_clarification_on_ok() {
        let out = interpret(&reply(json!({ "clarificationQuestion": "leftover?" }))).unwrap();
        match out {
            Outcome::Ok(r) => assert!(r.clarification_question.is_none()),
            other => panic!("expected Ok, got {other:?}"),
        }
    }

    #[test]
    fn interpret_clarification() {
        let out = interpret(&reply(json!({
            "needsMoreInfo": true,
            "clarificationQuestion": "  Goals, assists or appearances?  "
        })))
            .unwrap();
        match out {
            Outcome::NeedsClarification(r) => assert_eq!(
                r.clarification_question.as_deref(),
                Some("Goals, assists or appearances?")
            ),
            other => panic!("expected NeedsClarification, got {other:?}"),
        }
    }

    #[test]
    fn interpret_clarification_requires_question() {
        assert!(interpret(&reply(json!({ "needsMoreInfo": true }))).is_err());
        assert!(interpret(&reply(json!({
            "needsMoreInfo": true,
            "clarificationQuestion": "   "
        })))
            .is_err());
    }

    #[test]
    fn interpret_rejects_overlong_clarification() {
        let long = "x".repeat(301);
        assert!(interpret(&reply(json!({
            "needsMoreInfo": true,
            "clarificationQuestion": long
        })))
            .is_err());
    }

    #[test]
    fn interpret_unsupported_keeps_filters() {
        let out = interpret(&reply(json!({
            "errorCode": "unsupported_competition",
            "summary": "Third tier is not supported",
            "filters": { "sortBy": "mpr", "minimumAppearances": 15 }
        })))
            .unwrap();
        match out {
            Outcome::Unsupported { error_code, response } => {
                assert_eq!(error_code, "unsupported_competition");
                assert_eq!(response.filters.minimum_appearances, Some(15));
            }
            other => panic!("expected Unsupported, got {other:?}"),
        }
    }

    #[test]
    fn interpret_rejects_unknown_error_code() {
        assert!(interpret(&reply(json!({ "errorCode": "whatever" }))).is_err());
    }

    #[test]
    fn interpret_rejects_error_with_clarification() {
        assert!(interpret(&reply(json!({
            "errorCode": "unsupported_filter",
            "needsMoreInfo": true,
            "clarificationQuestion": "Which?"
        })))
            .is_err());
    }

    #[test]
    fn interpret_validates_filters_alongside_error() {
        assert!(interpret(&reply(json!({
            "errorCode": "unsupported_filter",
            "filters": { "competitions": ["NOPE"] }
        })))
            .is_err());
    }

    #[test]
    fn interpret_rejects_bad_json_and_bad_summary() {
        assert!(interpret("not json").is_err());
        assert!(interpret(&reply(json!({ "summary": "   " }))).is_err());
        assert!(interpret(&reply(json!({ "summary": "x".repeat(501) }))).is_err());
    }

    #[test]
    fn interpret_normalizes_countries() {
        let out = interpret(&reply(json!({
            "filters": { "countries": [" GB-ENG "] }
        })))
            .unwrap();
        match out {
            Outcome::Ok(r) => {
                assert_eq!(r.filters.countries, Some(vec!["gb-eng".to_string()]))
            }
            other => panic!("expected Ok, got {other:?}"),
        }
    }

    #[test]
    fn initial_messages_are_system_then_user() {
        let m = initial_messages("top scorers");
        assert_eq!(m.len(), 2);
        assert_eq!(m[0]["role"], "system");
        assert_eq!(m[1]["role"], "user");
        assert_eq!(m[1]["content"], "top scorers");
    }

    #[test]
    fn retry_feedback_appends_reply_then_reason() {
        let mut m = initial_messages("q");
        append_retry_feedback(&mut m, "{\"bad\":1}", "unsupported competition code 'XYZ'");

        assert_eq!(m.len(), 4);
        // Prefix is untouched.
        assert_eq!(m[0]["role"], "system");
        assert_eq!(m[1]["content"], "q");
        // Rejected reply, then the feedback.
        assert_eq!(m[2]["role"], "assistant");
        assert_eq!(m[2]["content"], "{\"bad\":1}");
        assert_eq!(m[3]["role"], "user");
        assert!(m[3]["content"].as_str().unwrap().contains("'XYZ'"));
    }

    #[test]
    fn retry_feedback_truncates_long_reasons() {
        let mut m = initial_messages("q");
        append_retry_feedback(&mut m, "{}", &"x".repeat(10_000));

        let feedback = m[3]["content"].as_str().unwrap();
        assert!(feedback.chars().count() < MAX_FEEDBACK_REASON_CHARS + 200);
    }
}