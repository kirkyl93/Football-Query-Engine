# Seeded integration tests

Populate a **new dedicated Postgres database once before the suite**, then run read-only tests in parallel. Tests do not insert, truncate, refresh, or reset shared data. Mutation tests added later should use their own isolated database/schema.

All integration tests now use this fixture through `tests/common/mod.rs`. They require only `TEST_DATABASE_URL`, not a downloaded football dataset or the development database. Seed once before starting the suite; individual tests are read-only.

Player queries use the shared `SearchParamsBuilder` in `tests/common/search_params_builder.rs`, retaining named filter methods and typed enums. For example, `.minimum_goals(1).maximum_goals(1).penalty(PenaltyOption::OnlyPenalties)` describes exactly one penalty goal. The HTTP harness serializes the builder through `SearchParams`, including URL encoding. Parameterized cases reuse builders with `clone()` and `with_filters()`; the latter overrides only explicitly set fields, preserving omitted bounds and explicit zero values. Club endpoint queries use their separate parameter names.

## Run locally or in CI

Use PostgreSQL 18 and its `psql` client, matching the schema dump. Create an empty database named, for example, `football_game_test`, and set `TEST_DATABASE_URL` to that database. The bootstrap checks the database name before applying any schema and refuses an already populated schema; it never drops or truncates anything.

For local Rust tests, you can instead put this in `backend/.env`:

```dotenv
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5432/football_game_test
```

The test helper loads `.env` from the working directory or a parent directory. Environment variables supplied by your terminal, IDE or CI take precedence. It still requires `TEST_DATABASE_URL`; `DATABASE_URL` is never used as a fallback. This automatic loading applies to the Rust tests; the `psql` bootstrap command still needs connection details passed explicitly.

From the repository root (PowerShell; replace credentials/port with your disposable test server):

```powershell
$env:TEST_DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/football_game_test'
psql -X --dbname=$env:TEST_DATABASE_URL --file=backend/tests/fixtures/bootstrap.sql
if ($LASTEXITCODE -ne 0) { throw 'Test database bootstrap failed' }
Push-Location backend
cargo test --locked --all-targets
Pop-Location
```

For a Linux CI job with `TEST_DATABASE_URL` set and an empty Postgres service database:

```sh
psql -X --dbname="$TEST_DATABASE_URL" --file=backend/tests/fixtures/bootstrap.sql
cd backend
cargo test --locked --all-targets
```

The bootstrap uses the real root `dbschema.sql`, inserts `football.sql`, `extra_time.sql` and `half_time.sql`, and refreshes `appearances_enhanced` followed by `appearances_with_event_times`. After all seed files have loaded, bootstrap records version 1 for the complete fixture, which tests require. The separate seed files do not have individual versions. Recreate an older fixture in a new empty test database. Tests **never fall back to `DATABASE_URL`**; local `.env` loading reads the explicitly configured `TEST_DATABASE_URL`. A fresh CI database is seeded once per job; when rerunning tests locally, an unchanged seeded database can be reused without rerunning bootstrap. For unit tests without Postgres, run `cargo test --locked --lib`.

## GitHub Actions

`.github/workflows/ci.yml` runs on pull requests and pushes to `master`, with an optional manual run. Separate jobs execute:

- Frontend: Node 24, `npm ci`, the full Vitest suite with two workers, and the production build.
- Backend: stable Rust, a healthy Postgres 18 service, the guarded schema/fixture bootstrap once, then `cargo test --locked --all-targets`.

The backend uses the Postgres service's own `psql` via `docker exec`; the schema dump contains client commands that require a compatible client version. CI copies the schema and fixture directory into the container preserving their relative paths, then runs the same `bootstrap.sql` used locally. It does not maintain a second schema or seed implementation. npm/Cargo dependencies are cached; databases are always fresh. No real-database credentials or LLM provider keys are required.

The workflow becomes active when the changes are pushed to GitHub. Running the job on GitHub remains the final check of the hosted-runner/container environment.

## Coverage map

The original 18 historical-data tests supplied the coverage baseline, not a required set of names or literal values. Their behaviors are now covered by these fixture suites:

