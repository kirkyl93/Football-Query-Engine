import {useInfiniteScroll} from "../hooks/useInfiniteScroll";
import './SearchBaseTable.css';
import './SearchOverallTable.css';
import {formatSeason} from "../../../lib/DateUtils";
import React from "react";
import {fetchPlayerOverallOrSeasonData} from "../../../lib/SearchUrlUtils";
import {LoadingBar} from "../../../components/LoadingBar";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {SortOptions, StatScope} from "../../../types/SearchOptions";
import {PlayerSearchResult} from "../../../types/Player";
import {PlayerCell} from "./PlayerCell";
import {ClubBadgesCell} from "./ClubBadgesCell";
import {getDisplayStatForSmallScreen, getDisplayTitleForSmallScreen} from "../lib/smallScreenStat";

interface SearchOverallTableProps {
    filterState: SearchFilterState;
}

export const SearchOverallTable: React.FC<SearchOverallTableProps> = ({filterState}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef} =
        useInfiniteScroll<PlayerSearchResult>(fetchPlayerOverallOrSeasonData);

    return (
        <div className="table-container">
            {hasData && (
                <>
                    <table className="generic-table">
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className="player-name">Player</th>
                            <th className="first-columns-to-hide">Clubs</th>
                            {filterState.statScope === StatScope.SEASON && <th>Season</th>}
                            <th className="second-columns-to-hide">Position</th>
                            <th className="table-header, third-columns-to-hide">Apps</th>
                            <th className="table-header, third-columns-to-hide">Mins</th>
                            <th className="third-columns-to-hide">Goals</th>
                            <th className="third-columns-to-hide">Assists</th>
                            <th className="third-columns-to-hide">Yellows</th>
                            <th className="third-columns-to-hide">Reds</th>
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                                <th className="third-columns-to-hide">Mins per goal</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                                <th className="third-columns-to-hide">Mins per assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                <th className="third-columns-to-hide">Mins per goal or assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                                <th className="third-columns-to-hide">Mins per Yellow</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                                <th className="third-columns-to-hide">Mins per Red</th>}
                            <th className="small-screen-display">
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
                                        avatarClassName="second-columns-to-hide"
                                    />
                                </td>
                                <ClubBadgesCell
                                    cellClassName="first-columns-to-hide"
                                    clubIds={player.clubs_played_for.split(',')}
                                />
                                {filterState.statScope === StatScope.SEASON && <td>{formatSeason(player.season)}</td>}
                                <td className="second-columns-to-hide">{player.sub_position}</td>
                                <td className="third-columns-to-hide"><strong>{player.total_appearances}</strong>
                                    {!filterState.subsOnly && (<> ({player.substitute_appearances})</>)}</td>
                                <td className="third-columns-to-hide">{player.total_minutes_played}</td>
                                <td className="third-columns-to-hide">{player.total_goals}</td>
                                <td className="third-columns-to-hide">{player.total_assists}</td>
                                <td className="third-columns-to-hide">{player.total_yellow_cards}</td>
                                <td className="third-columns-to-hide">{player.total_red_cards}</td>
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL &&
                                    <td className="third-columns-to-hide">{player.mins_per_goal}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                                    <td className="third-columns-to-hide">{player.mins_per_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                    <td className="third-columns-to-hide">{player.mins_per_goal_or_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                                    <td className="third-columns-to-hide">{player.mins_per_yellow}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_RED &&
                                    <td className="third-columns-to-hide">{player.mins_per_red}</td>}
                                <td className="small-screen-display">
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
