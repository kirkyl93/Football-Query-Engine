use crate::competitions::Competition;
use crate::countries::Country;
use crate::services::llm::{LlmService, ProviderError};
use crate::services::player::models::{HomeAwayOption, PenaltyOption, SortOption, StatScope};
use crate::services::player::player_enums::PlayerSubPosition;
use actix_web::{HttpResponse, ResponseError, http::StatusCode, post, web};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::time::Duration;

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
    pub clubs_played_for: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clubs_played_against: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subs_only: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub earliest_sub_on_time: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_sub_on_time: Option<i32>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_yellow_cards: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum_yellow_cards: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_red_cards: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub maximum_red_cards: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TranslateSearchResponse {
    pub summary: String,
    pub error_code: Option<String>,
    pub filters: FilterProposal,
}

/// The classified result of a model reply that passed parsing and validation.
#[derive(Debug)]
pub enum Outcome {
    Ok(TranslateSearchResponse),
    Rejected {
        error_code: String,
        response: TranslateSearchResponse,
    },
}

impl Outcome {
    /// Maps the outcome onto the current HTTP contract. When the response
    /// envelope is unified, this is the only function that changes.
    fn into_http(self) -> HttpResponse {
        match self {
            Outcome::Ok(r) => HttpResponse::Ok().json(r),
            Outcome::Rejected {
                error_code,
                response,
            } => HttpResponse::UnprocessableEntity().json(json!({
                "error": error_code,
                "message": response.summary,
                "filters": response.filters
            })),
        }
    }
}

#[derive(Debug)]
pub enum TranslationError {
    InvalidQuery,
    InvalidRequest,
    Provider(ProviderError),
    Deadline,
}

impl std::fmt::Display for TranslationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.details().1)
    }
}

impl TranslationError {
    fn details(&self) -> (&'static str, &'static str) {
        match self {
            Self::InvalidQuery => (
                "invalid_query",
                "Query must contain between 1 and 500 characters",
            ),
            Self::InvalidRequest => (
                "invalid_request",
                "Request must be a JSON object containing a query string",
            ),
            Self::Provider(ProviderError::RateLimited(_)) => (
                "translation_rate_limited",
                "Search translation is temporarily rate limited. Please try again later.",
            ),
            Self::Provider(ProviderError::Configuration) => (
                "translation_configuration_error",
                "Search translation is not configured correctly",
            ),
            Self::Provider(ProviderError::InvalidResponse) => (
                "translation_invalid_response",
                "Search translation returned an invalid result. Please try again.",
            ),
            _ => (
                "translation_unavailable",
                "Search translation is temporarily unavailable. Please try again later.",
            ),
        }
    }
}

impl ResponseError for TranslationError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidQuery | Self::InvalidRequest => StatusCode::BAD_REQUEST,
            Self::Provider(ProviderError::Configuration) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Provider(ProviderError::InvalidResponse) => StatusCode::BAD_GATEWAY,
            _ => StatusCode::SERVICE_UNAVAILABLE,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let (code, message) = self.details();
        let mut response = HttpResponse::build(self.status_code());
        if let Self::Provider(ProviderError::RateLimited(duration)) = self {
            response.insert_header((
                "Retry-After",
                duration
                    .as_secs()
                    .saturating_add(u64::from(duration.subsec_nanos() > 0))
                    .max(1)
                    .to_string(),
            ));
        }
        response.json(json!({ "error": code, "message": message }))
    }
}

#[post("/natural-language-search")]
pub async fn translate_search(
    request: Result<web::Json<TranslateSearchRequest>, actix_web::Error>,
    client: web::Data<Client>,
    providers: web::Data<LlmService>,
) -> Result<HttpResponse, TranslationError> {
    let request = request.map_err(|_| TranslationError::InvalidRequest)?;
    let query = request.query.trim();
    if query.is_empty() || query.chars().count() > 500 {
        return Err(TranslationError::InvalidQuery);
    }

    translate_with_deadline(query, &client, &providers, TRANSLATION_DEADLINE).await
}