| Original coverage | New coverage |
|---|---|
| Overall scorers and all response metrics | Complete independently calculated `expected/gb1_overall.json`, checked against every returned player through direct and event-derived queries |
| Goals, assists, combined, yellow/red sorting | All 12 aggregate sorts, including appearances/minutes and five ratio sorts, with exact ranks/order for overall and season scope in both sources (48 query variants) |
| Season filters and grouping | Exact 2024 and 2025 totals; single/multiple season filters; season-sort matrix; combined name/home/penalty/appearance filters |
| Citizenship and minimum appearances | Two-country OR lists; low-appearance leader excluded at the inclusive threshold; explicit empty results beyond the threshold |
| Position and minute filters | Defender's early goal excluded from minutes 3–90; exact goals/cards/appearances/minutes |
| Substitute, club, minute, penalty and scope combinations | Exact aggregates for club 103, GB1/CL, earliest/latest entry bounds and partial-window penalty exclusion |
| Game-level first-half filters and mapped fields | Correct 1–45 interval with a complete expected player/match object |
| Game assist sort, multiple seasons/competitions, age/height | Exact returned games plus birthday equality and rejecting height examples; three game sorts and all penalty modes through both sources |
| Four occurrence-count query paths | Exact qualifying game/season groups and ranks; per-season and overall game scopes; no/minute-filter variants |
| Minimum/maximum goals, assists and combined | Exact equality, just-outside exclusions, conflicting bounds, zero versus absent/legacy unbounded bounds, all zero maxima in both sources |
| Club search | Exact complete results, token/case matching, capacity ordering, pagination, empty results and literal wildcard escaping |
| Additional correctness | Global rank across pages, transfers without duplicate seasons, historical clubs/opponents/home/away, null ratio mapping, boundary tests and fixture integrity |

`boundary_tests.rs` covers same-minute substitution goals/assists, duration ceilings and card/window boundaries. `extra_time_tests.rs` adds eight tests for full 120-minute appearances, period boundaries, substitutions at 90/105, penalties, ratios, counts and dismissals at 120. Expected results come from the ledger and named fixture values, not database-generated snapshots. Assertions compare complete small result sets; field projections keep focused tests readable. Club-list order is normalized because SQL does not specify `STRING_AGG` order; tied rows without a season tiebreaker are compared without assuming one.

`filter_coverage_tests.rs` supplements this with combined season-count bounds, multi-position/played-for/opponent lists, substitute-entry bounds across aggregate/game/count queries, player-name token alternatives and literal wildcards, and game pagination. Cases use both recorded appearances and explicit minute windows.

`player_appearances_tests.rs` calls the player-page endpoint `/players/1/games` for Alex Striker and compares all six complete game responses, in chronological order, with `expected/alex_appearances.json`. Expectations come from the ledger, including goal/assist/penalty timestamps, match results, and his transfer to Riverside. Bootstrap populates `games.competition_type` from the competition so this endpoint's existing type filter works against the seed.

## Boundary conventions

- Goal/assist/card timestamps use inclusive bounds: 1–45 includes 45 and excludes 46.
- The substitution minute counts for both outgoing and incoming players. A player coming on and scoring or assisting at 60 has one appearance and one credited minute in a 60–60 query.
- Calculate the inclusive overlap with the playing interval, including a substitution off time when present. Cap credited minutes by the player's recorded minutes and the selected window's length. There is no fixed 90-minute ceiling: a full extra-time appearance retains 120 minutes. A 46–90 window still has a ceiling of 45.
- A player recorded as playing 30 minutes after entering at 60 still receives at most 30 for a 60–90 query, rather than the raw inclusive estimate of 31.
- A positive credited duration means an appearance. A window entirely before entry or after exit does not count as an appearance with zero contributions. Appearance inclusion and duration use the same expression.
- Dismissals count at the exit minute. A player dismissed at 80 is absent in 81–90.
- A second yellow within the window produces a dismissal even if the first yellow was before the window; only yellows within the window contribute to the window's yellow count.
- Minute 0 is the start boundary, not an extra played minute: 0–45 and 1–45 are both capped at 45. Explicit windows 0–90, 1–90, and 1–120 must preserve a standard 90-minute appearance's duration.

