import playerStyles from '../../player/Player.module.css';
import {useInfiniteScroll} from "../hooks/useInfiniteScroll";
import baseStyles from './SearchBaseTable.module.css';
import detailStyles from './SearchDetails.module.css';
import styles from './SearchOverallTable.module.css';
import {formatSeason} from "../../../lib/DateUtils";
import React from "react";
import {fetchPlayerOverallOrSeasonData} from "../../../lib/SearchUrlUtils";
import {LoadingBar} from "../../../components/LoadingBar";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {SortOptions, StatScope} from "../../../types/SearchOptions";
import {PlayerSearchResult} from "../../../types/Player";
import {PlayerCell} from "./PlayerCell";
import type {ResultCellContent} from "./ResultCellContent";
import {ClubBadgesCell} from "./ClubBadgesCell";
import {SortableTh} from "./SortableTh";
import {formatMinutesPerEvent, getCompactSearchStats} from "../lib/smallScreenStat";

interface SearchOverallTableProps {
    filterState: SearchFilterState;
    onSortChange: (sortBy: SortOptions) => void;
    onViewDetails: (player: PlayerSearchResult) => void;
}

export const SearchOverallTable: React.FC<SearchOverallTableProps> = ({filterState, onSortChange, onViewDetails}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef, retry} =
        useInfiniteScroll<PlayerSearchResult>(fetchPlayerOverallOrSeasonData);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && <SearchOverallResults data={data} filterState={filterState} onSortChange={onSortChange} onViewDetails={onViewDetails} lastElementRef={lastElementRef}/>}
            <LoadingBar
                loading={loading}
                hasData={hasData}
                hasMore={hasMore}
                error={error}
                onRetry={retry}
            />
        </div>
    );
}

