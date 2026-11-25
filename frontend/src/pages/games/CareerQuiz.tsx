import {useCallback, useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import PlayerSearchBar from "../../components/PlayerSearchBar";
import {convertDateStringToDate, formatSeason} from "../../lib/DateUtils";
import shared from "../../styles/shared.module.css";
import {ClubBadges} from "../search/components/ClubBadgesCell";
import {CountryFlag} from "../search/components/PlayerCell";
import {SearchDetailsModal} from "../search/components/SearchDetailsModal";
import detailsStyles from "../search/components/SearchDetails.module.css";
import playerStyles from "../player/Player.module.css";
import {ageOnMatchDate} from "../player/lib/playerAge";
import base from "../search/components/SearchBaseTable.module.css";
import {useSearchFiltersFromUrl} from "../search/hooks/useSearchFiltersFromUrl";
import type {DetailGame, DetailStats} from "../search/lib/searchDetails";
import {CAREER_ARCHIVE, CAREER_GAME, formatQuizDate, LeaderboardNameForm, QuizPageHeading, quizPageClass} from "./Games";
import {guestToken, quizRequest} from "./api";
import styles from "./Games.module.css";

interface Season {
    season: number;
    clubs: number[];
    stats: DetailStats;
}

interface CareerRound {
    id: number;
    date: string;
    elapsed_ms: number | null;
    finished: boolean;
    next_reveal_ms: number | null;
    date_of_birth: string | null;
    height_cm: number | null;
    nationality: {code: string; name: string} | null;
    position: string | null;
    seasons: (Season | null)[];
    answer: string | null;
    display_name: string | null;
    correct: boolean | null;
}

interface Standing {
    rank: number;
    display_name: string;
    elapsed_ms: number;
    yours: boolean;
}

const birthDateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const buttonClass = shared["apply-button"];
const seasonScope = "Season stats cover European domestic leagues and UEFA club competitions only. Qualifying rounds are excluded.";

function formatTime(milliseconds: number, precision = 3) {
    const minutes = Math.floor(milliseconds / 60_000);
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const fraction = String(Math.floor(milliseconds) % 1000).padStart(3, "0");
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + "." + fraction.slice(0, precision);
}

function CareerClock({round, received, compact = false}: {round: CareerRound; received: number; compact?: boolean}) {
    const [tick, setTick] = useState(0);
    const playing = !round.finished;
    const elapsed = (round.elapsed_ms ?? 0) + (playing ? Math.max(0, tick - received) : 0);

    useEffect(() => {
        if (!playing) return;
        const interval = window.setInterval(() => setTick(performance.now()), 100);
        return () => window.clearInterval(interval);
    }, [playing]);

    const time = formatTime(elapsed, playing ? 1 : 3);
    if (compact) return <span>Time {time}</span>;
    return <dd>
        <span role="timer">{time}</span>
        {playing && round.next_reveal_ms !== null && <span className={styles.nextClue}>
            Next clue in {Math.max(0, Math.ceil((round.next_reveal_ms - elapsed) / 1000))}s
        </span>}
    </dd>;
}

const seasonStats: ReadonlyArray<{label: string; stat: keyof DetailStats; optional?: boolean}> = [
    {label: "Apps", stat: "appearances"}, {label: "Mins", stat: "minutes", optional: true},
    {label: "Goals", stat: "goals"}, {label: "Assists", stat: "assists"},
    {label: "Yellows", stat: "yellows", optional: true}, {label: "Reds", stat: "reds", optional: true},
];

export function CareerQuizPage() {
    const {quizKey} = useParams();
    return <CareerQuiz key={quizKey ?? "today"} quizKey={quizKey}/>;
}

function CareerQuiz({quizKey}: {quizKey?: string}) {
    const [sample, setSample] = useState<{round: CareerRound; received: number} | null>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [wrong, setWrong] = useState(false);
    const [detail, setDetail] = useState<Season>();
    const closeDetails = useCallback(() => setDetail(undefined), []);
    const detailFilters = useSearchFiltersFromUrl("scope=s&sort=g");
    const round = sample?.round;
    const id = round?.id;
    const age = round ? ageOnMatchDate(round.date_of_birth ?? undefined, round.date) : null;
    const playing = round?.elapsed_ms != null && !round.finished;

    const receive = useCallback((round: CareerRound | null) => {
        setSample(round ? {round, received: performance.now()} : null);
    }, []);

    useEffect(() => {
        const request = new AbortController();
        const path = quizKey ? "/career/" + encodeURIComponent(quizKey) : "/career/today";
        void quizRequest<CareerRound | null>(path, guestToken(), undefined, request.signal)
            .then(value => { if (!request.signal.aborted) receive(value); },
                reason => { if (!request.signal.aborted) setError(reason.message); });
        return () => request.abort();
    }, [quizKey, receive]);

    useEffect(() => {
        if (!sample || busy || sample.round.next_reveal_ms === null) return;
        const {round, received} = sample;
        const request = new AbortController();
        async function refresh() {
            try {
                const updated = await quizRequest<CareerRound>("/career/" + round.id, guestToken(), undefined, request.signal);
                if (!request.signal.aborted) {
                    receive(updated);
                    setError("");
                }
            } catch (reason) {
                if (request.signal.aborted) return;
                setError((reason as Error).message);
                timeout = window.setTimeout(refresh, 2_000);
            }
        }

        const due = received + sample.round.next_reveal_ms - (round.elapsed_ms ?? 0);
        let timeout = window.setTimeout(refresh, Math.max(0, due - performance.now()));
        return () => {
            request.abort();
            window.clearTimeout(timeout);
        };
    }, [sample, busy, receive]);

    async function update(action: "start" | "guess" | "leaderboard", body: object) {
        if (!id || busy) return;
        setBusy(true);
        setError("");
        setWrong(false);
        try {
            const updated = await quizRequest<CareerRound>("/career/" + id + "/" + action, guestToken(), body);
            setWrong(updated.correct === false);
            receive(updated);
        } catch (reason) {
            setError((reason as Error).message);
        } finally {
            setBusy(false);
        }
    }

    const detailSource = useMemo(() => {
        if (!id || !detail) return;
        const guest = guestToken();
        const path = "/career/" + id + "/seasons/" + detail.season;
        return {
            key: "career:" + guest + ":" + path,
            load: (signal: AbortSignal) => quizRequest<DetailGame[]>(path, guest, undefined, signal),
        };
    }, [id, detail]);

    return (
        <main className={quizPageClass}>
            <QuizPageHeading title="Guess the Player">
                <Link to="/games">All games</Link>
                {quizKey && <Link to={CAREER_GAME}>Today’s quiz</Link>}
                <Link to={CAREER_ARCHIVE}>Past quizzes</Link>
                {round?.finished && <a href="#career-leaderboard" onClick={event => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    const leaderboard = document.getElementById("career-leaderboard");
                    if (!leaderboard) return;
                    event.preventDefault();
                    leaderboard.focus({preventScroll: true});
                    leaderboard.scrollIntoView({block: "start"});
                }}>Leaderboard</a>}
            </QuizPageHeading>
            {quizKey && round && <p className={styles.quizStatus}><time dateTime={round.date}>{formatQuizDate(round.date)}</time></p>}
            {error && <p className={styles.quizError} role="alert">{error}</p>}
            {sample === undefined && !error && <p className={styles.quizStatus} role="status">Loading…</p>}
            {sample === null && <p className={styles.quizStatus}>There’s no player scheduled for today.</p>}
            {round && round.elapsed_ms === null && (
                <section className={styles.careerIntro}>
                    <p>The clock starts when you play. New clues appear as time passes.</p>
                    <p>{seasonScope}</p>
                    <button type="button" className={buttonClass} disabled={busy} onClick={() => void update("start", {})}>
                        Start quiz
                    </button>
                </section>
            )}
            {sample && round && round.elapsed_ms !== null && <>
                <header className={styles.quizHeader}>
                    <div className={styles.careerIntro}>
                        <h2 className={styles.question}>{round.answer ?? "Who is this player?"}</h2>
                        <dl className={styles.careerBio}>
                            {round.date_of_birth && <div><dt>Date of birth</dt><dd>
                                <time dateTime={round.date_of_birth}>
                                    {birthDateFormat.format(convertDateStringToDate(round.date_of_birth))}
                                </time>{age !== null && " (" + age + ")"}
                            </dd></div>}
                            {round.height_cm && <div><dt>Height</dt><dd>{round.height_cm} cm</dd></div>}
                            {round.nationality && <div><dt>Nationality</dt><dd>
                                <CountryFlag code={round.nationality.code} name={round.nationality.name}/>
                            </dd></div>}
                            {round.position && <div><dt>Position</dt><dd>{round.position}</dd></div>}
                        </dl>
                    </div>
                    <dl className={styles.scoreboard}>
                        <div className={styles.scoreMetric}>
                            <dt>{round.finished ? "Finish time" : "Time elapsed"}</dt>
                            <CareerClock round={round} received={sample.received}/>
                        </div>
                    </dl>
                </header>
                {playing && <>
                    <div className={styles.quizControls}>
                        <label className={styles.controlLabel} htmlFor="career-player">Your guess</label>
                        <PlayerSearchBar inputId="career-player" placeHolderText="Find a player…" linkToPlayer={false}
                            variant="inline" disabled={busy} onSelectPlayerId={playerId => void update("guess", {player_id: playerId})}/>
                    </div>
                    {wrong && <p className={styles.guessFeedback} data-outcome="incorrect" role="status">Incorrect. Try again.</p>}
                </>}
                {round.finished && !round.display_name && <LeaderboardNameForm inputId="career-display-name" busy={busy}
                    onJoin={name => void update("leaderboard", {display_name: name})}/>}
                {round.seasons.length > 0 && <div className={base["table-container"]} tabIndex={0} role="region" aria-label="Career seasons">
                    <table className={base["generic-table"] + " " + base["results-table"]}>
                        <caption className={styles.careerTableCaption}>{seasonScope}</caption>
                        <thead><tr>
                            <th scope="col">Season</th><th scope="col">Clubs</th>
                            {seasonStats.map(({label, stat, optional}) =>
                                <th scope="col" className={optional ? base.numeric + " " + styles.careerOptionalStat : base.numeric}
                                    key={stat}>{label}</th>)}
                            <th scope="col" className={base["details-column"]}>Details</th>
                        </tr></thead>
                        <tbody>{round.seasons.map((season, index) => (
                            <tr key={index} className={season ? undefined : styles.hiddenSeason}>
                                <td>{season ? formatSeason(season.season) : <>
                                    <span aria-hidden="true">—</span><span className={styles.srOnly}>Season hidden</span>
                                </>}</td>
                                <td>{season ? <ClubBadges clubIds={season.clubs}/> : '—'}</td>
                                {seasonStats.map(({stat, optional}) =>
                                    <td className={optional ? base.numeric + " " + styles.careerOptionalStat : base.numeric}
                                        key={stat}>{season?.stats[stat] ?? '—'}</td>)}
                                <td className={base["details-column"]}>
                                    {season ? <button type="button" className={playerStyles["filter-button-player"] + " " + detailsStyles.detailsButton}
                                        onClick={() => setDetail(season)} aria-label={"View games for " + formatSeason(season.season)}>
                                        <span className={detailsStyles.detailsLabel}>View games</span>
                                        <span className={detailsStyles.detailsCompactLabel} aria-hidden="true">View</span>
                                    </button> : '—'}
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>}
                {detail && detailSource && <SearchDetailsModal careerSeason={detail} source={detailSource}
                    filterState={detailFilters} onClose={closeDetails}
                    subtitle={<CareerClock round={round} received={sample.received} compact/>}/>}
                {round.finished && <CareerLeaderboard id={round.id} displayName={round.display_name}/>}
            </>}
        </main>
    );
}

function CareerLeaderboard({id, displayName}: {id: number; displayName: string | null}) {
    const [entries, setEntries] = useState<Standing[]>();
    const [error, setError] = useState("");
    useEffect(() => {
        const request = new AbortController();
        void quizRequest<Standing[]>("/career/" + id + "/leaderboard", guestToken(), undefined, request.signal)
            .then(value => { if (!request.signal.aborted) { setEntries(value); setError(""); } },
                reason => { if (!request.signal.aborted) setError(reason.message); });
        return () => request.abort();
    }, [id, displayName]);

    return <section id="career-leaderboard" tabIndex={-1} className={styles.leaderboard} aria-labelledby="career-leaderboard-title">
        <h2 id="career-leaderboard-title">Leaderboard</h2>
        {error ? <p className={styles.quizError} role="alert">{error}</p> :
            !entries ? <p role="status">Loading leaderboard…</p> :
            entries.length === 0 ? <p>No entries yet.</p> :
            <table className={styles.standingsTable} aria-label="Leaderboard">
                <thead><tr><th scope="col">Rank</th><th scope="col">Name</th><th scope="col">Time</th></tr></thead>
                <tbody>{entries.map((entry, index) => (
                    <tr key={index} className={entry.yours ? styles.ownStanding : undefined}>
                        <td>{entry.rank}</td><th scope="row">{entry.display_name}{entry.yours ? " (you)" : ""}</th>
                        <td>{formatTime(entry.elapsed_ms)}</td>
                    </tr>
                ))}</tbody>
            </table>}
    </section>;
}
