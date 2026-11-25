import {useEffect, useId, useState} from "react";
import type {FormEvent} from "react";
import {Link} from "react-router-dom";
import PlayerSearchBar from "../../components/PlayerSearchBar";
import {searchFiltersForApi} from "../../lib/SearchUrlUtils";
import {OWNER_SESSION, quizRequest} from "./api";
import type {Clue} from "./api";
import {useSearchFiltersFromUrl} from "../search/hooks/useSearchFiltersFromUrl";
import {QuizTable} from "./QuizTable";
import shared from "../../styles/shared.module.css";
import styles from "./Games.module.css";

function useOwner() {
    const [owner, setOwner] = useState<string>();
    useEffect(() => {
        const token = sessionStorage.getItem(OWNER_SESSION);
        if (!token) return;
        const controller = new AbortController();
        void quizRequest("/owner/session", token, undefined, controller.signal).then(
            () => { if (!controller.signal.aborted) setOwner(token); },
            () => {},
        );
        return () => controller.abort();
    }, []);
    return [owner, setOwner] as const;
}

const buttonClass = `${shared["apply-button"]} ${styles.adminButton}`;

export function QuizOwnerPage() {
    const [owner, setOwner] = useOwner();
    const [secret, setSecret] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const {token} = await quizRequest<{token: string}>("/owner/login", undefined, {secret: secret.trim()});
            sessionStorage.setItem(OWNER_SESSION, token);
            setOwner(token);
            setSecret("");
        } catch (reason) {
            setError((reason as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        setBusy(true);
        setError("");
        try {
            await quizRequest("/owner/logout", owner, {});
            sessionStorage.removeItem(OWNER_SESSION);
            setOwner(undefined);
        } catch (reason) {
            setError((reason as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className={styles.adminPage}>
            <section className={`${styles.card} ${styles.adminPanel}`} aria-labelledby="quiz-master-title">
                <h1 id="quiz-master-title" className={styles.adminTitle}>Quiz Master</h1>
                {owner ? (
                    <div className={styles.actions}>
                        <Link to="/">Go to search</Link>
                        <button type="button" className={buttonClass} onClick={() => void logout()} disabled={busy}>Sign out</button>
                    </div>
                ) : (
                    <form className={styles.adminForm} onSubmit={event => void login(event)}>
                        <label className={styles.adminField}>
                            Owner secret
                            <input type="password" required value={secret} autoComplete="current-password"
                                onChange={event => setSecret(event.target.value)}/>
                        </label>
                        <button type="submit" className={buttonClass} disabled={busy}>Sign in</button>
                    </form>
                )}
                {error && <p className={styles.adminError} role="alert">{error}</p>}
            </section>
            {owner && <CareerAuthor owner={owner}/>}
        </main>
    );
}

function CareerAuthor({owner}: {owner: string}) {
    const [open, setOpen] = useState(false);
    const [player, setPlayer] = useState<{id: number; name: string}>();
    const [date, setDate] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [scheduled, setScheduled] = useState<{date: string; player: string}>();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!player || !date || busy) return;
        setBusy(true);
        setError("");
        setScheduled(undefined);
        try {
            setScheduled(await quizRequest<{date: string; player: string}>("/owner/career/schedule", owner, {
                player_id: player.id, date,
            }));
        } catch (reason) {
            setError((reason as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return <section className={`${styles.card} ${styles.adminPanel}`} aria-labelledby="career-author-title">
        <h2 id="career-author-title" className={styles.adminTitle}>Guess the Player</h2>
        <button type="button" className={buttonClass} aria-expanded={open} onClick={() => setOpen(value => !value)}>
            {open ? "Close scheduling" : "Set player"}
        </button>
        {open && <div className={styles.adminForm}>
            <label className={styles.controlLabel} htmlFor="career-owner-player">Player</label>
            <PlayerSearchBar inputId="career-owner-player" placeHolderText="Find a player…" linkToPlayer={false} variant="inline"
                disabled={busy} selectionName="full" onSelectPlayerId={(id, name) => {
                    setPlayer({id, name}); setScheduled(undefined); setError("");
                }}/>
            {player && <form className={styles.adminForm} onSubmit={event => void submit(event)}>
                <strong>{player.name}</strong>
                <label className={styles.adminField}>
                    Publication date (6 am UK time)
                    <input type="date" value={date} required disabled={busy} onChange={event => {
                        setDate(event.target.value); setScheduled(undefined);
                    }}/>
                </label>
                <button className={buttonClass} type="submit" disabled={busy || !date || !!scheduled}>Schedule player</button>
            </form>}
            {scheduled && <p role="status">{scheduled.player} scheduled for <time dateTime={scheduled.date}>{scheduled.date}</time>.</p>}
            {error && <p className={styles.adminError} role="alert">{error}</p>}
        </div>}
    </section>;
}

interface Preview { id: string, rows: Clue[], count: number }
interface Score {
    player_id: number;
    name: string;
    rank: number;
    jev_rating: number;
    override_rating: number | null;
    points: number;
}

const ratingFormat = new Intl.NumberFormat("en-GB", {maximumFractionDigits: 3});

export function QuizAuthor({searchType, query}: {searchType: string, query: string}) {
    const [owner] = useOwner();
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const [question, setQuestion] = useState("");
    const [date, setDate] = useState("");
    const [preview, setPreview] = useState<Preview>();
    const [scores, setScores] = useState<Score[]>();
    const [edits, setEdits] = useState<Record<number, string>>({});
    const hasEdits = Object.keys(edits).length > 0;
    const [saved, setSaved] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const filterState = useSearchFiltersFromUrl(query);
    if (!owner) return null;

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError("");
        try {
            await action();
        } catch (reason) {
            setError((reason as Error).message);
        } finally {
            setBusy(false);
        }
    }

    function clearPreview() {
        setPreview(undefined);
        setScores(undefined);
        setEdits({});
        setSaved("");
        setError("");
    }

    function editRating(score: Score, value: string) {
        setEdits(previous => {
            const next = {...previous};
            if (value === String(score.override_rating ?? "")) delete next[score.player_id];
            else next[score.player_id] = value;
            return next;
        });
    }

    function applyOverrides(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!preview || !hasEdits || busy || saved) return;
        const ratings = Object.fromEntries(Object.entries(edits).map(([id, value]) =>
            [id, value === "" ? null : Number(value)]));
        void run(async () => {
            setScores(await quizRequest<Score[]>("/owner/overrides", owner, {id: preview.id, ratings}));
            setEdits({});
        });
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        clearPreview();
        const filters = searchFiltersForApi(new URLSearchParams(query));
        void run(async () => setPreview(await quizRequest<Preview>("/owner/preview", owner, {
            question, date, search_type: searchType, query: filters.toString(),
        })));
    }

    return (
        <section className={styles.author} aria-label="Quiz authoring">
            <div className={styles.authorToolbar}>
                <button type="button" className={buttonClass} aria-expanded={open} aria-controls={open ? panelId : undefined}
                    onClick={() => setOpen(value => !value)}>{open ? "Close quiz setup" : "Make daily quiz"}</button>
                <Link to="/admin" className={styles.authorLink}>Quiz admin</Link>
            </div>
            {open && (
                <div id={panelId} className={styles.authorPanel}>
                    <form className={styles.authorForm} onSubmit={submit} onChange={clearPreview}>
                        <label className={styles.adminField}>
                            Question
                            <textarea required value={question} maxLength={500} disabled={busy} placeholder="Which players…"
                                onChange={event => setQuestion(event.target.value)}/>
                        </label>
                        <label className={styles.adminField}>
                            Publish date (UK)
                            <input type="date" required value={date} disabled={busy}
                                onChange={event => setDate(event.target.value)}/>
                        </label>
                        <button type="submit" className={buttonClass} disabled={busy}>Preview quiz</button>
                    </form>
                    {preview && (
                        <section className={styles.authorPreview}>
                            <div className={styles.authorSectionHeader}>
                                <div>
                                    <h2>Answer preview</h2>
                                    <p>{preview.count} correct {preview.count === 1 ? "player" : "players"}</p>
                                </div>
                                {!scores && <button type="button" className={buttonClass} disabled={busy} onClick={() => void run(async () => {
                                    setScores(await quizRequest<Score[]>("/owner/score", owner, {id: preview.id}));
                                })}>Score answers</button>}
                            </div>
                            <QuizTable rows={preview.rows} filterState={filterState} preview/>
                        </section>
                    )}
                    {preview && scores && (
                        <form className={styles.authorScores} onSubmit={applyOverrides}>
                            <div className={styles.authorSectionHeader}>
                                <h2>Answer points</h2>
                                <div className={styles.actions}>
                                    {hasEdits && <button type="submit" className={buttonClass} disabled={busy}>Recalculate points</button>}
                                    <button type="button" className={buttonClass} disabled={busy || !!saved || hasEdits} onClick={() => void run(async () => {
                                        const result = await quizRequest<{date: string}>("/owner/schedule", owner, {id: preview.id});
                                        setSaved(result.date);
                                    })}>Schedule quiz</button>
                                </div>
                            </div>
                            <p className={styles.ratingHelp}>
                                Ratings run from 0 (easiest) to 4 (hardest). Clear an override to restore Jev’s rating.
                            </p>
                            <div className={styles.authorScoreTable} tabIndex={0} role="region" aria-label="Answer ratings and points">
                                <table className={styles.standingsTable}>
                                    <thead><tr>
                                        <th scope="col">Player</th><th scope="col">Search rank</th><th scope="col">Jev rating</th>
                                        <th scope="col">Override</th><th scope="col">Points</th>
                                    </tr></thead>
                                    <tbody>{scores.map(score => (
                                        <tr key={score.player_id}>
                                            <th scope="row">{score.name}</th>
                                            <td>{score.rank}</td>
                                            <td title={String(score.jev_rating)}>{ratingFormat.format(score.jev_rating)}</td>
                                            <td><input type="number" min="0" max="4" step="any" placeholder="—"
                                                className={styles.ratingInput} aria-label={`Override for ${score.name}`}
                                                disabled={busy || !!saved}
                                                value={edits[score.player_id] ?? score.override_rating ?? ""}
                                                onChange={event => editRating(score, event.target.value)}/></td>
                                            <td>{score.points}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </form>
                    )}
                    {busy && <p className={styles.quizStatus} role="status">Working…</p>}
                    {saved && <p className={styles.authorSuccess} role="status">Quiz scheduled for {saved} (UK).</p>}
                    {error && <p className={styles.adminError} role="alert">{error}</p>}
                </div>
            )}
        </section>
    );
}
