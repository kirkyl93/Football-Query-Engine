//! Provider transport and failover, independent of the public HTTP contract.
use std::{
    sync::Mutex,
    time::{Duration, Instant, SystemTime},
};

use reqwest::{Client, StatusCode, header::HeaderMap};
use serde::Deserialize;
use serde_json::{Value, json};

const CALL_TIMEOUT: Duration = Duration::from_secs(25);
const DEFAULT_COOLDOWN: Duration = Duration::from_secs(60);
// A malformed header must not disable a provider indefinitely.
const MAX_COOLDOWN: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Debug)]
pub enum ProviderError {
    RateLimited(Duration),
    Timeout,
    Unavailable,
    Configuration,
    InvalidResponse,
}

impl ProviderError {
    fn allows_fallback(&self) -> bool {
        matches!(
            self,
            Self::RateLimited(_) | Self::Timeout | Self::Unavailable
        )
    }
}

#[derive(Clone, Copy)]
enum ProviderKind {
    Groq,
    Gemini,
}

impl ProviderKind {
    fn name(self) -> &'static str {
        match self {
            Self::Groq => "groq",
            Self::Gemini => "gemini",
        }
    }
}

struct Provider {
    kind: ProviderKind,
    url: String,
    key: String,
    model: String,
    call_timeout: Duration,
    cooldown_until: Mutex<Option<Instant>>,
}

/// Log on drop so an overall deadline or cancellation also records elapsed time.
struct ProviderCallLog<'a> {
    provider: &'static str,
    model: &'a str,
    started: Instant,
    status: Option<u16>,
    outcome: &'static str,
}

impl Drop for ProviderCallLog<'_> {
    fn drop(&mut self) {
        log::info!(
            "Search translation API call provider={} model={} elapsed_ms={} http_status={} outcome={}",
            self.provider,
            self.model,
            self.started.elapsed().as_millis(),
            self.status
                .map(|status| status.to_string())
                .unwrap_or_else(|| "none".into()),
            self.outcome,
        );
    }
}

impl Provider {
    fn from_settings(
        kind: ProviderKind,
        url: String,
        key: String,
        model: String,
    ) -> Result<Self, String> {
        let parsed =
            reqwest::Url::parse(&url).map_err(|_| format!("{} API URL is invalid", kind.name()))?;
        if !matches!(parsed.scheme(), "http" | "https")
            || parsed.host_str().is_none()
            || !parsed.username().is_empty()
            || parsed.password().is_some()
            || parsed.query().is_some()
            || parsed.fragment().is_some()
        {
            return Err(format!(
                "{} API URL must be an HTTP(S) endpoint without credentials, query or fragment",
                kind.name()
            ));
        }
        Ok(Self {
            kind,
            url,
            key,
            model,
            call_timeout: CALL_TIMEOUT,
            cooldown_until: Mutex::new(None),
        })
    }

    fn remaining_cooldown(&self) -> Option<Duration> {
        self.cooldown_until
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .and_then(|until| until.checked_duration_since(Instant::now()))
    }

    fn set_cooldown(&self, duration: Duration) {
        let until = Instant::now() + duration;
        let mut current = self
            .cooldown_until
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        // Concurrent responses may extend a cooldown, but must never shorten it.
        *current = Some(current.map_or(until, |existing| existing.max(until)));
    }

    fn request_body(&self, messages: &[Value]) -> Value {
        let mut body = json!({
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "response_format": { "type": "json_object" }
        });
        match self.kind {
            ProviderKind::Groq => {
                body["max_completion_tokens"] = json!(1500);
                body["reasoning_effort"] = json!("low");
            }
            ProviderKind::Gemini => {
                // Do not forward Groq's reasoning options: support varies by model.
                // Leave room for Gemini's default thinking budget and JSON output.
                body["max_tokens"] = json!(4096);
            }
        }
        body
    }

