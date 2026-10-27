import {useMemo} from 'react';
import AppearancesMainChart from '../../player/components/appearances/AppearancesMainChart';
import AppearancesTooltip from '../../player/components/appearances/AppearancesTooltip';
import AppearancesSummaryHeader from '../../player/components/appearances/AppearancesSummaryHeader';
import {useChartZoom} from '../../player/hooks/useChartZoom';
import {mapAppearanceEvents} from '../../player/lib/appearancesEventMapper';
import {useChartSizing} from '../../player/lib/chartSizing';
import {resolveBarFills} from '../../player/lib/barFillColours';
import {EventType, PlayerTotals} from '../../../types/Player';
import {PenaltyOptions} from '../../../types/SearchOptions';
import {DetailGame} from '../lib/searchDetails';
import playerStyles from '../../player/Player.module.css';
import shared from '../../../styles/shared.module.css';
import styles from './SearchDetails.module.css';

export function SearchDetailsChart({games, penalties = PenaltyOptions.INCLUDE_PENALTIES}: {
    games: DetailGame[];
    penalties?: PenaltyOptions;
}) {
    // Search scope already determines the games; the player-page defaults must
    // not automatically select the latest season or apply additional filters.
    const data = useMemo(() => games.map((game, index) => ({...game, game_number: index + 1})), [games]);
    const zoom = useChartZoom(data);
    const sizing = useChartSizing(zoom.zoomedData.length);
    const fills = useMemo(() => resolveBarFills(zoom.zoomedData).map((fill, index) =>
        (zoom.zoomedData[index] as DetailGame).qualifies ? fill : '#cbd5e1'), [zoom.zoomedData]);
    const events = useMemo(() => ({
        [EventType.Goals]: penalties !== PenaltyOptions.ONLY_PENALTIES,
        [EventType.Penalties]: penalties !== PenaltyOptions.EXCLUDE_PENALTIES,
        [EventType.Assists]: true,
        [EventType.OwnGoals]: true,
        [EventType.Yellows]: true,
        [EventType.Reds]: true,
        [EventType.CleanSheets]: false,
    }), [penalties]);
    const scatter = useMemo(() => mapAppearanceEvents(zoom.zoomedData, events, false), [zoom.zoomedData, events]);
    const domain = useMemo(() => [0, data.reduce((max, game) => Math.max(max, game.minutes_played[1]), 90)], [data]);
    const byGame = useMemo(() => new Map(data.map(game => [game.game_number, game])), [data]);
    const statsByGame = useMemo(() => new Map(data.map(game => [game.game_number, game.stats])), [data]);
    const fillsByGame = useMemo(() => new Map(zoom.zoomedData.map((game, index) => [game.game_number, fills[index]])), [zoom.zoomedData, fills]);
    const totals = useMemo(() => zoom.zoomedData.reduce<PlayerTotals>((total, appearance) => {
        const game = appearance as DetailGame;
        const pens = penalties === PenaltyOptions.EXCLUDE_PENALTIES ? 0 : game.penalty_goals;
        total.goals += game.stats.goals - pens;
        total.penalties += pens;
        total.assists += game.stats.assists;
        total.ownGoals += game.own_goal_minutes.length;
        total.yellows += game.stats.yellows;
        total.reds += game.stats.reds;
        return total;
    }, {goals: 0, penalties: 0, assists: 0, ownGoals: 0, cleanSheets: 0, yellows: 0, reds: 0}), [zoom.zoomedData, penalties]);
    const hasZoom = zoom.zoomedData.length < data.length;
    const tooltip = useMemo(() => <AppearancesTooltip filteredData={data} filteredByGame={byGame}
        barFillsByGame={fillsByGame} statsByGame={statsByGame}/>, [data, byGame, fillsByGame, statsByGame]);

    return <div className={styles.chart}>
        <div className={styles.chartHeader}>
            <span className={styles.srOnly}>Drag across the chart to zoom.</span>
            <button type="button" className={playerStyles['icon-button-player']} onClick={zoom.handleZoomOut}
                disabled={!hasZoom} title="Zoom out to the full range" aria-label="Reset chart zoom">
                <img src="/magnifying-glass.png" alt="" aria-hidden="true" width="20" height="20"/>
            </button>
        <AppearancesSummaryHeader zoomedData={zoom.zoomedData} totals={totals}
            noEventFiltersSelected={false} selectedEvents={events}/>
        </div>
        <AppearancesMainChart zoomedData={zoom.zoomedData} barFills={fills} scatterData={scatter}
            sizing={sizing} yDomain={domain} refAreaLeft={zoom.refAreaLeft} refAreaRight={zoom.refAreaRight}
            showCleanSheets={false} onMouseDown={zoom.handleMouseDown} onMouseMove={zoom.handleMouseMove}
            onMouseUp={zoom.handleMouseUp} tooltip={tooltip}/>
        <div className={styles.resultKey} aria-label="Match result key">
            <span><span className={shared['square-title']} style={{backgroundColor: 'green'}}/>Win</span>
            <span><span className={shared['square-title']} style={{backgroundColor: 'yellow'}}/>Draw</span>
            <span><span className={shared['square-title']} style={{backgroundColor: 'red'}}/>Loss</span>
            {games.some(game => !game.qualifies) && <span><span className={shared['square-title']} style={{backgroundColor: '#cbd5e1'}}/>Other games</span>}
        </div>
    </div>;
}
