import {useId, useLayoutEffect, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import type {Clue, QuizHint} from "./api";
import type {ResultCellContent} from "../search/components/ResultCellContent";
import {SortOptions, StatScope} from "../../types/SearchOptions";
import type {SearchFilterState} from "../../types/SearchFilterState";
import {SearchOverallResults} from "../search/components/SearchOverallTable";
import {SearchCountResults} from "../search/components/SearchByCountTable";
import {SearchGameResults} from "../search/components/SearchByGameTable";
import type {DetailResult} from "../search/lib/searchDetails";
import {ClubBadges} from "../search/components/ClubBadgesCell";
import {CountryFlag} from "../search/components/PlayerCell";
import common from "../search/components/SearchBaseTable.module.css";
import detailsStyles from "../search/components/SearchDetails.module.css";
import playerStyles from "../player/Player.module.css";
import styles from "./Games.module.css";

export interface QuizDetailSelection {
    result: DetailResult;
    rowIndex: number;
    review: boolean;
}

const HINT_LABELS: Record<QuizHint, string> = {clubs: "Clubs", nationality: "Nationality", position: "Position"};

function UsedClue({kind, children}: {kind: QuizHint; children: ReactNode}) {
    const label = HINT_LABELS[kind] + " clue used";
    return (
        <span className={styles.usedClue} title={label}
            data-clue={kind}>
            {children}<span className={styles.srOnly}>{label}</span>
        </span>
    );
}

function ViewAnswer({row, seasonsView, onViewDetails}: {
    row: Clue;
    seasonsView: boolean;
    onViewDetails: (detail: QuizDetailSelection) => void;
}) {
    const result = row.result;
    if (!row.player || !result) return null;
    const buttonClass = `${playerStyles["filter-button-player"]} ${detailsStyles.detailsButton}`;
    if (!("qualifying_game_ids" in result)) {
        return <Link to={`/player/${result.player_id}`} className={`${buttonClass} ${styles.detailsLink}`}
            aria-label={`View player profile for ${row.player}`}>
        <span className={detailsStyles.detailsLabel}>View player</span>
        <span className={detailsStyles.detailsCompactLabel} aria-hidden="true">View</span>
        </Link>;
    }
    const rowIndex = row.row_index;
    if (rowIndex === undefined) return null;
    const label = seasonsView ? "View seasons" : "View games";
    return <button type="button" className={buttonClass} aria-label={`${label} for ${row.player}`}
        onClick={() => onViewDetails({result, rowIndex, review: row.found === false})}>
        <span className={detailsStyles.detailsLabel}>{label}</span>
        <span className={detailsStyles.detailsCompactLabel} aria-hidden="true">View</span>
    </button>;
}

function PointsHelp({penalty, hintCost}: {penalty: number; hintCost?: number}) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const tooltip = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<"preview" | "pinned">();
    const open = mode !== undefined;

    useLayoutEffect(() => {
        const button = trigger.current;
        const panel = tooltip.current;
        if (!open || !button || !panel) return;

        function dismiss() {
            setMode(undefined);
        }
        function onPointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !button!.contains(event.target) && !panel!.contains(event.target)) {
                dismiss();
            }
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") dismiss();
        }

        const anchor = button.getBoundingClientRect();
        const {width, height} = panel.getBoundingClientRect();
        const right = document.documentElement.clientWidth || window.innerWidth;
        const top = anchor.bottom + height + 8 <= window.innerHeight ? anchor.bottom : anchor.top - height;
        panel.style.left = Math.max(8, Math.min(anchor.right - width + 8, right - width - 8)) + "px";
        panel.style.top = Math.max(8, top) + "px";

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", dismiss);
        window.addEventListener("scroll", dismiss, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", dismiss);
            window.removeEventListener("scroll", dismiss, true);
        };
    }, [open, penalty, hintCost]);

    function leave(next: EventTarget | null) {
        if (next instanceof Node && (trigger.current?.contains(next) || tooltip.current?.contains(next))) return;
        if (document.activeElement !== trigger.current) {
            setMode(current => current === "preview" ? undefined : current);
        }
    }

    return (
        <>
            <button ref={trigger} type="button" className={styles.pointsHelp}
                aria-label="Points, how scoring works" aria-describedby={id} aria-expanded={open}
                onFocus={() => setMode(current => current ?? "preview")}
                onBlur={() => setMode(undefined)}
                onMouseEnter={() => setMode(current => current ?? "preview")}
                onMouseLeave={event => leave(event.relatedTarget)}
                onClick={() => setMode(current => current === "pinned" ? undefined : "pinned")}>
                Points <span aria-hidden="true">?</span>
            </button>
            {createPortal(
                <div ref={tooltip} id={id} role="tooltip" hidden={!open} className={styles.pointsTooltip}
                    onMouseLeave={event => leave(event.relatedTarget)}>
                    <p>Correct guesses earn the points shown for that player. Each new wrong guess costs {penalty} points.
                        Repeat guesses don’t change your score.</p>
                    <p>We add each player’s difficulty rank to their search rank, then award consecutive point values in that order. Larger sums earn more.</p>
                    {hintCost !== undefined && <p>Each hint deducts {hintCost} points from your score.</p>}
                </div>,
                document.body,
            )}
        </>
    );
}

