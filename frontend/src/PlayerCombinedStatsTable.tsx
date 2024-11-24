import {FilterState, PlayerSearchResult, SortOptions, StatScope} from "./types";
import {useInfiniteScroll} from "./InfiniteScrollWrapper";
import './InfiniteScrollWrapper.css';
import {formatSeason} from "./dateUtils";
import React from "react";
import {Link} from "react-router-dom";
import {fetchPlayerOverallOrSeasonData} from "./searchUrlUtils";
import {LoadingBar} from "./LoadingBar";

interface PlayerCombinedStatsTableProps {
    filterState: FilterState;
}

export const PlayerCombinedStatsTable: React.FC<PlayerCombinedStatsTableProps> = ({filterState}) => {
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
                            <th className="column-to-hide">Clubs</th>
                            {filterState.statScope === StatScope.SEASON && <th>Season</th>}
                            <th className="column-to-hide">Position</th>
                            <th className="table-header">Apps</th>
                            <th className="table-header">Mins</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Yellows</th>
                            <th>Reds</th>
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL && <th>Mins per goal</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST && <th>Mins per assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                <th>Mins per goal or assist</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW && <th>Mins per Yellow</th>}
                            {filterState.sortBy === SortOptions.MINUTES_PER_RED && <th>Mins per Red</th>}
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
                                    <img
                                        src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
                                        alt={`${player.country_code}`}
                                        style={{width: '20px', height: '14px', marginRight: '10px'}}
                                    />
                                    <img
                                        src={player.image_url}
                                        alt={player.player_name}
                                        width="50"
                                        style={{marginRight: '10px', borderRadius: '50%'}}
                                    />
                                    <Link
                                        to={`/player/${player.player_id}`}
                                        style={{textDecoration: 'none', color: 'inherit'}}
                                    >
                                        {player.player_name}
                                    </Link>
                                </td>
                                <td className="column-to-hide">
                                    {player.clubs_played_for.split(',').map(clubId => {
                                        const trimmedClubId = clubId.trim();
                                        return (
                                            <img
                                                key={trimmedClubId}
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(trimmedClubId)}.png`}
                                                alt={`Club ${trimmedClubId}`}
                                                width="20px"
                                                style={{marginRight: '5px'}}
                                            />
                                        );
                                    })}
                                </td>
                                {filterState.statScope === StatScope.SEASON && <td>{formatSeason(player.season)}</td>}
                                <td className="column-to-hide">{player.sub_position}</td>
                                <td><strong>{player.total_appearances}</strong>
                                    {!filterState.subsOnly && (<> ({player.substitute_appearances})</>)}</td>
                                <td>{player.total_minutes_played}</td>
                                <td>{player.total_goals}</td>
                                <td>{player.total_assists}</td>
                                <td>{player.total_yellow_cards}</td>
                                <td>{player.total_red_cards}</td>
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL && <td>{player.mins_per_goal}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_ASSIST &&
                                    <td>{player.mins_per_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_GOAL_OR_ASSIST &&
                                    <td>{player.mins_per_goal_or_assist}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_YELLOW &&
                                    <td>{player.mins_per_yellow}</td>}
                                {filterState.sortBy === SortOptions.MINUTES_PER_RED && <td>{player.mins_per_red}</td>}
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