import {SortableTh} from "./SortableTh";
import playerStyles from '../../player/Player.module.css';
import {useInfiniteScroll} from "../hooks/useInfiniteScroll";
import {fetchNumberOfGamesOrSeasonsResult} from "../../../lib/SearchUrlUtils";
import baseStyles from './SearchBaseTable.module.css';
import detailStyles from './SearchDetails.module.css';
import styles from './SearchByCountTable.module.css';
import React from "react";
import {formatSeason} from "../../../lib/DateUtils";
import {LoadingBar} from "../../../components/LoadingBar";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {PlayerNumberOfGamesOrSeasonsResult} from "../../../types/Player";
import {SortOptions, StatScope} from "../../../types/SearchOptions";
import {PlayerCell} from "./PlayerCell";
import type {ResultCellContent} from "./ResultCellContent";
import {ClubBadgesCell} from "./ClubBadgesCell";


interface SearchByCountTableProps {
    filterState: SearchFilterState;
    onSortChange: (sortBy: SortOptions) => void;
    onViewDetails: (player: PlayerNumberOfGamesOrSeasonsResult) => void;
}

export const SearchByCountTable: React.FC<SearchByCountTableProps> = ({filterState, onViewDetails, onSortChange}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef, retry} =
    useInfiniteScroll<PlayerNumberOfGamesOrSeasonsResult>(fetchNumberOfGamesOrSeasonsResult);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && <SearchCountResults data={data} filterState={filterState} onSortChange={onSortChange} onViewDetails={onViewDetails} lastElementRef={lastElementRef}/>}
            <LoadingBar
                loading={loading}
                hasData={hasData}
                hasMore={hasMore}
                error={error}
                onRetry={retry}
            />
        </div>
    )
}

export function SearchCountResults<Row extends Partial<PlayerNumberOfGamesOrSeasonsResult>>({
    data, filterState, onSortChange, lastElementRef, onViewDetails, extraHeaders, renderExtraCells, getRowClassName, getCellContent,
}: {
    data: Row[];
    extraHeaders?: React.ReactNode;
    renderExtraCells?: (index: number) => React.ReactNode;
    getRowClassName?: (index: number) => string | undefined;
    getCellContent?: (index: number) => ResultCellContent | undefined;
    filterState: Pick<SearchFilterState, "statScope" | "sortBy" | "sortDirection" | "subsOnly">;
    onSortChange?: (sortBy: SortOptions) => void;
    lastElementRef?: React.RefCallback<HTMLTableRowElement>;
    onViewDetails?: (row: Row) => void;
}) {
    return (
        <table className={`${baseStyles['generic-table']} ${baseStyles['results-table']}`}>
            <thead>
            <tr>
                <th className={baseStyles.numeric}>Rank</th>
                <th className={baseStyles['player-name']}>Player</th>
                <th className={styles['first-gs-columns-to-hide']}>Clubs</th>
                <th className={`${styles['first-gs-columns-to-hide']} ${baseStyles['position-column']}`}>Position</th>
                {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <th className={baseStyles['season-column']}>Season</th>}
                {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <SortableTh label="Number of seasons" columnSort={SortOptions.NUMBER_OF_SEASONS_WITH} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} />}
                {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <SortableTh label="Number of games" columnSort={SortOptions.NUMBER_OF_GAMES_WITH} activeSort={filterState.sortBy} direction={filterState.sortDirection} onSort={onSortChange} />}
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
                                avatarClassName={styles['second-gs-columns-to-hide']}
                            />
                            {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <span className={baseStyles['mobile-season']}>{player.season == null ? '—' : formatSeason(player.season)}</span>}
                        </td>
                        {cells?.clubs ? <td className={styles['first-gs-columns-to-hide']}>{cells.clubs}</td> : <ClubBadgesCell
                            cellClassName={styles['first-gs-columns-to-hide']}
                            clubIds={player.clubs_played_for?.split(',')}
                        />}
                        <td className={`${styles['first-gs-columns-to-hide']} ${baseStyles['position-column']}`}>{cells?.position ?? player.sub_position ?? '—'}</td>
                        {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td className={baseStyles['season-column']}>{player.season == null ? '—' : formatSeason(player.season)}</td>}
                        {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <td className={baseStyles.numeric}>{player.number_of_seasons ?? '—'}</td>}
                        {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td className={baseStyles.numeric}>{player.number_of_games ?? '—'}</td>}
                        {onViewDetails && <td className={baseStyles['details-column']}><button type="button" className={`${playerStyles['filter-button-player']} ${detailStyles.detailsButton}`} onClick={() => onViewDetails(player)} aria-label={`View ${filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH ? "seasons" : "games"} for ${player.player_name}`}><span className={detailStyles.detailsLabel}>View {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH ? "seasons" : "games"}</span><span className={detailStyles.detailsCompactLabel} aria-hidden="true">View</span></button></td>}
                        {renderExtraCells?.(index)}
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