    async fn complete(&self, client: &Client, messages: &[Value]) -> Result<String, ProviderError> {
        if let Some(remaining) = self.remaining_cooldown() {
            return Err(ProviderError::RateLimited(remaining));
        }
        let mut call_log = ProviderCallLog {
            provider: self.kind.name(),
            model: &self.model,
            started: Instant::now(),
            status: None,
            outcome: "cancelled",
        };
        let result = self.call(client, messages, &mut call_log).await;
        call_log.outcome = match &result {
            Ok(_) => "success",
            Err(ProviderError::RateLimited(_)) => "rate_limited",
            Err(ProviderError::Timeout) => "timeout",
            Err(ProviderError::Unavailable) => "unavailable",
            Err(ProviderError::Configuration) => "configuration_error",
            Err(ProviderError::InvalidResponse) => "invalid_response",
        };
        result
    }

    async fn call(
        &self,
        client: &Client,
        messages: &[Value],
        call_log: &mut ProviderCallLog<'_>,
    ) -> Result<String, ProviderError> {
        let response = client
            .post(&self.url)
            .bearer_auth(&self.key)
            .timeout(self.call_timeout)
            .json(&self.request_body(messages))
            .send()
            .await
            .map_err(|err| {
                let classified = transport_error(&err);
                // reqwest errors can include URLs; never log the raw error or key.
                log::warn!(
                    "Search translation provider={} failure={classified:?}",
                    self.kind.name()
                );
                classified
            })?;
        let status = response.status();
        call_log.status = Some(status.as_u16());
        if !status.is_success() {
            let failure = classify_status(status, response.headers());
            if let ProviderError::RateLimited(duration) = &failure {
                self.set_cooldown(*duration);
            }
            let request_id = response
                .headers()
                .get("x-request-id")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown");
            log::warn!(
                "Search translation provider={} status={} request_id={request_id} failure={failure:?}",
                self.kind.name(),
                status.as_u16()
            );
            // Provider bodies may contain prompts or credentials. Do not expose them.
            return Err(failure);
        }
        let completion: ChatCompletion = response.json().await.map_err(|err| {
            if err.is_timeout() {
                ProviderError::Timeout
            } else if err.is_decode() {
                ProviderError::InvalidResponse
            } else {
                transport_error(&err)
            }
        })?;
        let choice = completion
            .choices
            .into_iter()
            .next()
            .ok_or(ProviderError::InvalidResponse)?;
        if choice.finish_reason.as_deref() != Some("stop") {
            log::warn!(
                "Search translation provider={} returned unfinished or blocked output",
                self.kind.name()
            );
            return Err(ProviderError::InvalidResponse);
        }
        choice
            .message
            .content
            .filter(|text| !text.trim().is_empty())
            .ok_or(ProviderError::InvalidResponse)
    }
}

fn transport_error(error: &reqwest::Error) -> ProviderError {
    if error.is_timeout() {
        ProviderError::Timeout
    } else if error.is_builder() {
        ProviderError::Configuration
    } else {
        ProviderError::Unavailable
    }
}

fn classify_status(status: StatusCode, headers: &HeaderMap) -> ProviderError {
    if status == StatusCode::TOO_MANY_REQUESTS {
        ProviderError::RateLimited(retry_after(headers))
    } else if status.is_server_error() || status == StatusCode::REQUEST_TIMEOUT {
        ProviderError::Unavailable
    } else {
        ProviderError::Configuration
    }
}

fn retry_after(headers: &HeaderMap) -> Duration {
    let duration = headers
        .get("retry-after")
        .and_then(|value| value.to_str().ok())
        .and_then(|raw| {
            let raw = raw.trim();
            if let Ok(seconds) = raw.parse::<u64>() {
                return Some(Duration::from_secs(seconds));
            }
            chrono::DateTime::parse_from_rfc2822(raw)
                .ok()
                .map(SystemTime::from)
                .map(|date| date.duration_since(SystemTime::now()).unwrap_or_default())
        })
        .unwrap_or(DEFAULT_COOLDOWN);
    duration.clamp(Duration::from_secs(1), MAX_COOLDOWN)
}

#[derive(Deserialize)]
struct ChatCompletion {
    choices: Vec<Choice>,
}
#[derive(Deserialize)]
struct Choice {
    message: Message,
    finish_reason: Option<String>,
}
#[derive(Deserialize)]
struct Message {
    content: Option<String>,
}

/// Construct once and share through web::Data across all Actix workers.
pub struct LlmService {
    primary: Provider,
    fallback: Option<Provider>,
}

