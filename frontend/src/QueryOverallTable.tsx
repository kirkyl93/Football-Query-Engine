import {SearchFilterState, PlayerSearchResult, SortOptions, StatScope} from "./types";
import {useInfiniteScroll} from "./QueryBaseTable";
import './QueryBaseTable.css';
import './QueryOverallTable.css';
import {formatSeason} from "./dateUtils";
import React from "react";
import {Link} from "react-router-dom";
import {fetchPlayerOverallOrSeasonData} from "./searchUrlUtils";
import {LoadingBar} from "./LoadingBar";

interface QueryOverallTableProps {
    filterState: SearchFilterState;
}

const getDisplayTitleForSmallScreen = (sortBy: SortOptions) => {
    switch (sortBy) {
        case SortOptions.GOALS:
            return "Goals";
        case SortOptions.ASSISTS:
            return "Assists";
        case SortOptions.GOALS_AND_ASSISTS:
            return "Goals and assists";
        case SortOptions.YELLOW_CARDS:
            return "Yellows";
        case SortOptions.RED_CARDS:
            return "Reds";
        case SortOptions.MINUTES_PLAYED:
            return "Mins";
        case SortOptions.APPEARANCES:
            return "Apps";
        case SortOptions.MINUTES_PER_GOAL:
            return "Mins per goal";
        case SortOptions.MINUTES_PER_ASSIST:
            return "Mins per assist";
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            return "Mins per goal or assist";
        case SortOptions.MINUTES_PER_YELLOW:
            return "Mins per yellow";
        case SortOptions.MINUTES_PER_RED:
            return "Mins per red";
        default:
            return null;
    }
};

const getDisplayStatForSmallScreen = (sortBy: SortOptions, player: PlayerSearchResult) => {
    switch (sortBy) {
        case SortOptions.GOALS:
            return player.total_goals;
        case SortOptions.ASSISTS:
            return player.total_assists;
        case SortOptions.GOALS_AND_ASSISTS:
            return player.total_goals + player.total_assists;
        case SortOptions.YELLOW_CARDS:
            return player.total_yellow_cards;
        case SortOptions.RED_CARDS:
            return player.total_red_cards;
        case SortOptions.MINUTES_PLAYED:
            return player.total_minutes_played;
        case SortOptions.APPEARANCES:
            return player.total_appearances;
        case SortOptions.MINUTES_PER_GOAL:
            return player.mins_per_goal;
        case SortOptions.MINUTES_PER_ASSIST:
            return player.mins_per_assist;
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            return player.mins_per_goal_or_assist;
        case SortOptions.MINUTES_PER_YELLOW:
            return player.mins_per_yellow;
        case SortOptions.MINUTES_PER_RED:
            return player.mins_per_red;
        default:
            return null;
    }
};

export const QueryOverallTable: React.FC<QueryOverallTableProps> = ({filterState}) => {
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
                                    <img
                                        src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
                                        alt={`${player.country_code}`}
                                        style={{width: '20px', height: '14px', marginRight: '10px'}}
                                    />
                                    <img
                                        className="second-columns-to-hide"
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
                                <td className="first-columns-to-hide">
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