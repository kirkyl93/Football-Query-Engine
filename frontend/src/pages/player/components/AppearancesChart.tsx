import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import AppearancesChartTitle from "./AppearancesChartTitle";
import AppearancesChartFilterBar from "./AppearancesChartFilterBar";
import styles from '../Player.module.css';
import shared from "../../../styles/shared.module.css";
import {PlayerAppearance} from "../../../types/Player";
import {useAppearancesFilter} from "../hooks/useAppearancesFilter";
import {useChartZoom} from "../hooks/useChartZoom";
import {areNoEventsSelected, mapAppearanceEvents} from "../lib/appearancesEventMapper";
import {useChartSizing} from "../lib/chartSizing";
import {calculateAppearancesTotals} from "../lib/appearancesTotals";
import {calculateYDomain} from "../lib/chartSizing";
import AppearancesTooltip from "./appearances/AppearancesTooltip";
import AppearancesSummaryHeader from "./appearances/AppearancesSummaryHeader";
import AppearancesMainChart from "./appearances/AppearancesMainChart";
import {resolveBarFills} from "../lib/barFillColours";

type AppearancesChartProps = {
    playerName: string;
    data?: PlayerAppearance[];
    onZoomChange: (zoomedData: PlayerAppearance[]) => void;

};

/**
 * Delay before a settled zoom window propagates to the page-level stats and
 * sibling charts. The chart itself stays live every frame; only the
 * expensive fan-out (streak + stats recalculation across PlayerChartsGrid)
 * waits for the gesture to settle. Without this, each wheel tick at 250+
 * bars recomputes all stats and re-renders every small chart at 60Hz.
 */
export const ZOOM_CHANGE_DEBOUNCE_MS = 150;

export function AppearancesChart({playerName: name, data: initialData, onZoomChange: onZoomChange}: AppearancesChartProps) {
    const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    const {filteredData, playerFilterState, setPlayerFilterState, metadata} = useAppearancesFilter(initialData);
    const {
        zoomedData,
        startGame,
        endGame,
        refAreaLeft,
        refAreaRight,
        chartRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoomOut,
        handleZoom,
        stopScrolling,
        enableScrolling,
    } = useChartZoom(filteredData);

    const noEventFiltersSelected = useMemo(
        () => areNoEventsSelected(playerFilterState.selectedEvents),
        [playerFilterState],
    );

    // Debounced fan-out: chart + summary header render from zoomedData
    // immediately; parent stats wait for the gesture to settle.
    useEffect(() => {
        if (!onZoomChange) {
            return;
        }
        const timer = setTimeout(() => onZoomChange(zoomedData), ZOOM_CHANGE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [zoomedData, onZoomChange]);

    const scatterData = useMemo(
        () => mapAppearanceEvents(zoomedData, playerFilterState.selectedEvents, noEventFiltersSelected),
        [zoomedData, playerFilterState.selectedEvents, noEventFiltersSelected],
    );

    const sizing = useChartSizing(zoomedData.length);

    const yDomain = useMemo(
        () => calculateYDomain(zoomedData, metadata.europeanCompetitions.length > 0),
        [zoomedData, metadata.europeanCompetitions.length],
    );

    const totals = useMemo(() => calculateAppearancesTotals(zoomedData), [zoomedData]);

    const barFills = useMemo(() => resolveBarFills(zoomedData), [zoomedData]);
    const barFillsByGame = useMemo(
        () => new Map(zoomedData.map((appearance, index) => [appearance.game_number, barFills[index]])),
        [zoomedData, barFills],
    );
    const filteredByGame = useMemo(
        () => new Map(filteredData.map((appearance) => [appearance.game_number, appearance])),
        [filteredData],
    );
    const showCleanSheets = noEventFiltersSelected || playerFilterState.selectedEvents.CleanSheets;

    // Stable tooltip element: without memo the parent builds a fresh element
    // (and Map) identity every commit, defeating AppearancesMainChart memo.
    const tooltip = useMemo(
        () => <AppearancesTooltip filteredData={filteredData} filteredByGame={filteredByGame} barFillsByGame={barFillsByGame}/>,
        [filteredData, filteredByGame, barFillsByGame],
    );

    const toggleDrawer = useCallback(() => {
        setIsPlayerDrawerOpen((open) => !open);
    }, []);

    const closeDrawer = useCallback(() => {
        setIsPlayerDrawerOpen(false);
    }, []);

    useEffect(() => {
        if (!isPlayerDrawerOpen) {
            return;
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsPlayerDrawerOpen(false);
            }
        };
        const handleEscPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsPlayerDrawerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscPress);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscPress);
        };
    }, [isPlayerDrawerOpen]);

    return (
        <div className={styles['chart-container']}>
            <div className={shared['header-container']}>
                <AppearancesChartTitle
                    playerName={name}
                    filterState={playerFilterState}
                />
                <div className={styles['button-container']}>
                    <button onClick={handleZoomOut} disabled={!startGame && !endGame} className={styles['filter-button-player']}>
                        <img
                            src={'/magnifying-glass.png'}
                            alt={`Zoom out`}
                            style={{width: '20px', height: '20px'}}
                        />
                    </button>
                    <button onClick={toggleDrawer} className={styles['filter-button-player']}>
                        Filter
                    </button>
                </div>
            </div>
            <AppearancesSummaryHeader
                zoomedData={zoomedData}
                totals={totals}
                noEventFiltersSelected={noEventFiltersSelected}
                selectedEvents={playerFilterState.selectedEvents}
            />
            <div ref={drawerRef}>
                <AppearancesChartFilterBar
                    isOpen={isPlayerDrawerOpen}
                    playerFilterState={playerFilterState}
                    playerSeasonsCompetitionsAndClubs={metadata}
                    onFilterChange={setPlayerFilterState}
                    onClose={closeDrawer}
                />
            </div>
            <AppearancesMainChart
                zoomedData={zoomedData}
                barFills={barFills}
                scatterData={scatterData}
                sizing={sizing}
                yDomain={yDomain}
                refAreaLeft={refAreaLeft}
                refAreaRight={refAreaRight}
                chartRef={chartRef}
                showCleanSheets={showCleanSheets}
                tooltip={tooltip}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onZoom={handleZoom}
                onEnter={stopScrolling}
                onLeave={enableScrolling}
            />
        </div>
    );
}
