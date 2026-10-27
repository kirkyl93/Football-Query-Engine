import playerStyles from '../../player/Player.module.css';
import {useMemo, useState} from 'react';
import ChartSectionModal from '../../player/components/charts/ChartSectionModal';
import {SearchFilterState} from '../../../types/SearchFilterState';
import {SortOptions, StatScope} from '../../../types/SearchOptions';
import {convertDateStringToDate, dateFormatter, formatSeason} from '../../../lib/DateUtils';
import {getDisplayStatForSmallScreen, getDisplayTitleForSmallScreen} from '../lib/smallScreenStat';
import {addDetailStats, DetailResult, DetailStats, detailSeasons, emptyDetailStats, hasGameQualificationFilters} from '../lib/searchDetails';
import {useSearchDetails} from '../hooks/useSearchDetails';
import {SearchDetailsChart} from './SearchDetailsChart';
import SearchTitle from './SearchTitle';
import base from './SearchBaseTable.module.css';
import styles from './SearchDetails.module.css';

interface Props {
    result: DetailResult;
    search: string;
    filterState: SearchFilterState;
    onClose: () => void;
}
const PAGE_SIZE = 50;
function StatCells({stats, showAppearances = true}: {stats: DetailStats; showAppearances?: boolean}) {
    return <>{showAppearances && <td>{stats.appearances}</td>}<td>{stats.minutes}</td><td>{stats.goals}</td>
        <td>{stats.assists}</td><td>{stats.yellows}</td><td>{stats.reds}</td></>;
}

