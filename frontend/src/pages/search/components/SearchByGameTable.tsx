import {useInfiniteScroll} from "../hooks/useInfiniteScroll";
import {fetchPlayerGameData} from "../../../lib/SearchUrlUtils";
import baseStyles from './SearchBaseTable.module.css';
import styles from './SearchByGameTable.module.css';
import React from "react";
import {convertDateStringToDate, dateFormatter, formatSeason} from "../../../lib/DateUtils";
import {LoadingBar} from "../../../components/LoadingBar";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {PlayerGameSearchResult} from "../../../types/Player";
import {PlayerCell} from "./PlayerCell";
import {ClubBadgesCell} from "./ClubBadgesCell";
import {SortableTh} from "./SortableTh";
import {SortOptions} from "../../../types/SearchOptions";
import shared from "../../../styles/shared.module.css";


interface SearchByGameTableProps {
    filterState: SearchFilterState;
    onSortChange: (sortBy: SortOptions) => void;
}

export const SearchByGameTable: React.FC<SearchByGameTableProps> = ({filterState, onSortChange}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef} =
        useInfiniteScroll<PlayerGameSearchResult>(fetchPlayerGameData);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && (
                <>
                    <table className={baseStyles['generic-table']}>
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th className={baseStyles['player-name']}>Player</th>
                            <th className={styles['first-columns-to-hide']}>Club</th>
                            <th className={styles['second-columns-to-hide']}>Competition</th>
                            <th className={styles['second-columns-to-hide']}>Season</th>
                            <th className={styles['third-columns-to-hide']}>Date</th>
                            <th className={styles['first-columns-to-hide']}>Position</th>
                            <th>Result</th>
                            <th className={styles['first-columns-to-hide']}>Mins Played</th>
                            <SortableTh label="Goals" columnSort={SortOptions.GOALS} activeSort={filterState.sortBy} onSort={onSortChange} />
                            <SortableTh label="Assists" columnSort={SortOptions.ASSISTS} activeSort={filterState.sortBy} onSort={onSortChange} />
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
                                    <PlayerCell
                                        playerId={playerGame.player_id}
                                        playerName={playerGame.player_name}
                                        countryCode={playerGame.country_code}
                                        imageUrl={playerGame.image_url}
                                        flagClassName={styles['third-columns-to-hide']}
                                        avatarClassName={styles['third-columns-to-hide']}
                                    />
                                </td>
                                <ClubBadgesCell
                                    cellClassName={styles['first-columns-to-hide']}
                                    clubIds={[playerGame.club_id]}
                                />
                                <td className={styles['second-columns-to-hide']}>
                                    <img
                                        src={`https://flagcdn.com/w20/${playerGame.competition_country_code}.png`}
                                        alt={playerGame.competition_name}
                                        style={{marginRight: '5px', width: '18px', height: "auto" }}
                                    />
                                    {playerGame.competition_name}
                                </td>
                                <td className={styles['second-columns-to-hide']}>{formatSeason(playerGame.season)}</td>
                                <td className={styles['third-columns-to-hide']}>{dateFormatter.format(convertDateStringToDate(playerGame.date))}</td>
                                <td className={styles['first-columns-to-hide']}>{playerGame.sub_position}</td>
                                <td style={{display: 'flex', gap: '7px'}}>
                                    <img
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.home_club_id}.png`}
                                        alt={playerGame.home_club_name}
                                        className={shared['club-badge']}
                                        title={playerGame.home_club_name}
                                    />
                                    <span>{playerGame.home_club_goals} - {playerGame.away_club_goals}</span>
                                    <img
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.away_club_id}.png`}
                                        alt={playerGame.away_club_name}
                                        className={shared['club-badge']}
                                        title={playerGame.away_club_name}
                                    />
                                </td>
                                <td className={styles['first-columns-to-hide']}>{playerGame.minutes_played}</td>
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