impl LlmService {
    pub fn from_env() -> Result<Self, String> {
        Self::from_lookup(|name| std::env::var(name).ok())
    }

    fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Result<Self, String> {
        let get = |name: &str| {
            lookup(name)
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty())
        };
        let required = |name: &str| get(name).ok_or_else(|| format!("{name} must be set"));
        let primary = Provider::from_settings(
            ProviderKind::Groq,
            required("LLM_API_URL")?,
            required("LLM_API_KEY")?,
            required("LLM_MODEL")?,
        )?;
        let fallback = if ["GEMINI_API_URL", "GEMINI_API_KEY", "GEMINI_MODEL"]
            .iter()
            .any(|name| get(name).is_some())
        {
            Some(Provider::from_settings(
                ProviderKind::Gemini,
                required("GEMINI_API_URL")?,
                required("GEMINI_API_KEY")?,
                required("GEMINI_MODEL")?,
            )?)
        } else {
            None
        };
        Ok(Self { primary, fallback })
    }

    /// `using_fallback` persists through the caller's validation correction loop.
    /// At most one failover per user request; no transport retry loops.
    pub async fn complete(
        &self,
        client: &Client,
        messages: &[Value],
        using_fallback: &mut bool,
    ) -> Result<String, ProviderError> {
        if *using_fallback {
            return self
                .fallback
                .as_ref()
                .ok_or(ProviderError::Configuration)?
                .complete(client, messages)
                .await;
        }
        match self.primary.complete(client, messages).await {
            Err(error) if error.allows_fallback() && self.fallback.is_some() => {
                *using_fallback = true;
                log::info!("Search translation switching to Gemini: {error:?}");
                self.fallback
                    .as_ref()
                    .unwrap()
                    .complete(client, messages)
                    .await
            }
            result => result,
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use actix_web::{App, HttpResponse, HttpServer, dev::ServerHandle, web};
    use std::{collections::VecDeque, net::TcpListener, sync::Arc};

    pub(crate) struct MockProvider {
        pub url: String,
        pub requests: Arc<Mutex<Vec<Value>>>,
        handle: ServerHandle,
    }

    impl Drop for MockProvider {
        fn drop(&mut self) {
            actix_web::rt::spawn(self.handle.stop(false));
        }
    }

    pub(crate) fn completion(content: &str) -> Value {
        json!({"choices": [{"message": {"content": content}, "finish_reason": "stop"}]})
    }

    pub(crate) fn mock(replies: Vec<(u16, Option<&str>, Value)>) -> MockProvider {
        mock_with_delay(replies, Duration::ZERO)
    }

    pub(crate) fn mock_with_delay(
        replies: Vec<(u16, Option<&str>, Value)>,
        delay: Duration,
    ) -> MockProvider {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/chat/completions", listener.local_addr().unwrap());
        let requests = Arc::new(Mutex::new(Vec::new()));
        let captured = requests.clone();
        let replies = Arc::new(Mutex::new(
            replies
                .into_iter()
                .map(|(status, retry, body)| (status, retry.map(str::to_string), body))
                .collect::<VecDeque<_>>(),
        ));
        let server = HttpServer::new(move || {
            let requests = captured.clone();
            let replies = replies.clone();
            App::new().route(
                "/chat/completions",
                web::post().to(move |body: web::Json<Value>| {
                    requests.lock().unwrap().push(body.into_inner());
                    let (status, retry, body) = replies.lock().unwrap().pop_front().unwrap_or((
                        500,
                        None,
                        json!({"error": "unexpected request"}),
                    ));
                    async move {
                        tokio::time::sleep(delay).await;
                        let mut response = HttpResponse::build(
                            actix_web::http::StatusCode::from_u16(status).unwrap(),
                        );
                        if let Some(retry) = retry {
                            response.insert_header(("Retry-After", retry));
                        }
                        response.json(body)
                    }
                }),
            )
        })
        .workers(1)
        .listen(listener)
        .unwrap()
        .run();
        let handle = server.handle();
        actix_web::rt::spawn(server);
        MockProvider {
            url,
            requests,
            handle,
        }
    }

    pub(crate) fn service(primary: &MockProvider, fallback: Option<&MockProvider>) -> LlmService {
        let provider = |mock: &MockProvider, kind| {
            Provider::from_settings(
                kind,
                mock.url.clone(),
                "test-key".into(),
                "test-model".into(),
            )
            .unwrap()
        };
        LlmService {
            primary: provider(primary, ProviderKind::Groq),
            fallback: fallback.map(|mock| provider(mock, ProviderKind::Gemini)),
        }
    }

    #[actix_web::test]
    async fn rate_limit_fails_over_and_cooldown_is_shared_between_requests() {
        let groq = mock(vec![(429, Some("120"), json!({"error": "quota exceeded"}))]);
        let gemini = mock(vec![
            (200, None, completion("first")),
            (200, None, completion("second")),
        ]);
        let service = service(&groq, Some(&gemini));
        let client = Client::new();
        for expected in ["first", "second"] {
            let mut fallback = false;
            assert_eq!(
                service.complete(&client, &[], &mut fallback).await.unwrap(),
                expected
            );
            assert!(fallback);
        }
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
        assert_eq!(gemini.requests.lock().unwrap().len(), 2);
        let remaining = service.primary.remaining_cooldown().unwrap();
        assert!(remaining > Duration::from_secs(110));
    }

    #[actix_web::test]
    async fn transient_failure_switches_once_and_corrections_stay_on_gemini() {
        let groq = mock(vec![(503, None, json!({}))]);
        let gemini = mock(vec![
            (200, None, completion("bad")),
            (200, None, completion("corrected")),
        ]);
        let service = service(&groq, Some(&gemini));
        let client = Client::new();
        let mut fallback = false;
        assert_eq!(
            service.complete(&client, &[], &mut fallback).await.unwrap(),
            "bad"
        );
        assert_eq!(
            service.complete(&client, &[], &mut fallback).await.unwrap(),
            "corrected"
        );
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
        assert!(service.primary.remaining_cooldown().is_none());
    }

    #[actix_web::test]
    async fn connection_failure_uses_fallback() {
        let groq = mock(vec![]);
        let gemini = mock(vec![(200, None, completion("fallback"))]);
        let mut service = service(&groq, Some(&gemini));
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        service.primary.url = format!("http://{}/chat/completions", listener.local_addr().unwrap());
        drop(listener);
        assert_eq!(
            service
                .complete(&Client::new(), &[], &mut false)
                .await
                .unwrap(),
            "fallback"
        );
        assert_eq!(gemini.requests.lock().unwrap().len(), 1);
    }

    #[actix_web::test]
    async fn provider_timeout_uses_fallback() {
        let groq = mock_with_delay(
            vec![(200, None, completion("too late"))],
            Duration::from_secs(2),
        );
        let gemini = mock(vec![(200, None, completion("fallback"))]);
        let mut service = service(&groq, Some(&gemini));
        service.primary.call_timeout = Duration::from_millis(250);
        let mut using_fallback = false;
        assert_eq!(
            service
                .complete(&Client::new(), &[], &mut using_fallback)
                .await
                .unwrap(),
            "fallback"
        );
        assert!(using_fallback);
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
        assert_eq!(gemini.requests.lock().unwrap().len(), 1);
    }

    #[actix_web::test]
    async fn configuration_errors_do_not_call_fallback() {
        for status in [400, 401, 403, 404, 422] {
            let groq = mock(vec![(status, None, json!({}))]);
            let gemini = mock(vec![]);
            let service = service(&groq, Some(&gemini));
            assert!(matches!(
                service.complete(&Client::new(), &[], &mut false).await,
                Err(ProviderError::Configuration)
            ));
            assert!(gemini.requests.lock().unwrap().is_empty());
        }
    }

    #[actix_web::test]
    async fn primary_success_does_not_call_gemini_and_options_are_provider_specific() {
        let groq = mock(vec![(200, None, completion("ok"))]);
        let gemini = mock(vec![]);
        let service = service(&groq, Some(&gemini));
        assert_eq!(
            service
                .complete(&Client::new(), &[], &mut false)
                .await
                .unwrap(),
            "ok"
        );
        assert!(gemini.requests.lock().unwrap().is_empty());
        let requests = groq.requests.lock().unwrap();
        assert_eq!(requests[0]["reasoning_effort"], "low");
        assert_eq!(requests[0]["max_completion_tokens"], 1500);
        let body = service.fallback.as_ref().unwrap().request_body(&[]);
        assert!(body.get("reasoning_effort").is_none());
        assert!(body.get("max_completion_tokens").is_none());
        assert_eq!(body["max_tokens"], 4096);
    }

    #[actix_web::test]
    async fn exhausted_providers_are_not_retried_during_cooldown() {
        let groq = mock(vec![(429, Some("120"), json!({}))]);
        let gemini = mock(vec![(429, Some("60"), json!({}))]);
        let service = service(&groq, Some(&gemini));
        for _ in 0..2 {
            assert!(matches!(
                service.complete(&Client::new(), &[], &mut false).await,
                Err(ProviderError::RateLimited(_))
            ));
        }
        assert_eq!(groq.requests.lock().unwrap().len(), 1);
        assert_eq!(gemini.requests.lock().unwrap().len(), 1);
    }

    #[actix_web::test]
    async fn expired_cooldown_returns_to_primary() {
        let groq = mock(vec![(200, None, completion("recovered"))]);
        let service = service(&groq, None);
        *service.primary.cooldown_until.lock().unwrap() =
            Some(Instant::now() - Duration::from_secs(1));
        assert_eq!(
            service
                .complete(&Client::new(), &[], &mut false)
                .await
                .unwrap(),
            "recovered"
        );
    }

    #[actix_web::test]
    async fn rejects_empty_truncated_blocked_and_malformed_responses_without_fallback() {
        for body in [
            json!({}),
            json!({"choices": []}),
            completion(" "),
            json!({"choices": [{"message": {"content": null}, "finish_reason": "stop"}]}),
            json!({"choices": [{"message": {"content": "partial"}, "finish_reason": "length"}]}),
            json!({"choices": [{"message": {"content": "blocked"}, "finish_reason": "content_filter"}]}),
        ] {
            let groq = mock(vec![(200, None, body)]);
            let gemini = mock(vec![]);
            let service = service(&groq, Some(&gemini));
            assert!(matches!(
                service.complete(&Client::new(), &[], &mut false).await,
                Err(ProviderError::InvalidResponse)
            ));
            assert!(gemini.requests.lock().unwrap().is_empty());
        }
    }

    #[test]
    fn retry_after_handles_seconds_dates_missing_and_invalid_values() {
        for (raw, expected) in [
            (None, 60),
            (Some("bad"), 60),
            (Some("120"), 120),
            (Some("0"), 1),
            (Some("999999999"), 86400),
        ] {
            let mut headers = HeaderMap::new();
            if let Some(raw) = raw {
                headers.insert("retry-after", raw.parse().unwrap());
            }
            assert_eq!(retry_after(&headers), Duration::from_secs(expected));
        }
        let date = (chrono::Utc::now() + chrono::Duration::seconds(120))
            .format("%a, %d %b %Y %H:%M:%S GMT")
            .to_string();
        let mut headers = HeaderMap::new();
        headers.insert("retry-after", date.parse().unwrap());
        assert!((118..=120).contains(&retry_after(&headers).as_secs()));
    }

    #[test]
    fn configuration_requires_complete_fallback_and_valid_urls() {
        let settings = |name: &str| match name {
            "LLM_API_URL" => Some("https://example.com/chat/completions".into()),
            "LLM_API_KEY" => Some("test".into()),
            "LLM_MODEL" => Some("model".into()),
            _ => None,
        };
        assert!(
            LlmService::from_lookup(settings)
                .unwrap()
                .fallback
                .is_none()
        );
        assert!(
            LlmService::from_lookup(|name| if name == "GEMINI_API_KEY" {
                Some("key".into())
            } else {
                settings(name)
            })
            .is_err()
        );
        assert!(
            LlmService::from_lookup(|name| if name == "LLM_MODEL" {
                Some(" ".into())
            } else {
                settings(name)
            })
            .is_err()
        );
        assert!(
            Provider::from_settings(
                ProviderKind::Groq,
                "file:///tmp/model".into(),
                "key".into(),
                "model".into()
            )
            .is_err()
        );
    }
}
