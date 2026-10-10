import React, {useEffect, useMemo, useRef, useState} from "react";
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

type AppearancesChartProps = {
    playerName: string;
    data?: PlayerAppearance[];
    onZoomChange: (zoomedData: PlayerAppearance[]) => void;

};

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

    useEffect(() => {
        if (onZoomChange) {
            onZoomChange(zoomedData);
        }
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

    const toggleDrawer = () => {
        setIsPlayerDrawerOpen(!isPlayerDrawerOpen);
    }

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
                    onClose={toggleDrawer}
                />
            </div>
            <AppearancesMainChart
                zoomedData={zoomedData}
                scatterData={scatterData}
                sizing={sizing}
                yDomain={yDomain}
                refAreaLeft={refAreaLeft}
                refAreaRight={refAreaRight}
                chartRef={chartRef}
                showCleanSheets={noEventFiltersSelected || playerFilterState.selectedEvents.CleanSheets}
                tooltip={<AppearancesTooltip filteredData={filteredData}/>}
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
