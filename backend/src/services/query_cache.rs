use actix_web::{
    Error,
    body::{self, BoxBody, MessageBody},
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    http::{
        Method, StatusCode,
        header::{HeaderName, HeaderValue},
    },
    web::Bytes,
};
use std::{
    collections::HashMap,
    future::Future,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
    time::{Duration, Instant},
};
use tokio::sync::{Mutex, RwLock, watch};

use crate::services::player::models::SearchParams;

/// Default entry lifetime.
pub const DEFAULT_TTL_SECS: u64 = 4 * 3600;
/// Upper bound on stored responses. Bodies are ~tens of KB, so a full cache
/// stays in the tens of MB.
pub const MAX_ENTRIES: usize = 2048;

/// Only the aggregation endpoints: they cost seconds-to-a-minute and share
/// well between visitors. The cheap per-id/toolbar lookups under /players
/// and /clubs bypass the cache entirely.
const CACHEABLE_PREFIXES: [&str; 1] = ["/search"];

#[derive(Clone)]
struct Entry {
    status: StatusCode,
    /// All response headers (content type, CORS, …) cloned verbatim.
    /// `X-Cache` is applied on serve and never stored.
    headers: Vec<(HeaderName, HeaderValue)>,
    body: Bytes,
    inserted_at: Instant,
}

struct Inner {
    entries: RwLock<HashMap<String, Entry>>,
    inflight: Mutex<HashMap<String, watch::Sender<bool>>>,
    ttl: Duration,
    max_entries: usize,
}

/// Shared response cache for idempotent GET endpoints.
///
/// Locks guard hash operations only and are never held across `.await`.
/// Constructed with a zero TTL, the middleware is pure passthrough.
#[derive(Clone)]
pub struct QueryCache {
    inner: Arc<Inner>,
}

impl QueryCache {
    pub fn new(ttl: Duration) -> Self {
        Self::with_limits(ttl, MAX_ENTRIES)
    }

    pub fn with_limits(ttl: Duration, max_entries: usize) -> Self {
        Self {
            inner: Arc::new(Inner {
                entries: RwLock::new(HashMap::new()),
                inflight: Mutex::new(HashMap::new()),
                ttl,
                max_entries,
            }),
        }
    }

    fn is_cacheable(req: &ServiceRequest) -> bool {
        if req.method() != Method::GET {
            return false;
        }
        let path = req.path();
        CACHEABLE_PREFIXES.iter().any(|base| {
            // Exact match or slash boundary; the byte comparison is safe
            // because UTF-8 multibyte sequences never contain b'/'.
            path.len() >= base.len()
                && path.starts_with(base)
                && (path.len() == base.len() || path.as_bytes()[base.len()] == b'/')
        })
    }

    async fn lookup(&self, key: &str) -> Option<Entry> {
        let entries = self.inner.entries.read().await;
        entries
            .get(key)
            .filter(|e| e.inserted_at.elapsed() < self.inner.ttl)
            .cloned()
    }

    async fn store(&self, key: String, entry: Entry) {
        let mut entries = self.inner.entries.write().await;
        // Drop expired entries first; only evict live ones when still full.
        entries.retain(|_, e| e.inserted_at.elapsed() < self.inner.ttl);
        if entries.len() >= self.inner.max_entries {
            if let Some(oldest) = entries
                .iter()
                .min_by_key(|(_, e)| e.inserted_at)
                .map(|(k, _)| k.clone())
            {
                entries.remove(&oldest);
                log::info!("query cache full, evicted oldest entry");
            }
        }
        entries.insert(key, entry);
    }
}

/// `path` + alphabetically sorted raw query pairs, so `?b=2&a=1` and
/// `?a=1&b=2` share one entry. Only a fallback for queries that fail to
/// parse (see [`search_cache_key`]); encoding variants may still key
/// separately, which only costs a miss, and the entry cap bounds the total.
fn cache_key(path: &str, query: &str) -> String {
    if query.is_empty() {
        return path.to_string();
    }
    let mut parts: Vec<&str> = query.split('&').filter(|s| !s.is_empty()).collect();
    parts.sort_unstable();
    format!("{}?{}", path, parts.join("&"))
}

