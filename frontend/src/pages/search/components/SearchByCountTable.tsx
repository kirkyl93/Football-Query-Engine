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
import {ClubBadgesCell} from "./ClubBadgesCell";


interface SearchByCountTableProps {
    filterState: SearchFilterState;
    onViewDetails: (player: PlayerNumberOfGamesOrSeasonsResult) => void;
}

export const SearchByCountTable: React.FC<SearchByCountTableProps> = ({filterState, onViewDetails}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef, retry} =
    useInfiniteScroll<PlayerNumberOfGamesOrSeasonsResult>(fetchNumberOfGamesOrSeasonsResult);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && (
                <>
                    <table className={`${baseStyles['generic-table']} ${baseStyles['results-table']}`}>
                        <thead>
                        <tr>
                            <th className={baseStyles.numeric}>Rank</th>
                            <th className={baseStyles['player-name']}>Player</th>
                            <th className={styles['first-gs-columns-to-hide']}>Clubs</th>
                            <th className={styles['first-gs-columns-to-hide']}>Position</th>
                            {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <th className={baseStyles['season-column']}>Season</th>}
                            {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <th className={baseStyles.numeric}>Number of seasons</th>}
                            {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <th className={baseStyles.numeric}>Number of games</th>}
                            <th className={baseStyles['details-column']}>Details</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((player, index) => (
                            <tr key={player.player_id.toString() + player.season.toString()}
                                ref={data.length === index + 1 ? lastElementRef : null}
                            >
                                <td className={baseStyles.numeric}>
                                    {player.rank}.
                                </td>
                                <td className={baseStyles['player-cell']}>
                                    <PlayerCell
                                        playerId={player.player_id}
                                        playerName={player.player_name}
                                        countryCode={player.country_code}
                                        imageUrl={player.image_url}
                                        avatarClassName={styles['second-gs-columns-to-hide']}
                                    />
                                    {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <span className={baseStyles['mobile-season']}>{formatSeason(player.season)}</span>}
                                </td>
                                <ClubBadgesCell
                                    cellClassName={styles['first-gs-columns-to-hide']}
                                    clubIds={player.clubs_played_for.split(',')}
                                />
                                <td className={styles['first-gs-columns-to-hide']}>{player.sub_position}</td>
                                {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td className={baseStyles['season-column']}>{formatSeason(player.season)}</td>}
                                {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <td className={baseStyles.numeric}>{player.number_of_seasons}</td>}
                                {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td className={baseStyles.numeric}>{player.number_of_games}</td>}
                                <td className={baseStyles['details-column']}><button type="button" className={`${playerStyles['filter-button-player']} ${detailStyles.detailsButton}`} onClick={() => onViewDetails(player)} aria-label={`View ${filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH ? "seasons" : "games"} for ${player.player_name}`}><span className={detailStyles.detailsLabel}>View {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH ? "seasons" : "games"}</span><span className={detailStyles.detailsCompactLabel} aria-hidden="true">View</span></button></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </>
            )}
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
