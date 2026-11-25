import {useEffect, useId, useMemo, useRef, useState, type ReactNode} from "react";
import {Link, useParams} from "react-router-dom";
import PlayerSearchBar from "../../components/PlayerSearchBar";
import {convertDateStringToDate} from "../../lib/DateUtils";
import {useMediaQuery} from "../player/hooks/useMediaQuery";
import searchStyles from "../search/Search.module.css";
import {guestToken, quizRequest} from "./api";
import type {QuizView} from "./api";
import {QuizTable, type QuizDetailSelection} from "./QuizTable";
import {SearchDetailsModal} from "../search/components/SearchDetailsModal";
import {useSearchFiltersFromUrl} from "../search/hooks/useSearchFiltersFromUrl";
import type {DetailGame} from "../search/lib/searchDetails";
import shared from "../../styles/shared.module.css";
import styles from "./Games.module.css";

const DAILY = "/games/daily-quiz";
const ARCHIVE = DAILY + "/archive";
const quizPageClass = `${styles.quizPage} ${searchStyles["content-wrapper"]}`;

function QuizPageHeading({title, children}: {title: string; children: ReactNode}) {
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
                <section className={`${styles.gameCard} ${styles.featuredCard}`} aria-labelledby="daily-game-title">
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
                        <p>Identify a footballer as clues from their career are revealed.</p>
                    </div>
                    <span className={styles.comingSoon}>Coming soon</span>
                </section>
            </div>
        </main>
    );
}

type ArchiveEntry = [date: string, question: string, id?: number];

const archiveDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function QuizArchive() {
    const [entries, setEntries] = useState<ArchiveEntry[]>();
    const [error, setError] = useState("");
    useEffect(() => {
        const request = new AbortController();
        void quizRequest<ArchiveEntry[]>("/archive", undefined, undefined, request.signal).then(setEntries,
            error => { if (!request.signal.aborted) setError(error.message); });
        return () => request.abort();
    }, []);
    return (
        <main className={quizPageClass}>
            <QuizPageHeading title="Past quizzes">
                <Link to="/games">All games</Link>
                <Link to={DAILY}>Today’s quiz</Link>
            </QuizPageHeading>
            {error ? <p className={styles.quizError} role="alert">{error}</p> :
                !entries ? <p className={styles.quizStatus} role="status">Loading quizzes…</p> :
                entries.length === 0 ? <p className={styles.quizStatus}>No past quizzes yet.</p> :
                    <ul className={styles.archiveList}>
                        {entries.map(([date, question, id]) => (
                            <li key={id ?? date} className={styles.archiveRow}>
                                <time dateTime={date}>{archiveDate.format(convertDateStringToDate(date))}</time>
                                <Link to={ARCHIVE + "/" + (id ?? date)}>
                                    {question}<span aria-hidden="true">→</span>
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
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState<{points: number; sequence: number}>();
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
                setFeedback(previous => ({points, sequence: (previous?.sequence ?? 0) + 1}));
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
                            data-outcome={outcome(feedback.points)}>{guessMessage(feedback.points)}</span>}
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
                    {canJoinBoard && (
                        <form className={styles.quizControls} onSubmit={event => {
                            event.preventDefault();
                            void update("finish", {display_name: name.trim()});
                        }}>
                            <label className={styles.controlLabel} htmlFor="quiz-display-name">Public display name</label>
                            <input id="quiz-display-name" className={styles.displayName} value={name} maxLength={32}
                                required onChange={event => setName(event.target.value)}/>
                            <button type="submit" className={buttonClass} disabled={busy || !name.trim()}>Join leaderboard</button>
                        </form>
                    )}
                    {quizId && !!quiz.wrong_guess_count &&
                        <WrongGuesses key={quizId} quizId={quizId} count={quiz.wrong_guess_count}/>}
                    <QuizTable rows={quiz.rows} onViewDetails={setDetail} filterState={detailFilters} review={quiz.answers_revealed}
                        wrongGuessPenalty={quiz.wrong_guess_penalty} hintCost={quiz.hint_cost}
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
}

function WrongGuesses({quizId, count}: {quizId: number | string; count: number}) {
    const [open, setOpen] = useState(false);
    const listId = useId();
    return (
        <div className={styles.wrongGuesses}>
            <button type="button" className={styles.wrongGuessesToggle} aria-expanded={open}
                aria-controls={listId} onClick={() => setOpen(previous => !previous)}>
                {open ? "Hide" : "Show"} wrong guesses ({count})
            </button>
            <div id={listId} hidden={!open}>
                {open && <WrongGuessList quizId={quizId} count={count}/>}
            </div>
        </div>
    );
}

function WrongGuessList({quizId, count}: {quizId: number | string; count: number}) {
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

    return (
        <ul className={styles.wrongGuessList} aria-label="Wrong guesses">
            {result.guesses.map(guess => (
                <li key={guess.player_id}>
                    <span>{guess.name}</span>
                    <span className={styles.wrongGuessPoints}>−{Math.abs(guess.points)} {guess.points === -1 ? "point" : "points"}</span>
                </li>
            ))}
        </ul>
    );
}

function outcome(points: number) {
    return points > 0 ? "correct" : points < 0 ? "incorrect" : "repeat";
}

function guessMessage(points: number) {
    if (points === 0) return "You already guessed that player.";
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