/// Cache key for `/search*` requests: the endpoint plus the *processed*
/// search parameters. Textually different but semantically identical queries
/// (`?limit=50` vs absent, clamped values, unknown codes falling back to
/// defaults) share one entry, because they build byte-identical SQL.
///
/// The key renders [`ProcessedSearchParams`](crate::services::player::models::ProcessedSearchParams)
/// with `Debug`, which covers every field by construction: a newly added
/// filter field can only ever add misses, never silently collide two
/// different queries. (Field *order* still partitions, e.g. CSV order —
/// safe misses, not poison.)
fn search_cache_key(path: &str, query: &str) -> String {
    match serde_urlencoded::from_str::<SearchParams>(query) {
        Ok(params) => format!("{path}#{:?}", params.to_processed()),
        // Unparseable queries (e.g. `?page=abc`, which the handlers
        // reject) fall back to the raw normalized URI: still consistent
        // per exact string, just without cross-string sharing.
        Err(_) => cache_key(path, query),
    }
}

fn cached_response(
    req: ServiceRequest,
    entry: &Entry,
    hit_or_miss: &'static str,
) -> ServiceResponse<BoxBody> {
    let mut builder = actix_web::HttpResponse::build(entry.status);
    for (name, value) in &entry.headers {
        builder.insert_header((name.clone(), value.clone()));
    }
    builder.insert_header(("X-Cache", hit_or_miss));
    req.into_response(builder.body(entry.body.clone()).map_into_boxed_body())
}

impl<S, B> Transform<S, ServiceRequest> for QueryCache
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Transform = QueryCacheService<S>;
    type InitError = ();
    type Future = std::future::Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        std::future::ready(Ok(QueryCacheService {
            service: Arc::new(service),
            cache: self.clone(),
        }))
    }
}

pub struct QueryCacheService<S> {
    service: Arc<S>,
    cache: QueryCache,
}

impl<S, B> Service<ServiceRequest> for QueryCacheService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.as_ref().poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Disabled or non-cacheable: pure passthrough, no header, no overhead.
        if self.cache.inner.ttl.is_zero() || !QueryCache::is_cacheable(&req) {
            let fut = self.service.call(req);
            return Box::pin(async move { fut.await.map(|res| res.map_into_boxed_body()) });
        }

        let cache = self.cache.clone();
        let svc = Arc::clone(&self.service);
        let key = search_cache_key(req.path(), req.query_string());

        Box::pin(async move {
            let mut req_opt = Some(req);
            // Each iteration either serves the request or issues exactly one
            // downstream call, so this always terminates. A waiter that wakes
            // to an empty cache (leader failed) contends to become leader.
            // The attempt cap is insurance against pathological livelock.
            for _ in 0..10 {
                // Decide atomically: the freshness check and the
                // single-flight registration happen under one critical
                // section, so two requests can never both believe they are
                // leader, and no completion signal can slip between the
                // check and the wait. (Lock order inflight -> entries is
                // used only here; inflight is never taken while entries is
                // held anywhere, so this cannot deadlock.)
                enum Decision {
                    Hit(Entry),
                    Wait(watch::Receiver<bool>),
                    Lead(watch::Sender<bool>),
                }
                let decision = {
                    let mut inflight = cache.inner.inflight.lock().await;
                    if let Some(entry) = cache.lookup(&key).await {
                        Decision::Hit(entry)
                    } else if let Some(tx) = inflight.get(&key) {
                        let rx = tx.subscribe();
                        if *rx.borrow() {
                            // Completed but nothing stored: the previous
                            // leader died after signalling (see LeaderGuard)
                            // or failed. Reclaim the slot and elect below
                            // instead of waiting on a dead key.
                            inflight.remove(&key);
                            let (tx, _rx) = watch::channel(false);
                            inflight.insert(key.clone(), tx.clone());
                            Decision::Lead(tx)
                        } else {
                            Decision::Wait(rx)
                        }
                    } else {
                        let (tx, _rx) = watch::channel(false);
                        inflight.insert(key.clone(), tx.clone());
                        Decision::Lead(tx)
                    }
                };
                match decision {
                    Decision::Hit(entry) => {
                        return Ok(cached_response(
                            req_opt.take().expect("request moved once"),
                            &entry,
                            "HIT",
                        ));
                    }
                    Decision::Wait(mut rx) => {
                        while !*rx.borrow() {
                            if rx.changed().await.is_err() {
                                break;
                            }
                        }
                    }
                    Decision::Lead(tx) => {
                        // Leader: the single downstream call for this key.
                        // The guard signals completion if this future is
                        // dropped (disconnect) or panics; the normal path
                        // below finishes explicitly and disarms it.
                        let req = req_opt.take().expect("request moved once");
                        let mut guard = LeaderGuard { tx: Some(tx) };
                        let outcome = svc.call(req).await;
                        match outcome {
                            Ok(res) => {
                                let status = res.status();
                                // Clone headers BEFORE consuming the body:
                                // downstream middleware (e.g. CORS) may have
                                // added headers that must survive the rebuild.
                                let headers: Vec<(HeaderName, HeaderValue)> = res
                                    .headers()
                                    .iter()
                                    .map(|(name, value)| (name.clone(), value.clone()))
                                    .collect();
                                let (http_req, res) = res.into_parts();
                                let bytes = body::to_bytes(res.into_body()).await.map_err(
                                    |_| {
                                        actix_web::error::ErrorInternalServerError(
                                            "response body collection failed",
                                        )
                                    },
                                )?;
                                if status.is_success() {
                                    cache
                                        .store(
                                            key.clone(),
                                            Entry {
                                                status,
                                                headers: headers.clone(),
                                                body: bytes.clone(),
                                                inserted_at: Instant::now(),
                                            },
                                        )
                                        .await;
                                }
                                finish_key(&cache, &key).await;
                                guard.disarm();
                                let mut builder =
                                    actix_web::HttpResponse::build(status);
                                for (name, value) in headers {
                                    builder.insert_header((name, value));
                                }
                                builder.insert_header(("X-Cache", "MISS"));
                                return Ok(ServiceResponse::new(
                                    http_req,
                                    builder.body(bytes).map_into_boxed_body(),
                                ));
                            }
                            Err(err) => {
                                // Errors are never cached; waiting
                                // requests retry as leaders.
                                finish_key(&cache, &key).await;
                                guard.disarm();
                                return Err(err);
                            }
                        }
                    }
                }
            }

            // Unreachable in practice; degrades to an uncached call.
            let req = req_opt.take().expect("request moved once");
            Ok(svc.call(req).await?.map_into_boxed_body())
        })
    }
}

