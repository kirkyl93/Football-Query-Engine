import {FilterState, PlayerGameSearchResult, StatScope} from "./types";
import {useInfiniteScroll} from "./InfiniteScrollWrapper";
import {fetchPlayerGameData} from "./searchUrlUtils";
import React from "react";
import {Link} from "react-router-dom";
import {convertDateStringToDate, dateFormatter, formatSeason} from "./dateUtils";
import {LoadingBar} from "./LoadingBar";


interface PlayerGameStatsTableProps {
    filterState: FilterState
}

export const PlayerGameStatsTable: React.FC<PlayerGameStatsTableProps> = ({filterState}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef} =
        useInfiniteScroll<PlayerGameSearchResult>(fetchPlayerGameData);

    return (
        <div className="table-container">
            {hasData && (
                <>
                    <table className="generic-table">
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className="player-name">Player</th>
                            <th>Club</th>
                            <th>Competition</th>
                            <th>Season</th>
                            <th>Date</th>
                            <th>Position</th>
                            <th>Result</th>
                            <th>Mins Played</th>
                            <th>Goals</th>
                            <th>Assists</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((playerGame, index) => (
                            <tr key={playerGame.player_id.toString() + playerGame.date.toString()}
                                ref={data.length === index + 1 ? lastElementRef : null}
                            >
                                <td>
                                    {playerGame.rank}.
                                </td>
                                <td>
                                    <img
                                        src={`https://flagicons.lipis.dev/flags/4x3/${playerGame.country_code}.svg`}
                                        alt={`${playerGame.country_code}`}
                                        style={{width: '20px', height: '14px', marginRight: '10px'}}
                                    />
                                    <img
                                        src={playerGame.image_url}
                                        alt={playerGame.player_name}
                                        width="50"
                                        style={{marginRight: '10px', borderRadius: '50%'}}
                                    />
                                    <Link
                                        to={`/player/${playerGame.player_id}`}
                                        style={{textDecoration: 'none', color: 'inherit'}}
                                    >
                                        {playerGame.player_name}
                                    </Link>
                                </td>
                                <td>
                                    <img
                                        key={playerGame.club_id}
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(playerGame.club_id)}.png`}
                                        alt={`Club ${playerGame.club_id}`}
                                        width="20px"
                                        style={{marginRight: '5px'}}
                                    />
                                </td>
                                <td>
                                    <img
                                        src={`https://flagcdn.com/w20/${playerGame.competition_country_code}.png`}
                                        alt={playerGame.competition_name}
                                        // className="flag-icon"
                                        style={{marginRight: '5px', width: '18px', height: "auto" }}
                                    />
                                    {playerGame.competition_name}
                                </td>
                                <td>{formatSeason(playerGame.season)}</td>
                                <td>{dateFormatter.format(convertDateStringToDate(playerGame.date))}</td>
                                <td>{playerGame.sub_position}</td>
                                <td style={{display: 'flex', gap: '7px'}}>
                                    <img
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.home_club_id}.png`}
                                        alt={playerGame.home_club_name}
                                        style={{width: '30px'}}
                                        title={playerGame.home_club_name}
                                    />
                                    <span>{playerGame.home_club_goals} - {playerGame.away_club_goals}</span>
                                    <img
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.away_club_id}.png`}
                                        alt={playerGame.away_club_name}
                                        style={{width: '30px'}}
                                        title={playerGame.away_club_name}
                                    />
                                </td>
                                <td>{playerGame.minutes_played}</td>
                                <td>{playerGame.goals}</td>
                                <td>{playerGame.assists}</td>
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