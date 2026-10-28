import {useMemo} from "react";
import {
    PlayerAppearance,
    PlayerFilterState,
    PlayerSeasonsCompetitionsAndClubs,
    PlayerTotals,
} from "../../../types/Player";
import {useAppearancesFilter} from "./useAppearancesFilter";
import {useChartZoom} from "./useChartZoom";
import {areNoEventsSelected, mapAppearanceEvents, ScatterEvent} from "../lib/appearancesEventMapper";
import {calculateYDomain, ChartSizing, useChartSizing} from "../lib/chartSizing";
import {calculateAppearancesTotals} from "../lib/appearancesTotals";
import {resolveBarFills} from "../lib/barFillColours";

/**
 * Delay before a settled zoom window propagates to the page-level stats and
 * sibling charts. The canvas chart itself paints straight from its own
 * state; only the expensive fan-out (streak + stats recalculation) waits,
 * so bursts — the mount cascade, or a filter apply landing right behind a
 * zoom reset — commit once instead of recomputing mid-cascade.
 */
export const ZOOM_CHANGE_DEBOUNCE_MS = 150;

export interface AppearanceView {
    dateOfBirth?: string;
    filteredData: PlayerAppearance[];
    playerFilterState: PlayerFilterState;
    setPlayerFilterState: (state: PlayerFilterState) => void;
    metadata: PlayerSeasonsCompetitionsAndClubs;
    zoomedData: PlayerAppearance[];
    startGame: number | null;
    endGame: number | null;
    refAreaLeft: number | null;
    refAreaRight: number | null;
    handleMouseDown: (e: { activeLabel?: number }) => void;
    handleMouseMove: (e: { activeLabel?: number }) => void;
    handleMouseUp: () => void;
    handleZoomOut: () => void;
    scatterData: ScatterEvent[];
    sizing: ChartSizing;
    yDomain: number[];
    totals: PlayerTotals;
    barFills: string[];
    barFillsByGame: Map<number, string>;
    filteredByGame: Map<number, PlayerAppearance>;
    showCleanSheets: boolean;
    noEventFiltersSelected: boolean;
    /**
     * True while a drag-zoom window narrows the filtered range. Drives the
     * "(zoom filter applied)" title suffix — plain filtering is already
     * visible in the title itself.
     */
    hasZoomFilter: boolean;
}

/**
 * Single source of truth for one player's appearances: filter state, zoom
 * window and every derivation the chart renders from. Shared by the tile
 * preview and the section-modal instances so filtering in one place
 * updates every chart.
 */
export const useAppearanceView = (initialData: PlayerAppearance[] | undefined, dateOfBirth?: string): AppearanceView => {
    const {filteredData, playerFilterState, setPlayerFilterState, metadata} = useAppearancesFilter(initialData, dateOfBirth);
    const {
        zoomedData,
        startGame,
        endGame,
        refAreaLeft,
        refAreaRight,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoomOut,
    } = useChartZoom(filteredData);

    const noEventFiltersSelected = useMemo(
        () => areNoEventsSelected(playerFilterState.selectedEvents),
        [playerFilterState],
    );

    const scatterData = useMemo(
        () => mapAppearanceEvents(zoomedData, playerFilterState.selectedEvents, noEventFiltersSelected),
        [zoomedData, playerFilterState.selectedEvents, noEventFiltersSelected],
    );

    const sizing = useChartSizing(zoomedData.length);

    const yDomain = useMemo(
        () => calculateYDomain(zoomedData),
        [zoomedData],
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

    const hasZoomFilter = useMemo(() => {
        if (startGame == null || endGame == null || filteredData.length === 0) {
            return false;
        }
        return startGame !== filteredData[0].game_number
            || endGame !== filteredData[filteredData.length - 1].game_number;
    }, [startGame, endGame, filteredData]);

    return {
        dateOfBirth,
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
    };
};