export function QuizTable({
    rows, filterState, preview = false, review = false, wrongGuessPenalty = 10, hintCost, hintsBusy, onBuyHint, onViewDetails,
}: {
    rows: Clue[];
    filterState: SearchFilterState;
    preview?: boolean;
    review?: boolean;
    wrongGuessPenalty?: number;
    hintCost?: number;
    hintsBusy?: boolean;
    onBuyHint?: (index: number, kind: QuizHint) => void;
    onViewDetails?: (detail: QuizDetailSelection) => void;
}) {
    const seasonsView = filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH;
    const data = rows.map(row => row.result ?? row.stats);
    const extraHeaders = <>
        {!preview && <th scope="col" className={common.numeric}>
            <PointsHelp penalty={wrongGuessPenalty} hintCost={hintCost}/>
        </th>}
        {onViewDetails && <th scope="col" className={common["details-column"]}>Details</th>}
    </>;
    const renderExtraCells = (index: number) => <>
        {!preview && <td className={common.numeric}>
            {review && rows[index].found !== undefined &&
                <span className={styles.srOnly}>{rows[index].found ? "Found, " : "Missed, "}</span>}
            {rows[index].points ?? "—"}
        </td>}
        {onViewDetails && <td className={common["details-column"]}>
            <ViewAnswer row={rows[index]} seasonsView={seasonsView} onViewDetails={onViewDetails}/>
        </td>}
    </>;
    const getCellContent = (index: number): ResultCellContent | undefined => {
        const row = rows[index];
        if (row.result) {
            if (!row.purchased_hints?.length) return;
            const result = row.result;
            const used = (kind: QuizHint) => row.purchased_hints?.includes(kind);
            const clubIds = "club_id" in result
                ? (result.club_id == null ? [] : [result.club_id]) : result.clubs_played_for?.split(',');
            return {
                nationality: used("nationality") && result.country_code ? (
                    <UsedClue kind="nationality"><CountryFlag code={result.country_code}/></UsedClue>
                ) : undefined,
                clubs: used("clubs") && clubIds?.length ? (
                    <UsedClue kind="clubs"><ClubBadges clubIds={clubIds}/></UsedClue>
                ) : undefined,
                position: used("position") && result.sub_position ? (
                    <UsedClue kind="position">{result.sub_position}</UsedClue>
                ) : undefined,
            };
        }
        if (!row.hints && !row.available_hints?.length) return;

        function reveal(kind: QuizHint) {
            if (!onBuyHint || hintCost === undefined || !row.available_hints?.includes(kind)) return;
            const label = HINT_LABELS[kind].toLowerCase();
            return <button type="button" className={styles.revealHint} disabled={hintsBusy}
                title={`Reveal ${label} for ${hintCost} points`}
                aria-label={`Reveal ${label} for row ${index + 1}, ${hintCost} points`}
                onClick={() => onBuyHint(index, kind)}>−{hintCost}</button>;
        }

        const nationality = row.hints?.nationality;
        const revealNationality = reveal("nationality");
        return {
            nationality: nationality
                ? <UsedClue kind="nationality"><CountryFlag code={nationality.code} name={nationality.name}/></UsedClue>
                : revealNationality && <span className={styles.nationalityHint}>{revealNationality}</span>,
            clubs: row.hints?.clubs
                ? <UsedClue kind="clubs"><ClubBadges clubIds={row.hints.clubs}/></UsedClue>
                : reveal("clubs"),
            position: row.hints?.position
                ? <UsedClue kind="position">{row.hints.position}</UsedClue> : reveal("position"),
        };
    };
    const tableProps = {
        data, filterState, extraHeaders, renderExtraCells, getCellContent,
        getRowClassName: review ? (index: number) => {
            const found = rows[index].found;
            return found === undefined ? undefined : found ? styles.foundAnswer : styles.missedAnswer;
        } : undefined,
    };

    return (
        <div className={`${common["table-container"]} ${styles.tableWrap}${review ? " " + styles.reviewTable : ""}`}
            tabIndex={0} role="region" aria-label={preview ? "Answer preview" : review ? "Quiz answers" : "Quiz clues"}>
            {filterState.statScope === StatScope.GAME ? <SearchGameResults {...tableProps}/> :
                seasonsView || filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH
                    ? <SearchCountResults {...tableProps}/> : <SearchOverallResults {...tableProps}/>}
        </div>
    );
}
