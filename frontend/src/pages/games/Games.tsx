import {useEffect, useId, useMemo, useRef, useState, type ReactNode} from "react";
import {Link, useParams} from "react-router-dom";
import PlayerSearchBar from "../../components/PlayerSearchBar";
import {convertDateStringToDate, formatSeason} from "../../lib/DateUtils";
import {useMediaQuery} from "../player/hooks/useMediaQuery";
import searchStyles from "../search/Search.module.css";
import {guestToken, quizRequest} from "./api";
import type {Clue, QuizView} from "./api";
import {QuizTable, type QuizDetailSelection} from "./QuizTable";
import {SearchDetailsModal} from "../search/components/SearchDetailsModal";
import {useSearchFiltersFromUrl} from "../search/hooks/useSearchFiltersFromUrl";
import type {DetailGame} from "../search/lib/searchDetails";
import {formatMinutesPerEvent} from "../search/lib/smallScreenStat";
import shared from "../../styles/shared.module.css";
import styles from "./Games.module.css";

const DAILY = "/games/daily-quiz";
const ARCHIVE = DAILY + "/archive";
export const CAREER_GAME = "/games/guess-the-player";
export const CAREER_ARCHIVE = CAREER_GAME + "/archive";
export const quizPageClass = `${styles.quizPage} ${searchStyles["content-wrapper"]}`;

export function QuizPageHeading({title, children}: {title: string; children: ReactNode}) {
    return (
        <header className={styles.quizPageHeading}>
            <h1 className={styles.quizTitle}>{title}</h1>
            <nav className={styles.quizNav} aria-label="Games navigation">{children}</nav>
        </header>
    );
}

export function GamesPage() {
    return (
        <main className={styles.gamesPage}>
            <h1 className={styles.gamesTitle}>Games</h1>
            <div className={styles.gameCards}>
                <section className={styles.gameCard} aria-labelledby="daily-game-title">
                    <div className={styles.gameIntro}>
                        <h2 id="daily-game-title">Daily Quiz</h2>
                        <p>Guess the footballers who match today’s search.</p>
                    </div>
                    <div className={styles.gameActions}>
                        <Link to={DAILY} className={`${shared["apply-button"]} ${styles.playLink}`}>
                            Play daily quiz <span aria-hidden="true">→</span>
                        </Link>
                        <Link to={ARCHIVE} className={styles.archiveLink}>Past quizzes</Link>
                    </div>
                </section>
                <section className={styles.gameCard} aria-labelledby="career-game-title">
                    <div className={styles.gameIntro}>
                        <h2 id="career-game-title">Guess the Player</h2>
                        <p>Guess the footballer before their career clues give them away.</p>
                    </div>
                    <div className={styles.gameActions}>
                        <Link to={CAREER_GAME} className={`${shared["apply-button"]} ${styles.playLink}`}>
                            Play Guess the Player <span aria-hidden="true">→</span>
                        </Link>
                        <Link to={CAREER_ARCHIVE} className={styles.archiveLink}>Past quizzes</Link>
                    </div>
                </section>
            </div>
        </main>
    );
}

type DailyArchiveEntry = [date: string, question: string, id?: number, completed?: boolean];
type CareerArchiveEntry = [date: string, id: number, slot: number, completed?: boolean];
interface ArchiveEntry {date: string; id?: number; label: string; completed: boolean}

const archiveDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function formatQuizDate(date: string) {
    return archiveDate.format(convertDateStringToDate(date));
}

