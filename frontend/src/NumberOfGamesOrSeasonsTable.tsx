import {FilterState, PlayerNumberOfGamesOrSeasonsResult, SortOptions} from "./types";
import {useInfiniteScroll} from "./InfiniteScrollWrapper";
import './InfiniteScrollWrapper.css';
import {fetchNumberOfGamesOrSeasonsResult} from "./searchUrlUtils";
import {Link} from "react-router-dom";
import React from "react";


interface NumberOfGamesOrSeasonsTableProps {
    filterState: FilterState;
}

export const NumberOfGamesOrSeasonsTable: React.FC<NumberOfGamesOrSeasonsTableProps> = ({filterState}) => {
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
                            <th>Clubs</th>
                            <th>Position</th>
                            {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <th>Number of seasons</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((player, index) => (
                            <tr key={player.player_id}
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
                                <td>{player.sub_position}</td>
                                {filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH && <td>{player.number_of_seasons}</td>}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    )
}