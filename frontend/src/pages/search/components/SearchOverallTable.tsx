import {useInfiniteScroll} from "../hooks/useInfiniteScroll";
import baseStyles from './SearchBaseTable.module.css';
import styles from './SearchOverallTable.module.css';
import {formatSeason} from "../../../lib/DateUtils";
import React from "react";
import {fetchPlayerOverallOrSeasonData} from "../../../lib/SearchUrlUtils";
import {LoadingBar} from "../../../components/LoadingBar";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {SortOptions, StatScope} from "../../../types/SearchOptions";
import {PlayerSearchResult} from "../../../types/Player";
import {PlayerCell} from "./PlayerCell";
import {ClubBadgesCell} from "./ClubBadgesCell";
import {SortableTh} from "./SortableTh";
import {getDisplayStatForSmallScreen, getDisplayTitleForSmallScreen} from "../lib/smallScreenStat";

interface SearchOverallTableProps {
    filterState: SearchFilterState;
    onSortChange: (sortBy: SortOptions) => void;
}

export const SearchOverallTable: React.FC<SearchOverallTableProps> = ({filterState, onSortChange}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef} =
        useInfiniteScroll<PlayerSearchResult>(fetchPlayerOverallOrSeasonData);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && (
                <>
                    <table className={baseStyles['generic-table']}>
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className={baseStyles['player-name']}>Player</th>
                            <th className={styles['first-columns-to-hide']}>Clubs</th>
                            {filterState.statScope === StatScope.SEASON && <th>Season</th>}
                            <th className={styles['second-columns-to-hide']}>Position</th>
                            <SortableTh label="Apps" columnSort={SortOptions.APPEARANCES} activeSort={filterState.sortBy} onSort={onSortChange} className={`${baseStyles['table-header']} ${styles['third-columns-to-hide']}`} />
                            <SortableTh label="Mins" columnSort={SortOptions.MINUTES_PLAYED} activeSort={filterState.sortBy} onSort={onSortChange} className={`${baseStyles['table-header']} ${styles['third-columns-to-hide']}`} />
                            <SortableTh label="Goals" columnSort={SortOptions.GOALS} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />
                            <SortableTh label="Assists" columnSort={SortOptions.ASSISTS} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />
                            <SortableTh label="Yellows" columnSort={SortOptions.YELLOW_CARDS} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />
                            <SortableTh label="Reds" columnSort={SortOptions.RED_CARDS} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                                <SortableTh label="Mins per goal" columnSort={SortOptions.MINUTES_PER_GOAL} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />}
                            {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                                <SortableTh label="Mins per assist" columnSort={SortOptions.MINUTES_PER_ASSIST} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />}
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                <SortableTh label="Mins per goal or assist" columnSort={SortOptions.MINUTES_PER_GOAL_OR_ASSIST} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />}
                            {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                                <SortableTh label="Mins per Yellow" columnSort={SortOptions.MINUTES_PER_YELLOW} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />}
                            {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                                <SortableTh label="Mins per Red" columnSort={SortOptions.MINUTES_PER_RED} activeSort={filterState.sortBy} onSort={onSortChange} className={styles['third-columns-to-hide']} />}
                            <th className={styles['small-screen-display']}>
                                {getDisplayTitleForSmallScreen(filterState.sortBy)}
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((player, index) => (
                            <tr key={player.player_id.toString() + player.season.toString()}
                                ref={data.length === index + 1 ? lastElementRef : null}
                            >
                                <td>
                                    {player.rank}.
                                </td>
                                <td>
                                    <PlayerCell
                                        playerId={player.player_id}
                                        playerName={player.player_name}
                                        countryCode={player.country_code}
                                        imageUrl={player.image_url}
                                        avatarClassName={styles['second-columns-to-hide']}
                                    />
                                </td>
                                <ClubBadgesCell
                                    cellClassName={styles['first-columns-to-hide']}
                                    clubIds={player.clubs_played_for.split(',')}
                                />
                                {filterState.statScope === StatScope.SEASON && <td>{formatSeason(player.season)}</td>}
                                <td className={styles['second-columns-to-hide']}>{player.sub_position}</td>
                                <td className={styles['third-columns-to-hide']}><strong>{player.total_appearances}</strong>
                                    {!filterState.subsOnly && (<> ({player.substitute_appearances})</>)}</td>
                                <td className={styles['third-columns-to-hide']}>{player.total_minutes_played}</td>
                                <td className={styles['third-columns-to-hide']}>{player.total_goals}</td>
                                <td className={styles['third-columns-to-hide']}>{player.total_assists}</td>
                                <td className={styles['third-columns-to-hide']}>{player.total_yellow_cards}</td>
                                <td className={styles['third-columns-to-hide']}>{player.total_red_cards}</td>
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                                    <td className={styles['third-columns-to-hide']}>{player.mins_per_goal}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                                    <td className={styles['third-columns-to-hide']}>{player.mins_per_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                    <td className={styles['third-columns-to-hide']}>{player.mins_per_goal_or_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                                    <td className={styles['third-columns-to-hide']}>{player.mins_per_yellow}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                                    <td className={styles['third-columns-to-hide']}>{player.mins_per_red}</td>}
                                <td className={styles['small-screen-display']}>
                                    {getDisplayStatForSmallScreen(filterState.sortBy, player)}
                                </td>

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
            />
        </div>
    );
}