The source records whole minutes rather than seconds. These are capped estimates for each query window, not exact sub-minute chronology; independently capped windows need not add up to the same value as a larger window. The seed deliberately puts a goal at the minute-60 substitution and an assist at the minute-45 substitution.

## Fixture ledger

IDs: Alex Striker = 1; Jamie Creator = 2; Sam Defender = 3; David Finch = 4; David Vale = 5; Pat Forward = 6.

Clubs: Northbridge = 101; Riverside = 102; Hilltown = 103; Leeds Grove = 301; Lee Harbour = 302. Autocomplete `lee` matches 301 then 302, ordered by stadium capacity.

| Player | Citizenship | Position | Height | Born | Current club |
|---|---|---|---:|---|---:|
| Alex | England | CF | 180 | 2006-08-17 | 102 |
| Jamie | Spain | CM | 175 | 2000-02-01 | 101 |
| Sam | England | CB | 190 | 1990-01-01 | 101 |
| Finch | Togo | CF | 185 | 1995-01-01 | 103 |
| Vale | Australia | CF | 185 | 1995-01-01 | 103 |
| Pat | France | CF | 180 | 2002-01-01 | 103 |

| Game | Date | Season/competition | Home vs away | Score |
|---|---|---|---|---|
| G1 | 2024-08-10 | 2024 / GB1 | Northbridge vs Riverside | 3–1 |
| G2 | 2024-08-17 | 2024 / GB1 | Riverside vs Northbridge | 2–2 |
| G3 | 2024-09-07 | 2024 / GB1 | Northbridge vs Hilltown | 3–2 |
| G4 | 2025-08-10 | 2025 / GB1 | Hilltown vs Northbridge | 1–1 |
| G5 | 2025-08-17 | 2025 / GB1 | Northbridge vs Riverside | 1–2 |
| G6 | 2024-10-01 | 2024 / CL | Northbridge vs Hilltown | 4–2 |
| G7 | 2024-08-24 | 2024 / ES1 | Leeds Grove vs Lee Harbour | 3–0 |

`P` = penalty; `scorer ← assistant` describes one goal event, not two rows.

| Game | Goal events | Cards and substitutions |
|---|---|---|
| G1 | 10 Alex ← Jamie; 45 Alex P; 46 Jamie ← Alex; 85 Finch | Sam yellows 20/80, leaves at 80; Finch yellow 30 |
| G2 | 15 Finch; 77 Jamie ← Alex; 78 Finch P; 90 Jamie | Sam straight red 60, leaves at 60 |
| G3 | 2 Sam; 46 Alex ← Jamie; 60 Vale; 85 Alex ← Jamie; 88 Vale | Sam yellow 10; Pat off/Vale on at 60 |
| G4 | 15 Alex ← Jamie; 20 Finch | Vale yellows 45/46, leaves at 46 |
| G5 | 10 Alex; 45 Jamie; 88 Alex P | Alex now plays for Riverside |
| G6 | 10 Alex ← Jamie; 45 Alex P; 45 Pat ← Vale; 46 Alex ← Jamie; 85 Alex ← Jamie; 88 Vale P | Pat off/Vale on at 45 |
| G7 | 15 Pat ← Vale; 45 Pat ← Vale; 85 Pat ← Vale | No cards/substitutions |

All appearances are 90 minutes except Sam G1 = 80 and G2 = 60; Vale G3 = 30, G4 = 46, G6 = 45; Pat G3 = 60 and G6 = 45. Pat and Vale are Hilltown players in G3/G6 and Leeds Grove players in G7. Finch plays for Riverside in G1/G2 and Hilltown in G4. Alex/Jamie/Sam play for Northbridge except Alex's G5 transfer. Only participants listed in the SQL have an appearance; no complete squad is required.

