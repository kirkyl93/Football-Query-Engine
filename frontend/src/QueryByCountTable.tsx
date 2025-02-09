import {SearchFilterState, PlayerNumberOfGamesOrSeasonsResult, SortOptions, StatScope} from "./types";
import {useInfiniteScroll} from "./QueryBaseTable";
import './QueryBaseTable.css';
import './QueryByCountTable.css';
import {fetchNumberOfGamesOrSeasonsResult} from "./searchUrlUtils";
import {Link} from "react-router-dom";
import React from "react";
import {formatSeason} from "./dateUtils";
import {LoadingBar} from "./LoadingBar";


interface QueryByCountTableProps {
    filterState: SearchFilterState;
}

export const QueryByCountTable: React.FC<QueryByCountTableProps> = ({filterState}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef} =
    useInfiniteScroll<PlayerNumberOfGamesOrSeasonsResult>(fetchNumberOfGamesOrSeasonsResult);

    return (
        <div className="table-container">
            {hasData && (
                <>
                    <table className="generic-table">
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className="player-name">Player</th>
                            <th className="first-gs-columns-to-hide">Clubs</th>
                            <th className="first-gs-columns-to-hide">Position</th>
                            {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <th>Season</th>}
                            {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <th>Number of seasons</th>}
                            {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <th>Number of games</th>}
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
                                        className="second-gs-columns-to-hide"
                                        src={`https://flagicons.lipis.dev/flags/4x3/${player.country_code}.svg`}
                                        alt={`${player.country_code}`}
                                        style={{width: '20px', height: '14px', marginRight: '10px'}}
                                    />
                                    <img
                                        className="second-gs-columns-to-hide"
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
                                <td className="first-gs-columns-to-hide">
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
                                <td className="first-gs-columns-to-hide">{player.sub_position}</td>
                                {filterState.statScope === StatScope.SEASON && filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td>{formatSeason(player.season)}</td>}
                                {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <td>{player.number_of_seasons}</td>}
                                {filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH && <td>{player.number_of_games}</td>}
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
    )
}