async fn translate_with_deadline(
    query: &str,
    client: &Client,
    providers: &LlmService,
    deadline: Duration,
) -> Result<HttpResponse, TranslationError> {
    tokio::time::timeout(deadline, translate(query, client, providers))
        .await
        .map_err(|_| TranslationError::Deadline)?
}

async fn translate(
    query: &str,
    client: &Client,
    providers: &LlmService,
) -> Result<HttpResponse, TranslationError> {
    let mut messages = initial_messages(query);
    let mut using_fallback = false;
    for attempt in 1..=MAX_ATTEMPTS {
        let raw = providers
            .complete(client, &messages, &mut using_fallback)
            .await
            .map_err(TranslationError::Provider)?;
        match interpret(&raw) {
            Ok(outcome) => return Ok(outcome.into_http()),
            Err(reason) => {
                // Validation reasons can contain model output; keep that out of logs.
                log::warn!("Search translation failed validation (attempt {attempt})");
                if attempt < MAX_ATTEMPTS {
                    append_retry_feedback(&mut messages, &raw, &reason);
                }
            }
        }
    }
    Err(TranslationError::Provider(ProviderError::InvalidResponse))
}

// Two model outputs, with at most one additional provider call for failover.
const MAX_ATTEMPTS: usize = 2;
const TRANSLATION_DEADLINE: Duration = Duration::from_secs(25);
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
/// The `Err` string describes what was wrong with the reply and is fed back to
/// the model on a correction attempt, without logging model-provided values.
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
            "unsupported_competition" | "unsupported_filter" | "ambiguous_query"
        ) {
            return Err(format!("unknown errorCode '{error_code}'"));
        }

        // Supported filters retained alongside the error must still be valid.
        validate_filters(&result.filters)?;

        return Ok(Outcome::Rejected {
            error_code,
            response: result,
        });
    }

    validate_filters(&result.filters)?;

    Ok(Outcome::Ok(result))
}
fn normalize_country_codes(filters: &mut FilterProposal) {
    if let Some(countries) = &mut filters.countries {
        countries.retain_mut(|code| {
            *code = code.trim().to_ascii_lowercase();
            let country = Country::from_code(code);
            let recognised = country != Country::Missing && country.code() == code.as_str();
            if !recognised {
                // Codes are model output: bound their length and escape control characters.
                let logged_code: String = code.chars().take(16).collect();
                log::warn!(
                    "Dropping unrecognised country code in search translation: {logged_code:?}"
                );
            }
            recognised
        });
    }
}