| GB1 totals | Apps | Goals | Assists | Penalties | Minutes | Yellows | Effective reds |
|---|---:|---:|---:|---:|---:|---:|---:|
| Alex | 5 | 7 | 2 | 2 | 450 | 0 | 0 |
| Jamie | 5 | 4 | 4 | 0 | 450 | 0 | 0 |
| Sam | 5 | 1 | 0 | 0 | 410 | 3 | 2 |
| Finch | 3 | 4 | 0 | 1 | 270 | 1 | 0 |
| Vale | 2 | 2 | 0 | 0 | 76 | 2 | 1 |
| Pat | 1 | 0 | 0 | 0 | 60 | 0 | 0 |

Raw appearance reds contain straight reds only; the search adds double-yellow dismissals. Raw appearance totals and every goal/assist/card are checked against the seed events by a separate fixture-integrity test. The base pack has 28 appearances and 36 events. With the extra-time and half-time packs, both real materialized views must contain 36 rows and the event table must contain 52 rows.

The 13 boundary tests check 45/46 event inclusion, same-minute goals and assists after substitution, capped match/half/window durations, full-match duration consistency, nonzero same-minute goal/assist ratios, late zero-contribution appearances, game and season counts, cross-window second yellows, straight reds, and disappearance after dismissal. They assert complete returned row identities and relevant numeric fields, not just successful execution.

## Extra-time ledger

`extra_time.sql` adds four players and two CL games in season 2024, using the existing clubs. This leaves the GB1 baseline unchanged. Terry Timer = 7; Nora Ninety = 8; Owen Outgoing = 9; Quinn Late = 10.

| Game | Date | Match and score | Recorded appearances |
|---|---|---|---|
| G8 | 2024-11-01 | Leeds Grove vs Lee Harbour, 4–0 | Leeds: Terry 120 minutes; Owen 90; Nora 30, on at 90 |
| G9 | 2024-11-08 | Lee Harbour vs Leeds Grove, 5–0 | Lee: Terry 120 minutes; Owen 105; Quinn 15, on at 105 |

| Game | Goal events | Cards and substitutions |
|---|---|---|
| G8 | 90 Terry; 91 Nora; 105 Terry ← Nora; 120 Terry | Terry yellow 105; Owen off/Nora on at 90 |
| G9 | 105 Owen; 105 Quinn ← Owen; 106 Terry ← Quinn; 120 Terry; 120 Quinn P | Terry yellows 106/120; Owen off/Quinn on at 105 |

Terry totals two appearances, 240 minutes, five goals, three yellows and one effective red; minutes per goal is 48. Owen retains 105 minutes in G9 and 195 across both games. Direct and explicitly filtered 1–120 queries must agree on those totals.

For Terry in G8, 1–90 returns 90 minutes and one goal; 91–120 returns 30 minutes and two goals. Splitting extra time into 91–105 and 106–120 returns 15 minutes and one goal each. Single-minute checks cover 90, 91, 105, 106 and 120. A 0–119 query returns 119 minutes and excludes his goal at 120.

Nora's 90–120 interval stays capped at her recorded 30 minutes; Quinn's 105–120 stays capped at 15. At 105, both Owen and Quinn have one credited minute, and Owen's assist on Quinn's goal is included. Owen disappears from every search/count path after his exit. Quinn's late penalty changes goal totals and ratios in all three penalty modes. Terry's second yellow at 120 counts as a dismissal even when the first yellow at 106 is outside the selected window.

These are explicit integer timestamps in the database. They test extra time through minute 120 without assuming how an upstream source normalizes stoppage-time labels such as `90+3`.

## Half-time ledger

`half_time.sql` adds Harper Half (11), Francis First (12), and G10: Leeds Grove vs Lee Harbour, 1–0, FR1/2024 on 2024-12-01. Francis is replaced by Harper at minute 46; both have 45 recorded minutes. Harper scores at 46. For Harper, 1–45 returns no appearance, 46–46 includes one minute and one goal, 46–90 and 1–120 retain 45 minutes, and minute 90 counts. Neither 91–91 nor 91–120 returns an appearance or a qualifying zero-contribution game/season. This follows the existing `appearances_with_event_times` endpoint correction; the minute-45 substitution in G6 remains a separate same-minute assist scenario.
