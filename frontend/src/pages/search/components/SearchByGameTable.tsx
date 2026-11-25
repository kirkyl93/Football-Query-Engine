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
import type {ResultCellContent} from "./ResultCellContent";
import {ClubBadgesCell} from "./ClubBadgesCell";
import {SortableTh} from "./SortableTh";
import {SortOptions} from "../../../types/SearchOptions";
import shared from "../../../styles/shared.module.css";


interface SearchByGameTableProps {
    filterState: SearchFilterState;
    onSortChange: (sortBy: SortOptions) => void;
}

export const SearchByGameTable: React.FC<SearchByGameTableProps> = ({filterState, onSortChange}) => {
    const {data, hasData, hasMore, loading, error, lastElementRef, retry} =
        useInfiniteScroll<PlayerGameSearchResult>(fetchPlayerGameData);

    return (
        <div className={baseStyles['table-container']}>
            {hasData && <SearchGameResults data={data} filterState={filterState} onSortChange={onSortChange} lastElementRef={lastElementRef}/>}
            <LoadingBar
                loading={loading}
                hasData={hasData}
                hasMore={hasMore}
                error={error}
                onRetry={retry}
            />
        </div>
    );
}

export function SearchGameResults<Row extends Partial<PlayerGameSearchResult>>({
    data, filterState, onSortChange, lastElementRef, extraHeaders, renderExtraCells, getRowClassName, getCellContent,
}: {
    data: Row[];
    extraHeaders?: React.ReactNode;
    renderExtraCells?: (index: number) => React.ReactNode;
    getRowClassName?: (index: number) => string | undefined;
    getCellContent?: (index: number) => ResultCellContent | undefined;
    filterState: Pick<SearchFilterState, "statScope" | "sortBy" | "sortDirection" | "subsOnly">;
    onSortChange?: (sortBy: SortOptions) => void;
    lastElementRef?: React.RefCallback<HTMLTableRowElement>;
}) {
    return (
        <table className={baseStyles['generic-table']}>
            <thead>
            <tr>
                <th className={baseStyles.numeric}>Rank</th>
                <th className={baseStyles['player-name']}>Player</th>
                <th className={styles['first-columns-to-hide']}>Club</th>
                <th className={styles['second-columns-to-hide']}>Competition</th>
                <th className={styles['second-columns-to-hide']}>Season</th>
                <th className={styles['third-columns-to-hide']}>Date</th>
                <th className={`${styles['first-columns-to-hide']} ${baseStyles['position-column']}`}>Position</th>
                <th>Result</th>
                <th className={`${baseStyles.numeric} ${styles['first-columns-to-hide']}`}>Mins Played</th>
                <SortableTh label="Goals" columnSort={SortOptions.GOALS} activeSort={filterState.sortBy} direction="desc" allowReverse={false} onSort={onSortChange} />
                <SortableTh label="Assists" columnSort={SortOptions.ASSISTS} activeSort={filterState.sortBy} direction="desc" allowReverse={false} onSort={onSortChange} />
                <SortableTh label="Goals + assists" columnSort={SortOptions.GOALS_AND_ASSISTS} activeSort={filterState.sortBy} direction="desc" allowReverse={false} onSort={onSortChange} />
                {extraHeaders}
            </tr>
            </thead>
            <tbody>
            {data.map((playerGame, index) => {
                const cells = getCellContent?.(index);
                return (
                    <tr key={playerGame.player_id == null ? index : `${playerGame.player_id}-${playerGame.date}`}
                        className={getRowClassName?.(index)}
                        ref={data.length === index + 1 ? lastElementRef : null}
                    >
                        <td className={baseStyles.numeric}>
                            {playerGame.rank == null ? '—' : playerGame.rank + '.'}
                        </td>
                        <td>
                            <PlayerCell
                                flag={cells?.nationality}
                                playerId={playerGame.player_id}
                                playerName={playerGame.player_name}
                                countryCode={playerGame.country_code}
                                imageUrl={playerGame.image_url}
                                flagClassName={styles['third-columns-to-hide']}
                                avatarClassName={styles['third-columns-to-hide']}
                            />
                        </td>
                        {cells?.clubs ? <td className={styles['first-columns-to-hide']}>{cells.clubs}</td> : <ClubBadgesCell
                            cellClassName={styles['first-columns-to-hide']}
                            clubIds={playerGame.club_id == null ? undefined : [playerGame.club_id]}
                        />}
                        <td className={styles['second-columns-to-hide']}>
                            {playerGame.competition_country_code && <img
                                src={`https://flagcdn.com/w20/${playerGame.competition_country_code}.png`}
                                alt={playerGame.competition_name ?? '—'}
                                style={{marginRight: '5px', width: '18px', height: '13px', objectFit: 'cover', verticalAlign: 'middle'}}
                                width={18}
                                height={13}
                                loading="lazy"
                                decoding="async"
                            />}
                            {playerGame.competition_name}
                        </td>
                        <td className={styles['second-columns-to-hide']}>{playerGame.season == null ? '—' : formatSeason(playerGame.season)}</td>
                        <td className={styles['third-columns-to-hide']}>{playerGame.date ? dateFormatter.format(convertDateStringToDate(playerGame.date)) : '—'}</td>
                        <td className={`${styles['first-columns-to-hide']} ${baseStyles['position-column']}`}>{cells?.position ?? playerGame.sub_position ?? '—'}</td>
                        <td>
                            <span className={baseStyles['match-result']}>
                            {playerGame.home_club_id != null && <img
                                src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.home_club_id}.png`}
                                alt={playerGame.home_club_name}
                                className={shared['club-badge']}
                                title={playerGame.home_club_name}
                                width={38}
                                height={38}
                                loading="lazy"
                                decoding="async"
                            />}
                            <span>{playerGame.home_club_goals ?? '—'} - {playerGame.away_club_goals ?? '—'}</span>
                            {playerGame.away_club_id != null && <img
                                src={`https://tmssl.akamaized.net/images/wappen/head/${playerGame.away_club_id}.png`}
                                alt={playerGame.away_club_name}
                                className={shared['club-badge']}
                                title={playerGame.away_club_name}
                                width={38}
                                height={38}
                                loading="lazy"
                                decoding="async"
                            />}
                            </span>
                        </td>
                        <td className={`${baseStyles.numeric} ${styles['first-columns-to-hide']}`}>{playerGame.minutes_played ?? '—'}</td>
                        <td className={baseStyles.numeric}>{playerGame.goals ?? '—'}</td>
                        <td className={baseStyles.numeric}>{playerGame.assists ?? '—'}</td>
                        <td className={baseStyles.numeric}>{playerGame.goals == null || playerGame.assists == null ? '—' : playerGame.goals + playerGame.assists}</td>
                        {renderExtraCells?.(index)}
                    </tr>
                );
            })}
            </tbody>
        </table>
    );
}