export function SearchOverallResults<Row extends Partial<PlayerSearchResult>>({
    data, filterState, onSortChange, lastElementRef, onViewDetails, extraHeaders, renderExtraCells, getRowClassName, getCellContent, compactStats, keepClueColumns,
}: {
    data: Row[];
    extraHeaders?: React.ReactNode;
    keepClueColumns?: boolean;
    renderExtraCells?: (index: number) => React.ReactNode;
    getRowClassName?: (index: number) => string | undefined;
    getCellContent?: (index: number) => ResultCellContent | undefined;
    compactStats?: readonly string[];
    filterState: SearchFilterState;
    onSortChange?: (sortBy: SortOptions) => void;
    lastElementRef?: React.RefCallback<HTMLTableRowElement>;
    onViewDetails?: (row: Row) => void;
}) {
    const clubColumnClass = keepClueColumns ? undefined : styles['first-columns-to-hide'];
    const positionColumnClass = keepClueColumns ? baseStyles['position-column'] : `${styles['second-columns-to-hide']} ${baseStyles['position-column']}`;
    const keptStats = new Set(getCompactSearchStats(filterState, compactStats));
    const tableClassName = [baseStyles["generic-table"], baseStyles["results-table"], keptStats.size > 1 && styles.multiStatTable]
        .filter(Boolean).join(" ");
    function statClass(field: string, baseClass?: string) {
        return [baseClass, !keptStats.has(field) && styles["third-columns-to-hide"]].filter(Boolean).join(" ");
    }
    return (
        <table className={tableClassName}>
            <thead>
            <tr>
                <th className={baseStyles.numeric}>Rank</th>
                <th className={baseStyles['player-name']}>Player</th>
                <th className={clubColumnClass}>Clubs</th>
                {filterState.statScope === StatScope.SEASON && <th className={baseStyles['season-column']}>Season</th>}
                <th className={positionColumnClass}>Position</th>
                <SortableTh label="Apps" columnSort={SortOptions.APPEARANCES} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_appearances", baseStyles['table-header'])} />
                <SortableTh label="Mins" columnSort={SortOptions.MINUTES_PLAYED} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_minutes_played", baseStyles['table-header'])} />
                <SortableTh label="Goals" columnSort={SortOptions.GOALS} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_goals")} />
                <SortableTh label="Assists" columnSort={SortOptions.ASSISTS} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_assists")} />
                <SortableTh label="Goals + assists" columnSort={SortOptions.GOALS_AND_ASSISTS} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("goals_and_assists")} />
                <SortableTh label="Yellows" columnSort={SortOptions.YELLOW_CARDS} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_yellow_cards")} />
                <SortableTh label="Reds" columnSort={SortOptions.RED_CARDS} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("total_red_cards")} />
                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                    <SortableTh label="Mins per goal" columnSort={SortOptions.MINUTES_PER_GOAL} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("mins_per_goal")} />}
                {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                    <SortableTh label="Mins per assist" columnSort={SortOptions.MINUTES_PER_ASSIST} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("mins_per_assist")} />}
                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                    <SortableTh label="Mins per goal or assist" columnSort={SortOptions.MINUTES_PER_GOAL_OR_ASSIST} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("mins_per_goal_or_assist")} />}
                {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                    <SortableTh label="Mins per Yellow" columnSort={SortOptions.MINUTES_PER_YELLOW} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("mins_per_yellow")} />}
                {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                    <SortableTh label="Mins per Red" columnSort={SortOptions.MINUTES_PER_RED} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} className={statClass("mins_per_red")} />}
                {onViewDetails && <th className={baseStyles['details-column']}>Details</th>}
                {extraHeaders}
            </tr>
            </thead>
            <tbody>
            {data.map((player, index) => {
                const cells = getCellContent?.(index);
                return (
                    <tr key={player.player_id == null ? index : `${player.player_id}-${player.season}`}
                        className={getRowClassName?.(index)}
                        ref={data.length === index + 1 ? lastElementRef : null}
                    >
                        <td className={baseStyles.numeric}>
                            {player.rank == null ? '—' : player.rank + '.'}
                        </td>
                        <td className={baseStyles['player-cell']}>
                            <PlayerCell
                                flag={cells?.nationality}
                                playerId={player.player_id}
                                playerName={player.player_name}
                                countryCode={player.country_code}
                                imageUrl={player.image_url}
                                avatarClassName={styles['second-columns-to-hide']}
                            />
                            {filterState.statScope === StatScope.SEASON && <span className={baseStyles['mobile-season']}>{player.season == null ? '—' : formatSeason(player.season)}</span>}
                        </td>
                        {cells?.clubs ? <td className={clubColumnClass}>{cells.clubs}</td> : <ClubBadgesCell
                            cellClassName={clubColumnClass}
                            clubIds={player.clubs_played_for?.split(',')}
                        />}
                        {filterState.statScope === StatScope.SEASON && <td className={baseStyles['season-column']}>{player.season == null ? '—' : formatSeason(player.season)}</td>}
                        <td className={positionColumnClass}>{cells?.position ?? player.sub_position ?? '—'}</td>
                        <td className={statClass("total_appearances", baseStyles.numeric)}><strong>{player.total_appearances ?? '—'}</strong>
                            {!filterState.subsOnly && player.substitute_appearances != null && (<> ({player.substitute_appearances})</>)}</td>
                        <td className={statClass("total_minutes_played", baseStyles.numeric)}>{player.total_minutes_played ?? '—'}</td>
                        <td className={statClass("total_goals", baseStyles.numeric)}>{player.total_goals ?? '—'}</td>
                        <td className={statClass("total_assists", baseStyles.numeric)}>{player.total_assists ?? '—'}</td>
                        <td className={statClass("goals_and_assists", baseStyles.numeric)}>{player.total_goals == null || player.total_assists == null ? '—' : player.total_goals + player.total_assists}</td>
                        <td className={statClass("total_yellow_cards", baseStyles.numeric)}>{player.total_yellow_cards ?? '—'}</td>
                        <td className={statClass("total_red_cards", baseStyles.numeric)}>{player.total_red_cards ?? '—'}</td>
                        {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                            <td className={statClass("mins_per_goal", baseStyles.numeric)}>{formatMinutesPerEvent(player.mins_per_goal)}</td>}
                        {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                            <td className={statClass("mins_per_assist", baseStyles.numeric)}>{formatMinutesPerEvent(player.mins_per_assist)}</td>}
                        {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                            <td className={statClass("mins_per_goal_or_assist", baseStyles.numeric)}>{formatMinutesPerEvent(player.mins_per_goal_or_assist)}</td>}
                        {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                            <td className={statClass("mins_per_yellow", baseStyles.numeric)}>{formatMinutesPerEvent(player.mins_per_yellow)}</td>}
                        {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                            <td className={statClass("mins_per_red", baseStyles.numeric)}>{formatMinutesPerEvent(player.mins_per_red)}</td>}

                        {onViewDetails && <td className={baseStyles['details-column']}><button type="button" className={`${playerStyles['filter-button-player']} ${detailStyles.detailsButton}`} onClick={() => onViewDetails(player)} aria-label={`View games for ${player.player_name}`}><span className={detailStyles.detailsLabel}>View games</span><span className={detailStyles.detailsCompactLabel} aria-hidden="true">View</span></button></td>}
                        {renderExtraCells?.(index)}
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