/// Guarantees a single-flight slot is signalled even if the leader's
/// future is dropped (client disconnect mid-query) or panics: [`Drop`]
/// always runs, needs no `.await`, and only sends. The map slot itself is
/// reclaimed lazily by the decision block, which treats a completed-but
/// empty slot as a dead leader and contends to replace it.
struct LeaderGuard {
    tx: Option<watch::Sender<bool>>,
}

impl LeaderGuard {
    fn disarm(&mut self) {
        self.tx = None;
    }
}

impl Drop for LeaderGuard {
    fn drop(&mut self) {
        if let Some(tx) = self.tx.take() {
            let _ = tx.send(true);
        }
    }
}

/// Mark a key complete on the normal path: remove its single-flight slot
/// and signal completion. Subscribers hold their own receivers, so removal
/// first is safe: late arrivals re-decide atomically and either hit or lead.
async fn finish_key(cache: &QueryCache, key: &str) {
    let tx = {
        let mut inflight = cache.inner.inflight.lock().await;
        inflight.remove(key)
    };
    if let Some(tx) = tx {
        let _ = tx.send(true);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{App, HttpRequest, HttpResponse, web};
    use actix_web::test as actix_test;
    use std::sync::atomic::{AtomicUsize, Ordering};

    async fn probe(counter: web::Data<AtomicUsize>, req: HttpRequest) -> HttpResponse {
        counter.fetch_add(1, Ordering::SeqCst);
        if req.query_string().contains("slow=1") {
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        if req.query_string().contains("fail=1") {
            return HttpResponse::InternalServerError().finish();
        }
        HttpResponse::Ok()
            .insert_header(("X-Probe", "probe"))
            .json(serde_json::json!({ "q": req.query_string() }))
    }

    fn test_counter() -> web::Data<AtomicUsize> {
        web::Data::new(AtomicUsize::new(0))
    }

    macro_rules! test_app {
        ($cache:expr, $counter:expr $(,)?) => {
            actix_test::init_service(
                App::new()
                    .wrap($cache)
                    .app_data($counter)
                    .route("/search", web::get().to(probe))
                    .route("/search/occurences", web::get().to(probe))
                    .route("/other", web::get().to(probe))
                    .route("/players/{id}", web::get().to(probe)),
            )
        };
    }

    fn cache_header(resp: &ServiceResponse<BoxBody>) -> Option<String> {
        resp.headers()
            .get("X-Cache")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string)
    }

    #[test]
    fn cache_key_is_order_insensitive() {
        assert_eq!(
            cache_key("/search", "b=2&a=1"),
            cache_key("/search", "a=1&b=2")
        );
        assert_eq!(cache_key("/search", ""), "/search");
        assert_ne!(cache_key("/search", "a=1"), cache_key("/search", "a=2"));
        assert_ne!(cache_key("/search", "a=1"), cache_key("/clubs", "a=1"));
    }

    #[actix_web::test]
    async fn miss_then_hit() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        let first =
            actix_test::call_service(&app, actix_test::TestRequest::get().uri("/search?seasons=2025%2C2024&comps=GB1").to_request())
                .await;
        assert_eq!(cache_header(&first), Some("MISS".to_string()));
        // Downstream headers (e.g. CORS) must survive the body rebuild…
        assert_eq!(
            first.headers().get("X-Probe").and_then(|v| v.to_str().ok()),
            Some("probe")
        );
        let first_body = actix_test::read_body(first).await;

        let second =
            actix_test::call_service(&app, actix_test::TestRequest::get().uri("/search?seasons=2025%2C2024&comps=GB1&penalty=ip&home=e&sort=g&scope=o").to_request())
                .await;
        assert_eq!(cache_header(&second), Some("HIT".to_string()));
        // …and be served from cache too.
        assert_eq!(
            second.headers().get("X-Probe").and_then(|v| v.to_str().ok()),
            Some("probe")
        );
        assert_eq!(actix_test::read_body(second).await, first_body);

        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[actix_web::test]
    async fn param_order_shares_entry() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        actix_test::call_service(&app, actix_test::TestRequest::get().uri("/search?b=2&a=1").to_request())
            .await;
        let second = actix_test::call_service(
            &app,
            actix_test::TestRequest::get().uri("/search?a=1&b=2").to_request(),
        )
        .await;

        assert_eq!(cache_header(&second), Some("HIT".to_string()));
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[actix_web::test]
    async fn full_cache_evicts_oldest() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 2), counter.clone()).await;

        for key in ["comps=GB1", "seasons=2020", "names=Messi", "comps=GB1"] {
            actix_test::call_service(
                &app,
                actix_test::TestRequest::get()
                    .uri(&format!("/search?{key}"))
                    .to_request(),
            )
            .await;
        }

        // comps=GB1 was evicted by names=Messi, so the repeat recomputed.
        // (Each key parses to distinct processed params.)
        assert_eq!(counter.load(Ordering::SeqCst), 4);
    }

    #[actix_web::test]
    async fn entries_expire() {
        let counter = test_counter();
        let app = test_app!(
            QueryCache::with_limits(Duration::from_millis(50), 512),
            counter.clone(),
        )
        .await;

        actix_test::call_service(&app, actix_test::TestRequest::get().uri("/search?seasons=2024").to_request())
            .await;
        actix_test::call_service(&app, actix_test::TestRequest::get().uri("/search?seasons=2024").to_request())
            .await;
        assert_eq!(counter.load(Ordering::SeqCst), 1);

        tokio::time::sleep(Duration::from_millis(100)).await;
        let third = actix_test::call_service(
            &app,
            actix_test::TestRequest::get().uri("/search?seasons=2024").to_request(),
        )
        .await;
        assert_eq!(cache_header(&third), Some("MISS".to_string()));
        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn concurrent_same_key_computed_once() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        let (first, second) = tokio::join!(
            actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/search/occurences?maxheight=170&slow=1").to_request()
            ),
            actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/search/occurences?maxheight=170&slow=1").to_request()
            )
        );

        assert_eq!(counter.load(Ordering::SeqCst), 1);
        assert_eq!(actix_test::read_body(first).await, actix_test::read_body(second).await);
    }

    #[actix_web::test]
    async fn errors_are_not_cached() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        for _ in 0..2 {
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/search?fail=1").to_request(),
            )
            .await;
            assert_eq!(resp.status(), StatusCode::INTERNAL_SERVER_ERROR);
            assert_eq!(cache_header(&resp), Some("MISS".to_string()));
        }

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn non_whitelisted_paths_bypass() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        for _ in 0..2 {
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/other?a=1").to_request(),
            )
            .await;
            assert!(cache_header(&resp).is_none());
        }

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn zero_ttl_disables() {
        let counter = test_counter();
        let app =
            test_app!(QueryCache::with_limits(Duration::ZERO, 512), counter.clone()).await;

        for _ in 0..2 {
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/search?seasons=2001").to_request(),
            )
            .await;
            assert!(cache_header(&resp).is_none());
        }

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn players_bypass_outside_search_family() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        // Only /search* is cacheable: per-id lookups always recompute.
        for _ in 0..2 {
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri("/players/42").to_request(),
            )
            .await;
            assert_eq!(resp.status(), StatusCode::OK);
            assert!(cache_header(&resp).is_none());
        }

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn equivalent_forms_share_entry() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        // All of these process to identical params (defaults, clamps,
        // unknown codes falling back): one computation total. Bodies
        // differ only because the probe echoes the raw query string.
        for query in ["", "limit=50", "limit=50&page=0", "sort=g", "penalty=ip"] {
            let uri = if query.is_empty() {
                "/search".to_string()
            } else {
                format!("/search?{query}")
            };
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get().uri(&uri).to_request(),
            )
            .await;
            assert_eq!(resp.status(), StatusCode::OK);
        }

        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[actix_web::test]
    async fn distinct_params_do_not_share() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        for query in ["comps=GB1", "comps=ES1"] {
            let resp = actix_test::call_service(
                &app,
                actix_test::TestRequest::get()
                    .uri(&format!("/search?{query}"))
                    .to_request(),
            )
            .await;
            assert_eq!(resp.status(), StatusCode::OK);
        }

        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }

    #[actix_web::test]
    async fn malformed_query_falls_back_to_raw_key() {
        let counter = test_counter();
        let app = test_app!(QueryCache::with_limits(Duration::from_secs(3600), 512), counter.clone()).await;

        // `page=abc` fails to parse (the handlers reject it too): served
        // consistently under the raw-URI fallback key instead.
        let first = actix_test::call_service(
            &app,
            actix_test::TestRequest::get().uri("/search?page=abc").to_request(),
        )
        .await;
        assert_eq!(cache_header(&first), Some("MISS".to_string()));
        let second = actix_test::call_service(
            &app,
            actix_test::TestRequest::get().uri("/search?page=abc").to_request(),
        )
        .await;
        assert_eq!(cache_header(&second), Some("HIT".to_string()));

        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[actix_web::test]
    async fn guard_signals_on_drop() {
        let (tx, mut rx) = watch::channel(false);
        // Mark the initial value seen, so only a real send completes below.
        rx.borrow_and_update();
        {
            let _guard = LeaderGuard { tx: Some(tx) };
            // Dropped here without disarm: must still signal.
        }
        assert!(rx.changed().await.is_ok());
        assert!(*rx.borrow());
    }

    #[actix_web::test]
    async fn disarmed_guard_stays_quiet() {
        let (tx, mut rx) = watch::channel(false);
        rx.borrow_and_update();
        {
            let mut guard = LeaderGuard { tx: Some(tx) };
            guard.disarm();
        }
        // Disarming drops the only sender without sending: the channel
        // closes with no value, rather than timing out.
        let result = tokio::time::timeout(Duration::from_millis(50), rx.changed()).await;
        assert!(
            matches!(result, Ok(Err(_))),
            "disarmed guard must not send, got {result:?}"
        );
    }

    #[actix_web::test]
    async fn dead_leader_slot_does_not_hang() {
        let counter = test_counter();
        let cache = QueryCache::with_limits(Duration::from_secs(3600), 512);
        // Plant a completed-but-empty slot, exactly what a cancelled
        // leader's guard leaves behind: signalled, nothing stored.
        {
            let (tx, _rx) = watch::channel(false);
            cache.inner.inflight.lock().await.insert("/search?a=9".to_string(), tx);
            let _ = cache
                .inner
                .inflight
                .lock()
                .await
                .get("/search?a=9")
                .expect("just inserted")
                .send(true);
            // No receivers yet, so Err is expected: ignore it.
        }
        let app = test_app!(cache, counter.clone()).await;

        let resp = actix_test::call_service(
            &app,
            actix_test::TestRequest::get().uri("/search?a=9").to_request(),
        )
        .await;
        // Reclaimed and computed, not hung: MISS, handler ran once.
        assert_eq!(cache_header(&resp), Some("MISS".to_string()));
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }
}