export function QuizArchive({game = 'daily'}: {game?: 'daily' | 'career'}) {
    const isCareer = game === "career";
    const today = isCareer ? CAREER_GAME : DAILY;
    const archive = isCareer ? CAREER_ARCHIVE : ARCHIVE;
    const [entries, setEntries] = useState<ArchiveEntry[]>();
    const [error, setError] = useState("");
    useEffect(() => {
        const request = new AbortController();
        const token = guestToken();
        const load = isCareer
            ? quizRequest<CareerArchiveEntry[]>("/career/archive", token, undefined, request.signal)
                .then(rows => rows.map(([date, id, slot, completed = false]) => {
                    const action = completed ? "Review quiz" : "Play quiz";
                    return {date, id, completed, label: slot === 1 ? action : action + " " + slot};
                }))
            : quizRequest<DailyArchiveEntry[]>("/archive", token, undefined, request.signal)
                .then(rows => rows.map(([date, question, id, completed = false]) => ({date, id, completed, label: question})));
        void load.then(
            value => { if (!request.signal.aborted) setEntries(value); },
            error => { if (!request.signal.aborted) setError(error.message); },
        );
        return () => request.abort();
    }, [isCareer]);
    return (
        <main className={quizPageClass}>
            <QuizPageHeading title={isCareer ? "Past Guess the Player quizzes" : "Past quizzes"}>
                <Link to="/games">All games</Link>
                <Link to={today}>Today’s quiz</Link>
            </QuizPageHeading>
            {error ? <p className={styles.quizError} role="alert">{error}</p> :
                !entries ? <p className={styles.quizStatus} role="status">Loading quizzes…</p> :
                entries.length === 0 ? <p className={styles.quizStatus}>No past quizzes yet.</p> :
                    <ul className={styles.archiveList}>
                        {entries.map(({date, label, id, completed}) => (
                            <li key={id ?? date} className={styles.archiveRow}>
                                <time dateTime={date}>{formatQuizDate(date)}</time>
                                <Link to={archive + "/" + (id ?? date)}
                                    aria-label={[label, isCareer && formatQuizDate(date), completed && "Completed"].filter(Boolean).join(" · ")}>
                                    {label}
                                    <span className={styles.archiveRowEnd}>
                                        {completed && <span className={styles.archiveCompleted}>Completed</span>}
                                        <span className={styles.archiveArrow} aria-hidden="true">→</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>}
        </main>
    );
}

interface Standing { rank: number, total: number, display_name: string, score: number, yours: boolean }

export function DailyQuizPage() {
    const {quizKey} = useParams();
    return <Quiz key={quizKey ?? "today"} quizKey={quizKey}/>;
}

function Quiz({quizKey}: {quizKey?: string}) {
    const [quiz, setQuiz] = useState<QuizView | null>();
    const [standings, setStandings] = useState<Standing[]>();
    const [standingsError, setStandingsError] = useState("");
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{points: number; wrong: boolean; sequence: number}>();
    const [busy, setBusy] = useState(false);
    const [detail, setDetail] = useState<QuizDetailSelection>();
    const quizId = quiz?.id ?? quiz?.date;
    const detailContext = quiz?.detail_context ?? "";
    const detailFilters = useSearchFiltersFromUrl(detailContext);
    const detailSource = useMemo(() => {
        if (!detail || !quizId) return;
        const path = `/${quizId}/details/${detail.result.player_id}/${detail.rowIndex}${detail.review ? "?review=true" : ""}`;
        const guest = guestToken();
        return {
            key: `quiz:${guest}:${path}`,
            load: (signal: AbortSignal) => quizRequest<DetailGame[]>(path, guest, undefined, signal),
        };
    }, [detail, quizId]);
    const displayName = quiz?.display_name;
    const canSeeBoard = quiz?.finished === true;

    useEffect(() => {
        const request = new AbortController();
        void quizRequest<QuizView | null>(quizKey ? "/archive/" + encodeURIComponent(quizKey) : "/today",
            guestToken(), undefined, request.signal).then(setQuiz,
            error => { if (!request.signal.aborted) setError(error.message); });
        return () => request.abort();
    }, [quizKey]);

    useEffect(() => {
        if (!quizId || !canSeeBoard) return;
        const request = new AbortController();
        void quizRequest<Standing[]>("/" + quizId + "/leaderboard", guestToken(), undefined, request.signal)
            .then(entries => {
                if (request.signal.aborted) return;
                setStandings(entries);
                setStandingsError("");
            }, error => { if (!request.signal.aborted) setStandingsError(error.message); });
        return () => request.abort();
    }, [quizId, canSeeBoard, displayName]);

    async function update(action: "guess" | "finish" | "answers" | "hint", body?: object) {
        if (!quiz || !quizId || busy) return;
        setBusy(true);
        setError("");
        if (action === "finish" || action === "hint") setFeedback(undefined);
        try {
            const updated = await quizRequest<QuizView>("/" + quizId + "/" + action, guestToken(), body);
            if (action === "guess") {
                const points = updated.score - quiz.score;
                const wrong = points < 0 || (updated.wrong_guess_count ?? 0) > (quiz.wrong_guess_count ?? 0);
                setFeedback(previous => ({points, wrong, sequence: (previous?.sequence ?? 0) + 1}));
            }
            setQuiz(previous => previous?.answers_revealed && !updated.answers_revealed
                ? {...updated, answers_revealed: true, rows: previous.rows}
                : updated);
        } catch (error) {
            setError((error as Error).message);
        } finally {
            setBusy(false);
        }
    }

    const canGuess = quiz && !quiz.finished;
    const canJoinBoard = quiz?.finished && !displayName;
    const buttonClass = `${shared["apply-button"]} ${styles.quizButton}`;
    return (
        <main className={quizPageClass}>
            <QuizPageHeading title="Daily Quiz">
                <Link to="/games">All games</Link>
                {quizKey && <Link to={DAILY}>Today’s quiz</Link>}
                <Link to={ARCHIVE}>Past quizzes</Link>
                {canSeeBoard && <a href="#quiz-leaderboard">Leaderboard</a>}
            </QuizPageHeading>
            {error && <p className={styles.quizError} role="alert">{error}</p>}
            {quiz === undefined && !error && <p className={styles.quizStatus} role="status">Loading…</p>}
            {quiz === null && <p className={styles.quizStatus}>There’s no quiz scheduled for today.</p>}
            {quiz && (
                <>
                    <header className={styles.quizHeader}>
                        <h2 className={styles.question}>{quiz.question}</h2>
                        <dl className={styles.scoreboard} aria-label="Quiz score">
                            <div className={styles.scoreMetric}>
                                <dt>Points</dt>
                                <QuizScore score={quiz.score} maximum={quiz.max_score} change={feedback?.points}/>
                            </div>
                            <div className={styles.scoreMetric}>
                                <dt>Players found</dt>
                                <dd>{quiz.found}<span className={styles.scoreTotal}> / {quiz.total}</span></dd>
                                <progress className={styles.quizProgress} value={quiz.found} max={quiz.total || 1}
                                    aria-label="Players found"/>
                            </div>
                        </dl>
                    </header>
                    {canGuess && (
                        <div className={styles.quizControls}>
                            <label className={styles.controlLabel} htmlFor="quiz-player">Your guess</label>
                            <PlayerSearchBar inputId="quiz-player" placeHolderText="Find a player…" linkToPlayer={false}
                                variant="inline" onSelectPlayerId={playerId => void update("guess", {player_id: playerId})}
                                disabled={busy}/>
                            <button type="button" className={buttonClass} disabled={busy} onClick={() => {
                                if (window.confirm("Finish this attempt and lock your score?")) void update("finish", {});
                            }}>Finish quiz</button>
                        </div>
                    )}
                    <div role="status">
                        {feedback && <span key={feedback.sequence} className={styles.guessFeedback}
                            data-outcome={feedback.wrong ? "incorrect" : outcome(feedback.points)}>{guessMessage(feedback.points, feedback.wrong)}</span>}
                        {quiz.answers_revealed && <span className={styles.srOnly}>Answers revealed</span>}
                    </div>
                    {quiz.finished && (
                        <div className={styles.reviewActions}>
                            {quiz.answers_revealed ? (
                                <div className={styles.answerLegend} role="group" aria-label="Answer colors">
                                    <span className={styles.foundAnswer}>Found</span>
                                    <span className={styles.missedAnswer}>Missed</span>
                                </div>
                            ) : <button type="button" className={buttonClass} disabled={busy}
                                onClick={() => void update("answers")}>Reveal answers</button>}
                        </div>
                    )}
                    {canJoinBoard && <LeaderboardNameForm inputId="quiz-display-name" busy={busy}
                        onJoin={name => void update("finish", {display_name: name})}/>}
                    {quizId && !!quiz.wrong_guess_count &&
                        <WrongGuesses key={quizId} quizId={quizId} count={quiz.wrong_guess_count}/>}
                    <QuizTable rows={quiz.rows} onViewDetails={setDetail} filterState={detailFilters} review={quiz.answers_revealed}
                        wrongGuessPenalty={quiz.wrong_guess_penalty} hintCost={quiz.hint_cost}
                        compactStats={quiz.question_stats}
                        hintsBusy={busy} onBuyHint={canGuess ? (row, kind) => void update("hint", {row, kind}) : undefined}/>
                    {detail && detailSource && <SearchDetailsModal
                        result={detail.result} search={detailContext} filterState={detailFilters}
                        source={detailSource} subtitle={quiz.question} onClose={() => setDetail(undefined)}/>}
                    {canSeeBoard && <QuizLeaderboard standings={standings} error={standingsError}/>}
                </>
            )}
        </main>
    );
}

interface WrongGuess {
    player_id: number;
    name: string;
    points: number;
    stats?: Clue["stats"][];
}

function WrongGuesses({quizId, count}: {quizId: number | string; count: number}) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    return (
        <div className={styles.wrongGuesses}>
            <button type="button" className={styles.wrongGuessesToggle} aria-expanded={open}
                aria-controls={panelId} onClick={() => setOpen(previous => !previous)}>
                {open ? "Hide" : "Show"} wrong guesses ({count})
            </button>
            <div id={panelId} hidden={!open}>
                {open && <WrongGuessTable quizId={quizId} count={count}/>}
            </div>
        </div>
    );
}

function WrongGuessTable({quizId, count}: {quizId: number | string; count: number}) {
    const [result, setResult] = useState<{count: number; guesses: WrongGuess[]; error?: string}>();

    useEffect(() => {
        const request = new AbortController();
        void quizRequest<WrongGuess[]>("/" + quizId + "/wrong-guesses", guestToken(), undefined, request.signal)
            .then(guesses => {
                if (!request.signal.aborted) setResult({count, guesses});
            }, error => {
                if (!request.signal.aborted) setResult({count, guesses: [], error: error.message});
            });
        return () => request.abort();
    }, [quizId, count]);

    if (result?.count !== count) return <p className={styles.quizStatus} role="status">Loading wrong guesses…</p>;
    if (result.error) return <p className={styles.quizError} role="alert">{result.error}</p>;
    if (!result.guesses.length) return <p className={styles.quizStatus}>No wrong guesses yet.</p>;

    const stats = result.guesses.flatMap(guess => guess.stats ?? []);
    const fields = new Set(stats.flatMap(row => Object.keys(row)));
    const columns = Object.entries(wrongGuessStatLabels).filter(([field]) => fields.has(field));
    const statFields = columns.map(([field]) => field);
    const context = fields.has("date") ? "Match" : fields.has("season") ? "Season" : fields.has("competition_name") ? "Competition" : undefined;
    return (
        <div className={styles.wrongGuessTableWrap} tabIndex={0} role="region" aria-label="Wrong guess results">
            <table className={styles.wrongGuessTable} aria-label="Wrong guesses">
                <thead><tr>
                    <th scope="col">Player</th>
                    {context && <th scope="col">{context}</th>}
                    {columns.map(([field, label]) => <th key={field} scope="col" className={styles.wrongGuessNumber}>{label}</th>)}
                    <th scope="col" className={styles.wrongGuessNumber}>Penalty</th>
                </tr></thead>
                {result.guesses.map(guess => (
                    <WrongGuessRows key={guess.player_id} guess={guess} fields={statFields}
                        showContext={context !== undefined}/>
                ))}
            </table>
        </div>
    );
}

const wrongGuessStatLabels = {
    total_appearances: "Apps", total_goals: "Goals", total_assists: "Assists", goals_and_assists: "Goals + assists",
    total_minutes_played: "Mins",
    total_yellow_cards: "Yellows", total_red_cards: "Reds", goals: "Goals", assists: "Assists", minutes_played: "Mins",
    number_of_games: "Matching games", number_of_seasons: "Matching seasons",
    mins_per_goal: "Mins per goal", mins_per_assist: "Mins per assist", mins_per_goal_or_assist: "Mins per goal or assist",
    mins_per_yellow: "Mins per yellow", mins_per_red: "Mins per red",
};

function WrongGuessRows({guess, fields, showContext}: {guess: WrongGuess; fields: string[]; showContext: boolean}) {
    const [expanded, setExpanded] = useState(false);
    const otherCount = (guess.stats?.length ?? 0) - 1;
    const rows = guess.stats?.length ? (expanded ? guess.stats : guess.stats.slice(0, 1)) : [undefined];
    return <tbody>
        {rows.map((row, index) => (
            <tr key={index}>
                {index === 0 && <th scope="rowgroup" rowSpan={rows.length}>
                    {guess.name}
                    {otherCount > 0 && <button type="button" className={styles.wrongGuessMore} aria-expanded={expanded}
                        onClick={() => setExpanded(value => !value)}>
                        {expanded ? "Hide" : "Show"} other results ({otherCount})
                    </button>}
                    {guess.stats?.length === 0 && <small className={styles.wrongGuessNoStats}>No matches under the quiz filters.</small>}
                </th>}
                {showContext && <td>{wrongGuessPeriod(row)}</td>}
                {fields.map(field => {
                    const value = row?.[field];
                    const shown = field.startsWith("mins_per_") && typeof value === "number"
                        ? formatMinutesPerEvent(value) : value ?? "—";
                    return <td key={field} className={styles.wrongGuessNumber}>{shown}</td>;
                })}
                {index === 0 && <td rowSpan={rows.length} className={styles.wrongGuessNumber + " " + styles.wrongGuessPoints}>
                    {guess.points === 0 ? "0" : "−" + Math.abs(guess.points)}
                </td>}
            </tr>
        ))}
    </tbody>;
}

function wrongGuessPeriod(row: Clue["stats"] | undefined) {
    const period = typeof row?.date === "string" ? formatQuizDate(row.date) :
        typeof row?.season === "number" ? formatSeason(row.season) : undefined;
    return [period, row?.competition_name].filter(Boolean).join(" · ") || "—";
}

function outcome(points: number) {
    return points > 0 ? "correct" : points < 0 ? "incorrect" : "repeat";
}

function guessMessage(points: number, wrong: boolean) {
    if (points === 0) return wrong ? "Incorrect." : "You already guessed that player.";
    const amount = Math.abs(points);
    const unit = amount === 1 ? "point" : "points";
    return points > 0 ? `Correct. +${amount} ${unit}.` : `Incorrect. −${amount} ${unit}.`;
}

function QuizScore({score, maximum, change}: {score: number; maximum?: number; change?: number}) {
    const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const [displayedScore, setDisplayedScore] = useState(score);
    const lastFrameScore = useRef(score);

    useEffect(() => {
        const from = lastFrameScore.current;
        if (reducedMotion || from === score) {
            lastFrameScore.current = score;
            setDisplayedScore(score);
            return;
        }

        let started: number | undefined;
        const duration = 360;
        let frame: number;
        function tick(now: number) {
            started ??= now;
            const progress = Math.min(1, (now - started) / duration);
            const next = from + (score - from) * progress;
            lastFrameScore.current = next;
            setDisplayedScore(next);
            if (progress < 1) frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [score, reducedMotion]);

    const shown = reducedMotion ? score : displayedScore;
    const points = Math.max(0, shown);
    const fraction = maximum ? points / maximum : 0;
    const band = fraction >= 2 / 3 ? "high" : fraction >= 1 / 3 ? "medium" : "low";

    return (
        <dd className={styles.pointsScore} data-band={maximum === undefined ? undefined : band}>
            <span className={styles.scoreCurrent} key={score} aria-hidden="true"
                data-outcome={change === undefined ? undefined : outcome(change)}>{Math.round(shown)}</span>
            {maximum !== undefined && <>
                <span className={styles.scoreTotal} aria-hidden="true"> · Max {maximum}</span>
                <progress className={styles.quizProgress} aria-hidden="true"
                    value={points} max={maximum || 1}/>
            </>}
            <span className={styles.srOnly}>{score}{maximum !== undefined && ` out of ${maximum} possible points`}</span>
        </dd>
    );
}

export function LeaderboardNameForm({inputId, busy, onJoin}: {
    inputId: string;
    busy: boolean;
    onJoin: (name: string) => void;
}) {
    const [name, setName] = useState("");
    const displayName = name.trim();
    return (
        <form className={styles.quizControls} onSubmit={event => {
            event.preventDefault();
            if (displayName && !busy) onJoin(displayName);
        }}>
            <label className={styles.controlLabel} htmlFor={inputId}>Public display name</label>
            <input id={inputId} className={styles.displayName} value={name} maxLength={32}
                required onChange={event => setName(event.target.value)}/>
            <button type="submit" className={shared["apply-button"] + " " + styles.quizButton}
                disabled={busy || !displayName}>Join leaderboard</button>
        </form>
    );
}

function QuizLeaderboard({standings, error}: {standings?: Standing[], error: string}) {
    const rank = standings?.find(entry => entry.yours);
    return (
        <section id="quiz-leaderboard" tabIndex={-1} className={styles.leaderboard} aria-labelledby="quiz-leaderboard-title">
            <div className={styles.leaderboardHeader}>
                <h2 id="quiz-leaderboard-title">Leaderboard</h2>
                {rank && <p>Your rank <strong>#{rank.rank}</strong> of {rank.total}</p>}
            </div>
            {error ? <p className={styles.quizError} role="alert">{error}</p> :
                standings === undefined ? <p className={styles.quizStatus} role="status">Loading leaderboard…</p> :
                standings.length === 0 ? <p className={styles.quizStatus}>No entries yet.</p> :
                    <table className={styles.standingsTable} aria-labelledby="quiz-leaderboard-title">
                        <thead>
                            <tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Points</th></tr>
                        </thead>
                        <tbody>
                            {standings.map((entry, index) => (
                                <tr key={index} className={entry.yours ? styles.ownStanding : undefined}>
                                    <td>{entry.rank}</td>
                                    <th scope="row">{entry.yours ? entry.display_name + " (you)" : entry.display_name}</th>
                                    <td>{entry.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>}
        </section>
    );
}