export function SearchDetailsModal({result, search, filterState, onClose}: Props) {
    const seasonsView = filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH;
    const resultSeason = filterState.statScope === StatScope.SEASON && !seasonsView ? result.season : undefined;
    const {games, loading, error, retry} = useSearchDetails(search, result, resultSeason);
    const [onlyQualifying, setQualifyingOnly] = useState(true);
    const canToggleQualification = hasGameQualificationFilters(filterState);
    const qualifyingOnly = !canToggleQualification || onlyQualifying;
    const [view, setView] = useState<'table' | 'chart'>('table');
    const [page, setPage] = useState(0);
    const qualifyingGames = useMemo(() => (games ?? []).filter(game => game.qualifies), [games]);
    const visibleGames = qualifyingOnly ? qualifyingGames : (games ?? []);
    const seasons = useMemo(() => detailSeasons(games ?? [], 'qualifying_seasons' in result ? result.qualifying_seasons : []), [games, result]);
    const visibleSeasons = qualifyingOnly ? seasons.filter(season => season.qualifies) : seasons;
    const count = seasonsView ? visibleSeasons.length : visibleGames.length;
    const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const totals = useMemo(() => qualifyingGames.reduce((sum, game) => addDetailStats(sum, game.stats), emptyDetailStats()), [qualifyingGames]);
    const expectedCount = 'total_appearances' in result ? result.total_appearances : seasonsView ? result.number_of_seasons : result.number_of_games;
    const loadedCount = seasonsView ? seasons.filter(season => season.qualifies).length : qualifyingGames.length;
    const changed = games && (expectedCount !== loadedCount || ('total_goals' in result &&
        (result.total_goals !== totals.goals || result.total_assists !== totals.assists || result.total_minutes_played !== totals.minutes ||
         result.total_yellow_cards !== totals.yellows || result.total_red_cards !== totals.reds)));
    const title = `${result.player_name}${resultSeason === undefined ? '' : ` · ${formatSeason(resultSeason)}`} · ${seasonsView ? 'Seasons' : 'Games'}`;
    const start = page * PAGE_SIZE;
    const unit = (n: number) => seasonsView ? (n === 1 ? "season" : "seasons") : (n === 1 ? "game" : "games");
    return <ChartSectionModal title={title} subtitle={<SearchTitle filterState={filterState} compact/>} onClose={onClose}>
        <div className={styles.content}>
            <div className={styles.heading}>
                <div className={styles.summary} aria-label="Original search result">
                    {'total_appearances' in result ? <>
                        <strong>{getDisplayTitleForSmallScreen(filterState.sortBy)}: {getDisplayStatForSmallScreen(filterState.sortBy, result)}</strong>
                        <span>{result.total_appearances} apps · {result.total_minutes_played} mins</span>
                    </> : <strong>{expectedCount} qualifying {unit(expectedCount)}</strong>}
                    {games && !qualifyingOnly && <span>{count} total {unit(count)}</span>}
                </div>
                {games && !seasonsView && <div className={styles.viewButtons} role="group" aria-label="Detail view">
                    <button type="button" className={`${playerStyles['filter-button-player']} ${styles.button}`} aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
                    <button type="button" className={`${playerStyles['filter-button-player']} ${styles.button}`} aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
                </div>}
            </div>
            {games && canToggleQualification && <div className={styles.toolbar}>
                <label><input type="checkbox" checked={qualifyingOnly} onChange={event => {
                    setQualifyingOnly(event.target.checked); setPage(0);
                }}/> Qualifying only</label>
                {!qualifyingOnly && (seasonsView || view === 'table') && <span className={styles.hint}>✓ Qualifying</span>}
            </div>}
            {loading && <p role="status">Loading {seasonsView ? 'seasons' : 'games'}…</p>}
            {error && <div role="alert"><p>{error}</p><button type="button" className={`${playerStyles['filter-button-player']} ${styles.button}`} onClick={retry}>Retry details</button></div>}
            {games && <>
                {changed && <p role="status">The detail data differs from the original search result. Run the search again to refresh it.</p>}
                {count === 0 ? <p>No {qualifyingOnly ? 'qualifying ' : ''}{seasonsView ? 'seasons' : 'games'} available.</p> : <>
                    {!seasonsView && view === 'chart' && <SearchDetailsChart key={String(qualifyingOnly)} games={visibleGames} penalties={filterState.penalties}/>}
                    {(seasonsView || view === 'table') && <>
                        <div className={styles.tableWrap}>
                            <table className={`${base['generic-table']} ${styles.table}`}>
                                <caption className={styles.srOnly}>{seasonsView ? 'Season statistics under the search filters' : 'Game statistics under the search minute and penalty settings'}</caption>
                                <thead><tr>{!qualifyingOnly && <th><span className={styles.srOnly}>Qualifying</span></th>}{seasonsView ? <th>Season</th> : <>
                                    <th>Date</th><th>Season</th><th>Competition</th><th>Game</th><th>Playing for</th>
                                </>}{seasonsView && <th>Apps</th>}<th>Mins</th><th>Goals</th><th>Assists</th><th>Yellows</th><th>Reds</th></tr></thead>
                                <tbody>{seasonsView ? visibleSeasons.slice(start, start + PAGE_SIZE).map(season =>
                                    <tr key={season.season} className={!qualifyingOnly && season.qualifies ? styles.qualifying : undefined}>
                                        {!qualifyingOnly && <td>{season.qualifies ? '✓' : '—'}<span className={styles.srOnly}>{season.qualifies ? 'Qualifying season' : 'Other season'}</span></td>}
                                        <td>{formatSeason(season.season)}</td><StatCells stats={season.stats}/>
                                    </tr>) : visibleGames.slice(start, start + PAGE_SIZE).map(game =>
                                    <tr key={game.game_id} className={!qualifyingOnly && game.qualifies ? styles.qualifying : undefined}>
                                        {!qualifyingOnly && <td>{game.qualifies ? '✓' : '—'}<span className={styles.srOnly}>{game.qualifies ? 'Qualifying game' : 'Other game'}</span></td>}
                                        <td>{dateFormatter.format(convertDateStringToDate(game.date))}</td><td>{formatSeason(game.season)}</td><td>{game.competition_name}</td>
                                        <td>{game.home_club_name} {game.home_club_goals}–{game.away_club_goals} {game.away_club_name}</td>
                                        <td>{game.club_id === game.home_club_id ? game.home_club_name : game.away_club_name}</td>
                                        <StatCells stats={game.stats} showAppearances={false}/>
                                    </tr>)}</tbody>
                            </table>
                        </div>
                        {pageCount > 1 && <nav className={styles.pagination} aria-label="Detail table pages">
                            <button type="button" className={`${playerStyles['filter-button-player']} ${styles.button}`} disabled={page === 0} onClick={() => setPage(n => n - 1)}>Previous</button>
                            <span>Page {page + 1} of {pageCount}</span>
                            <button type="button" className={`${playerStyles['filter-button-player']} ${styles.button}`} disabled={page + 1 >= pageCount} onClick={() => setPage(n => n + 1)}>Next</button>
                        </nav>}
                    </>}
                </>}
            </>}
        </div>
    </ChartSectionModal>;
}