fn validate_filters(filters: &FilterProposal) -> std::result::Result<(), String> {
    validate_range(filters.minute_from, filters.minute_to, 0, 120, "minute")?;
    validate_range(filters.min_age, filters.max_age, 15, 100, "age")?;
    validate_range(filters.min_height, filters.max_height, 100, 250, "height")?;
    validate_range(
        filters.earliest_sub_on_time,
        filters.latest_sub_on_time,
        1,
        120,
        "substitution entry minute",
    )?;
    if (filters.earliest_sub_on_time.is_some() || filters.latest_sub_on_time.is_some())
        && filters.subs_only != Some(true)
    {
        return Err("substitution entry bounds require subsOnly=true".into());
    }
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

    validate_range(
        filters.minimum_yellow_cards,
        filters.maximum_yellow_cards,
        0,
        1000,
        "yellow cards",
    )?;
    validate_range(
        filters.minimum_red_cards,
        filters.maximum_red_cards,
        0,
        1000,
        "red cards",
    )?;
    if [
        filters.minimum_yellow_cards,
        filters.maximum_yellow_cards,
        filters.minimum_red_cards,
        filters.maximum_red_cards,
    ]
    .iter()
    .any(Option::is_some)
        && filters.sort_by.as_deref() != Some("sw")
    {
        return Err("card thresholds require number of seasons (sortBy=sw)".into());
    }
    if let Some(seasons) = &filters.seasons {
        if let Some(bad) = seasons.iter().find(|s| !(1992..=2025).contains(*s)) {
            return Err(format!("season {bad} is outside 1992..=2025"));
        }
    }

    if let Some(competitions) = &filters.competitions {
        if let Some(bad) = competitions
            .iter()
            .find(|code| Competition::from_code(code).competition_code() != code.as_str())
        {
            return Err(format!("unsupported competition code '{bad}'"));
        }
    }

    if let Some(positions) = &filters.positions {
        if let Some(bad) = positions
            .iter()
            .find(|code| PlayerSubPosition::from_code(code).as_code() != code.as_str())
        {
            return Err(format!("unsupported position code '{bad}'"));
        }
    }

    if let Some(penalties) = &filters.penalties {
        if PenaltyOption::from_code(penalties).as_code() != penalties.as_str() {
            return Err(format!("unsupported penalties value '{penalties}'"));
        }
    }

    if let Some(home_or_away) = &filters.home_or_away {
        if HomeAwayOption::from_code(home_or_away).as_code() != home_or_away.as_str() {
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

    let scope = filters.stat_scope.as_deref().unwrap_or("o");
    let sort = filters.sort_by.as_deref().unwrap_or("g");

    if (scope == "g" && !matches!(sort, "g" | "a" | "ga")) || (scope == "s" && sort == "sw") {
        return Err(format!(
            "sortBy '{sort}' is not compatible with statScope '{scope}'"
        ));
    }

    for (field, names) in [
        ("playerNames", &filters.player_names),
        ("clubsPlayedFor", &filters.clubs_played_for),
        ("clubsPlayedAgainst", &filters.clubs_played_against),
    ] {
        let Some(names) = names else {
            continue;
        };
        if names.len() > 10
            || names
                .iter()
                .any(|n| n.trim().is_empty() || n.chars().count() > 100)
        {
            return Err(format!(
                "{field} must have at most 10 non-empty names of at most 100 characters"
            ));
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
    use crate::services::llm::tests::{completion, mock, mock_with_delay, service};
    use actix_web::{App, test as webtest};

    #[actix_web::test]
    async fn overall_deadline_returns_json_service_unavailable() {
        let groq = mock_with_delay(
            vec![(200, None, completion("late"))],
            Duration::from_secs(1),
        );
        let error = translate_with_deadline(
            "query",
            &Client::new(),
            &service(&groq, None),
            Duration::from_millis(30),
        )
        .await
        .unwrap_err();
        assert_eq!(error.status_code(), StatusCode::SERVICE_UNAVAILABLE);
        let body = actix_web::body::to_bytes(error.error_response().into_body())
            .await
            .unwrap();
        let body: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(body["error"], "translation_unavailable");
    }

    #[actix_web::test]
    async fn route_returns_json_rate_limit_error_and_retry_after() {
        let groq = mock(vec![(429, Some("120"), json!({"secret": "must not leak"}))]);
        let gemini = mock(vec![(429, Some("60"), json!({"secret": "must not leak"}))]);
        let app = webtest::init_service(
            App::new()
                .app_data(web::Data::new(Client::new()))
                .app_data(web::Data::new(service(&groq, Some(&gemini))))
                .service(translate_search),
        )
        .await;
        let request = webtest::TestRequest::post()
            .uri("/natural-language-search")
            .set_json(json!({"query": "top scorers"}))
            .to_request();
        let response = webtest::call_service(&app, request).await;
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(response.headers().get("retry-after").unwrap(), "60");
        let body: Value = webtest::read_body_json(response).await;
        assert_eq!(body["error"], "translation_rate_limited");
        assert!(body["message"].as_str().unwrap().contains("rate limited"));
        assert!(!body.to_string().contains("secret"));
    }

    #[actix_web::test]
    async fn route_returns_json_for_invalid_queries_and_malformed_requests() {
        let groq = mock(vec![]);
        let app = webtest::init_service(
            App::new()
                .app_data(web::Data::new(Client::new()))
                .app_data(web::Data::new(service(&groq, None)))
                .service(translate_search),
        )
        .await;
        for (payload, expected_code) in [
            (json!({"query": " "}), "invalid_query"),
            (json!({"query": "x".repeat(501)}), "invalid_query"),
            (json!({"query": 123}), "invalid_request"),
            (json!({"query": "q", "extra": true}), "invalid_request"),
        ] {
            let response = webtest::call_service(
                &app,
                webtest::TestRequest::post()
                    .uri("/natural-language-search")
                    .set_json(payload)
                    .to_request(),
            )
            .await;
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            let body: Value = webtest::read_body_json(response).await;
            assert_eq!(body["error"], expected_code);
        }
        let response = webtest::call_service(
            &app,
            webtest::TestRequest::post()
                .uri("/natural-language-search")
                .insert_header(("content-type", "application/json"))
                .set_payload("broken json")
                .to_request(),
        )
        .await;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let body: Value = webtest::read_body_json(response).await;
        assert_eq!(body["error"], "invalid_request");
        assert!(groq.requests.lock().unwrap().is_empty());
    }

    #[actix_web::test]
    async fn fallback_validation_correction_preserves_messages_and_success_contract() {
        let groq = mock(vec![(429, None, json!({}))]);
        let gemini = mock(vec![
            (200, None, completion("not json")),
            (200, None, completion(&reply(json!({})))),
        ]);
        let response = translate(
            "top scorers",
            &Client::new(),
            &service(&groq, Some(&gemini)),
        )
        .await
        .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body: Value = serde_json::from_slice(
            &actix_web::body::to_bytes(response.into_body())
                .await
                .unwrap(),
        )
        .unwrap();
        assert!(body.get("filters").is_some());
        assert_eq!(body["errorCode"], Value::Null);
        assert_eq!(body.as_object().unwrap().len(), 3);
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
        let requests = gemini.requests.lock().unwrap();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[1]["messages"][0], requests[0]["messages"][0]);
        assert_eq!(requests[1]["messages"][1]["content"], "top scorers");
        assert_eq!(requests[1]["messages"][2]["content"], "not json");
        assert_eq!(requests[1]["messages"][3]["role"], "user");
    }

    #[actix_web::test]
    async fn rejected_queries_return_actionable_messages_without_retry() {
        for error_code in [
            "ambiguous_query",
            "unsupported_filter",
            "unsupported_competition",
        ] {
            let explanation = "Specify a competition, such as the Premier League or La Liga.";
            let groq = mock(vec![(
                200,
                None,
                completion(&reply(json!({
                    "errorCode": error_code,
                    "summary": explanation
                }))),
            )]);
            let gemini = mock(vec![]);
            let response = translate("query", &Client::new(), &service(&groq, Some(&gemini)))
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
            let body: Value = serde_json::from_slice(
                &actix_web::body::to_bytes(response.into_body())
                    .await
                    .unwrap(),
            )
            .unwrap();
            assert_eq!(body["error"], error_code);
            assert_eq!(body["message"], explanation);
            assert_eq!(body["filters"]["competitions"], json!(["GB1"]));
            assert_eq!(groq.requests.lock().unwrap().len(), 1);
            assert!(gemini.requests.lock().unwrap().is_empty());
        }
    }

    #[actix_web::test]
    async fn invalid_output_has_one_correction_and_no_fallback() {
        let groq = mock(vec![
            (200, None, completion("bad")),
            (200, None, completion("bad")),
        ]);
        let gemini = mock(vec![]);
        let failure = translate("query", &Client::new(), &service(&groq, Some(&gemini)))
            .await
            .unwrap_err();
        assert_eq!(failure.status_code(), StatusCode::BAD_GATEWAY);
        assert_eq!(groq.requests.lock().unwrap().len(), 2);
        assert!(gemini.requests.lock().unwrap().is_empty());
    }

    #[actix_web::test]
    async fn consecutive_queries_start_with_fresh_messages() {
        let groq = mock(vec![
            (200, None, completion(&reply(json!({})))),
            (200, None, completion(&reply(json!({})))),
        ]);
        let providers = service(&groq, None);
        let client = Client::new();
        for query in ["Premier League top scorers", "La Liga top assist makers"] {
            assert_eq!(
                translate(query, &client, &providers)
                    .await
                    .unwrap()
                    .status(),
                StatusCode::OK
            );
        }
        let requests = groq.requests.lock().unwrap();
        assert_eq!(requests.len(), 2);
        for (request, query) in requests
            .iter()
            .zip(["Premier League top scorers", "La Liga top assist makers"])
        {
            assert_eq!(request["messages"].as_array().unwrap().len(), 2);
            assert_eq!(request["messages"][0]["role"], "system");
            assert_eq!(request["messages"][1]["content"], query);
        }
    }

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
    fn accepts_substitute_filters_with_inclusive_entry_bounds() {
        for (earliest, latest) in [
            (None, None),
            (Some(1), Some(120)),
            (Some(46), Some(46)),
            (Some(61), None),
            (None, Some(59)),
        ] {
            let filters = FilterProposal {
                subs_only: Some(true),
                earliest_sub_on_time: earliest,
                latest_sub_on_time: latest,
                ..Default::default()
            };
            assert!(
                validate_filters(&filters).is_ok(),
                "{earliest:?}, {latest:?}"
            );
        }
    }

    #[test]
    fn rejects_out_of_range_or_inverted_substitute_entry_bounds() {
        for (earliest, latest) in [
            (Some(-1), None),
            (Some(0), None),
            (Some(121), None),
            (None, Some(0)),
            (None, Some(121)),
            (Some(75), Some(60)),
        ] {
            let filters = FilterProposal {
                subs_only: Some(true),
                earliest_sub_on_time: earliest,
                latest_sub_on_time: latest,
                ..Default::default()
            };
            assert!(
                validate_filters(&filters).is_err(),
                "{earliest:?}, {latest:?}"
            );
        }
    }

    #[test]
    fn entry_bounds_require_substitute_only_appearances() {
        for subs_only in [None, Some(false)] {
            for (earliest, latest) in [(Some(60), None), (None, Some(75))] {
                let filters = FilterProposal {
                    subs_only,
                    earliest_sub_on_time: earliest,
                    latest_sub_on_time: latest,
                    ..Default::default()
                };
                assert!(validate_filters(&filters).is_err());
            }
            assert!(
                validate_filters(&FilterProposal {
                    subs_only,
                    ..Default::default()
                })
                .is_ok()
            );
        }
    }

    #[test]
    fn interpret_requires_a_boolean_for_subs_only() {
        for value in [json!(1), json!("true")] {
            assert!(interpret(&reply(json!({"filters": {"subsOnly": value}}))).is_err());
        }
    }

    #[actix_web::test]
    async fn route_preserves_entry_bounds_separately_from_contribution_minutes() {
        let filters = json!({
            "competitions": ["GB1"], "sortBy": "g", "subsOnly": true,
            "earliestSubOnTime": 60, "latestSubOnTime": 75, "minuteFrom": 81
        });
        let groq = mock(vec![(
            200,
            None,
            completion(&reply(json!({"filters": filters}))),
        )]);
        let app = webtest::init_service(
            App::new()
                .app_data(web::Data::new(Client::new()))
                .app_data(web::Data::new(service(&groq, None)))
                .service(translate_search),
        )
        .await;
        let response = webtest::call_service(
            &app,
            webtest::TestRequest::post().uri("/natural-language-search")
                .set_json(json!({"query": "Most Premier League goals after minute 80 by substitutes brought on between 60 and 75"}))
                .to_request(),
        ).await;
        assert_eq!(response.status(), StatusCode::OK);
        let body: Value = webtest::read_body_json(response).await;
        assert_eq!(body["filters"], filters);
        assert_eq!(body["errorCode"], Value::Null);
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
    }

    #[test]
    fn unsupported_queries_can_preserve_supported_substitute_filters() {
        let result = interpret(&reply(json!({
            "errorCode": "unsupported_filter",
            "summary": "Preferred-foot filters are not supported.",
            "filters": {"subsOnly": true, "earliestSubOnTime": 60}
        })))
        .unwrap();
        match result {
            Outcome::Rejected {
                error_code,
                response,
            } => {
                assert_eq!(error_code, "unsupported_filter");
                assert_eq!(response.filters.subs_only, Some(true));
                assert_eq!(response.filters.earliest_sub_on_time, Some(60));
            }
            other => panic!("expected Rejected, got {other:?}"),
        }
    }

    #[test]
    fn rejects_display_name_as_position_code() {
        let mut f = valid_filters();
        f.positions = Some(vec!["Goalkeeper".into()]);
        assert!(validate_filters(&f).is_err());
    }

    #[test]
    fn interpret_preserves_club_names_for_frontend_resolution() {
        let filters = json!({
            "clubsPlayedFor": ["Manchester United", "Arsenal FC"],
            "clubsPlayedAgainst": ["Chelsea FC"]
        });
        let result = interpret(&reply(json!({"filters": filters}))).unwrap();
        match result {
            Outcome::Ok(response) => {
                assert_eq!(serde_json::to_value(response.filters).unwrap(), filters);
            }
            other => panic!("expected Ok, got {other:?}"),
        }
    }

    #[test]
    fn interpret_rejects_invalid_club_names_and_numeric_ids() {
        for field in ["clubsPlayedFor", "clubsPlayedAgainst"] {
            for names in [
                json!([" "]),
                json!(["x".repeat(101)]),
                json!(vec!["Chelsea FC"; 11]),
                json!([631]),
            ] {
                assert!(
                    interpret(&reply(json!({"filters": {field: names}}))).is_err(),
                    "{field}: {names}"
                );
            }
        }
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
        assert_eq!(
            f.countries,
            Some(vec!["es".to_string(), "gb-eng".to_string()])
        );
        assert!(validate_filters(&f).is_ok());
    }

    #[test]
    fn interpret_drops_all_unrecognised_countries_without_failing_translation() {
        for code in ["xx", "", "  "] {
            let raw = reply(json!({"filters": {"countries": [code]}}));
            let Outcome::Ok(response) = interpret(&raw).unwrap() else {
                panic!("unknown country codes must not reject a translation");
            };
            assert_eq!(response.filters.countries, Some(vec![]), "code {code:?}");
        }
    }

    #[test]
    fn interpret_drops_unrecognised_countries_and_keeps_normalised_recognised_codes() {
        let raw = reply(json!({
            "filters": {"countries": [" ES ", "xx", "GB-ENG"], "sortBy": "g"}
        }));
        let Outcome::Ok(response) = interpret(&raw).unwrap() else {
            panic!("unknown country codes must not reject a translation");
        };
        assert_eq!(
            response.filters.countries,
            Some(vec!["es".into(), "gb-eng".into()])
        );
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
    fn interpret_rejects_unexpected_response_fields() {
        assert!(interpret(&reply(json!({"conversation": []}))).is_err());
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
            Outcome::Rejected {
                error_code,
                response,
            } => {
                assert_eq!(error_code, "unsupported_competition");
                assert_eq!(response.filters.minimum_appearances, Some(15));
            }
            other => panic!("expected Rejected, got {other:?}"),
        }
    }

    #[test]
    fn interpret_rejects_unknown_error_code() {
        assert!(interpret(&reply(json!({ "errorCode": "whatever" }))).is_err());
    }

    #[test]
    fn interpret_validates_filters_alongside_error() {
        assert!(
            interpret(&reply(json!({
                "errorCode": "unsupported_filter",
                "filters": { "competitions": ["NOPE"] }
            })))
            .is_err()
        );
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
    #[test]
    fn card_threshold_proposals_require_season_counts_and_valid_ranges() {
        let mut filters = FilterProposal {
            sort_by: Some("sw".into()),
            minimum_yellow_cards: Some(10),
            maximum_red_cards: Some(0),
            ..Default::default()
        };
        assert!(validate_filters(&filters).is_ok());
        filters.sort_by = Some("gw".into());
        assert!(validate_filters(&filters).is_err());
        filters.sort_by = Some("sw".into());
        filters.maximum_yellow_cards = Some(9);
        assert!(validate_filters(&filters).is_err());
    }
}
