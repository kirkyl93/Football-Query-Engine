import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import AppearancesChartTitle from "./AppearancesChartTitle";
import AppearancesChartFilterBar from "./AppearancesChartFilterBar";
import ExpandIcon from "../../../components/ExpandIcon";
import styles from '../Player.module.css';
import shared from "../../../styles/shared.module.css";
import {PlayerAppearance} from "../../../types/Player";
import {AppearanceView, useAppearanceView, ZOOM_CHANGE_DEBOUNCE_MS} from "../hooks/useAppearanceView";
import AppearancesTooltip from "./appearances/AppearancesTooltip";
import AppearancesSummaryHeader from "./appearances/AppearancesSummaryHeader";
import AppearancesMainChart from "./appearances/AppearancesMainChart";

type AppearancesChartProps = {
    playerName: string;
    data?: PlayerAppearance[];
    dateOfBirth?: string;
    onZoomChange: (zoomedData: PlayerAppearance[]) => void;
    /**
     * Compact tile preview: title + live canvas (real tooltip and zoom,
     * shared view) with zoom and filter controls but no summary totals.
     * Sized to match the streak tile stack so the top-row cards measure
     * the same.
     */
    compact?: boolean;

};

export function AppearancesChart({playerName: name, data: initialData, dateOfBirth, onZoomChange: onZoomChange, compact = false}: AppearancesChartProps) {
    const view = useAppearanceView(initialData, dateOfBirth);

    // Debounced fan-out: chart + summary header render from zoomedData
    // immediately; parent stats wait for the gesture to settle.
    useEffect(() => {
        if (!onZoomChange) {
            return;
        }
        const timer = setTimeout(() => onZoomChange(view.zoomedData), ZOOM_CHANGE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [view.zoomedData, onZoomChange]);

    return <AppearancesChartView playerName={name} view={view} compact={compact} />;
}

type AppearancesChartViewProps = {
    playerName: string;
    view: AppearanceView;
    compact?: boolean;
    /** Renders an expand button in the header for fullscreen single-chart views. */
    onExpand?: () => void;
    /** Accessible label for the expand button. */
    expandLabel?: string;
};

/**
 * Controlled appearances chart: all data behaviour comes from a shared
 * {@link AppearanceView}, so the tile preview and the modal instances
 * render the same filtered/zoomed window. Filtering in one place updates
 * every chart.
 */
export function AppearancesChartView({playerName: name, view, compact = false, onExpand, expandLabel = "Expand chart"}: AppearancesChartViewProps) {
    const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const {
        filteredData,
        playerFilterState,
        setPlayerFilterState,
        metadata,
        zoomedData,
        startGame,
        endGame,
        refAreaLeft,
        refAreaRight,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoomOut,
        scatterData,
        sizing,
        yDomain,
        totals,
        barFills,
        barFillsByGame,
        filteredByGame,
        showCleanSheets,
        noEventFiltersSelected,
        hasZoomFilter,
    } = view;

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
        <div ref={chartRef} className={styles['chart-container']}>
            <div className={shared['header-container']}>
                <AppearancesChartTitle
                    playerName={name}
                    filterState={playerFilterState}
                    hasZoomFilter={hasZoomFilter}
                />
                <div className={styles['button-container']}>
                    <button
                        onClick={handleZoomOut}
                        disabled={!startGame && !endGame}
                        className={styles['icon-button-player']}
                        title="Zoom out to the full range"
                        aria-label="Zoom out"
                    >
                        <img
                            src={'/magnifying-glass.png'}
                            alt=""
                            aria-hidden="true"
                            style={{width: '20px', height: '20px'}}
                        />
                    </button>
                    <button onClick={toggleDrawer} className={styles['filter-button-player']}>
                        Filter
                    </button>
                    {onExpand && (
                        <button
                            onClick={onExpand}
                            aria-label={expandLabel}
                            title={expandLabel}
                            className={styles['icon-button-player']}
                        >
                            <ExpandIcon size={18} />
                        </button>
                    )}
                </div>
            </div>
            {!compact && (
                <AppearancesSummaryHeader
                    zoomedData={zoomedData}
                    totals={totals}
                    noEventFiltersSelected={noEventFiltersSelected}
                    selectedEvents={playerFilterState.selectedEvents}
                />
            )}
            <div ref={drawerRef}>
                <AppearancesChartFilterBar
                    isOpen={isPlayerDrawerOpen}
                    ageFilterAvailable={Boolean(view.dateOfBirth)}
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
                showCleanSheets={showCleanSheets}
                tooltip={tooltip}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                height={compact ? 280 : undefined}
                tooltipBoundaryRef={compact ? chartRef : undefined}
            />
        </div>
    );
}
