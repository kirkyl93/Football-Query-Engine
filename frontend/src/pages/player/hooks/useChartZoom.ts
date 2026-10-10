import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PlayerAppearance} from "../../../types/Player";

interface UseChartZoomResult {
    zoomedData: PlayerAppearance[];
    startGame: number | null;
    endGame: number | null;
    refAreaLeft: number | null;
    refAreaRight: number | null;
    chartRef: React.RefObject<HTMLDivElement | null>;
    handleMouseDown: (e: { activeLabel?: number }) => void;
    handleMouseMove: (e: { activeLabel?: number }) => void;
    handleMouseUp: () => void;
    handleZoomOut: () => void;
    handleZoom: (e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    stopScrolling: () => void;
    enableScrolling: () => void;
}

/** Minimum visible window, in games. Prevents zooming into a single dot. */
const MIN_ZOOM_WINDOW = 15;

/**
 * Drag-select + wheel/pinch zoom over filtered appearances. Resets to the
 * full range whenever the filtered data changes (same as the original,
 * which reset inside its derivation).
 *
 * Performance notes (250+ bars):
 * - Drag-move and wheel/pinch updates are coalesced with requestAnimationFrame
 *   so a burst of input events produces at most one state update per frame.
 * - Zoom bounds are quantized to integer game numbers, so sub-pixel wheel
 *   ticks that map to the same games don't churn memoised derivations.
 * - All handlers are useCallback-stable; only the zoomed window values change.
 */
export const useChartZoom = (filteredData: PlayerAppearance[]): UseChartZoomResult => {
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [startGame, setStartGame] = useState<number | null>(null);
    const [endGame, setEndGame] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [scrollbarWidth, setScrollbarWidth] = useState(0);
    const chartRef = useRef<HTMLDivElement | null>(null);

    // Mutable mirrors so rAF callbacks and stable handlers always see the
    // latest values without re-subscribing on every zoom tick.
    const isSelectingRef = useRef(false);
    const startRef = useRef<number | null>(null);
    const endRef = useRef<number | null>(null);
    const leftRef = useRef<number | null>(null);
    const rightRef = useRef<number | null>(null);
    isSelectingRef.current = isSelecting;
    startRef.current = startGame;
    endRef.current = endGame;
    leftRef.current = refAreaLeft;
    rightRef.current = refAreaRight;

    const rafMoveRef = useRef<number | null>(null);
    const rafZoomRef = useRef<number | null>(null);
    const pendingMoveRef = useRef<number | null>(null);
    const pendingZoomRef = useRef<{ direction: number; clientX: number } | null>(null);
    const lastTouchDistanceRef = useRef<number | null>(null);

    useEffect(() => {
        setStartGame(filteredData[0]?.game_number ?? null);
        setEndGame(filteredData[filteredData.length - 1]?.game_number ?? null);
    }, [filteredData]);

    // Cancel any queued frame work on unmount.
    useEffect(() => {
        const move = rafMoveRef.current;
        const zoom = rafZoomRef.current;
        return () => {
            if (move != null && typeof cancelAnimationFrame !== "undefined") {
                cancelAnimationFrame(move);
            }
            if (zoom != null && typeof cancelAnimationFrame !== "undefined") {
                cancelAnimationFrame(zoom);
            }
        };
    }, []);

    const zoomedData = useMemo(() => {
        if (!startGame || !endGame) {
            return filteredData;
        }

        const dataPointsInRange = filteredData.filter(
            (dataPoint) => dataPoint.game_number >= startGame && dataPoint.game_number <= endGame
        );

        // Ensure we have at least two data points for the chart to prevent rendering a single dot
        return dataPointsInRange.length > 1 ? dataPointsInRange : filteredData.slice(0, 2);
    }, [startGame, endGame, filteredData]);

    const scheduleFrame = (work: () => void): number | null => {
        if (typeof requestAnimationFrame === "undefined") {
            work();
            return null;
        }
        return requestAnimationFrame(work);
    };

    const handleMouseDown = useCallback((e: { activeLabel?: number }) => {
        const label = toGameNumber(e.activeLabel);
        if (label != null) {
            // A new drag supersedes any queued move update.
            pendingMoveRef.current = null;
            setRefAreaLeft(label);
            setIsSelecting(true);
            isSelectingRef.current = true;
        }
    }, []);

    const handleMouseMove = useCallback((e: { activeLabel?: number }) => {
        if (!isSelectingRef.current) {
            return;
        }
        const label = toGameNumber(e.activeLabel);
        if (label == null) {
            return;
        }
        pendingMoveRef.current = label;
        if (rafMoveRef.current != null) {
            return;
        }
        rafMoveRef.current = scheduleFrame(() => {
            rafMoveRef.current = null;
            const next = pendingMoveRef.current;
            pendingMoveRef.current = null;
            if (next != null && next !== rightRef.current) {
                setRefAreaRight(next);
            }
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        if (rafMoveRef.current != null && typeof cancelAnimationFrame !== "undefined") {
            cancelAnimationFrame(rafMoveRef.current);
            rafMoveRef.current = null;
        }
        pendingMoveRef.current = null;
        const left = leftRef.current;
        const right = rightRef.current;
        if (left != null && right != null) {
            const ordered = left <= right ? [left, right] : [right, left];
            if (ordered[0] !== startRef.current) {
                setStartGame(ordered[0]);
            }
            if (ordered[1] !== endRef.current) {
                setEndGame(ordered[1]);
            }
        }
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setIsSelecting(false);
        isSelectingRef.current = false;
    }, []);

    const handleZoomOut = useCallback(() => {
        if (!filteredData.length) {
            return;
        }
        setStartGame(filteredData[0].game_number);
        setEndGame(filteredData[filteredData.length - 1].game_number);
    }, [filteredData]);

    const stopScrolling = useCallback(() => {
        if (scrollbarWidth === 0) {
            const calculatedScrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.paddingRight = `${calculatedScrollBarWidth}px`;
            setScrollbarWidth(calculatedScrollBarWidth);
        } else {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.body.style.overflow = 'hidden';
    }, [scrollbarWidth]);

    const enableScrolling = useCallback(() => {
        if (chartRef.current)
            document.body.style.paddingRight = '';
        document.body.style.overflow = 'auto';
    }, []);

    const handleZoom = useCallback((e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!filteredData.length || !chartRef.current) return;

        const zoomFactor = 0.05;
        let direction = 0;
        let clientX = 0;

        if ('deltaY' in e) {
            // Mouse wheel event
            direction = e.deltaY < 0 ? 1 : -1;
            clientX = e.clientX;
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
            const last = lastTouchDistanceRef.current;
            if (last != null && currentDistance !== last) {
                direction = currentDistance > last ? 1 : -1;
            }
            lastTouchDistanceRef.current = currentDistance;

            clientX = (touch1.clientX + touch2.clientX) / 2;
        } else {
            // Single-finger touch scrolls the page; reset pinch tracking.
            lastTouchDistanceRef.current = null;
            return;
        }

        if (direction === 0) {
            return;
        }

        pendingZoomRef.current = {direction, clientX};
        if (rafZoomRef.current != null) {
            return;
        }
        rafZoomRef.current = scheduleFrame(() => {
            rafZoomRef.current = null;
            const pending = pendingZoomRef.current;
            pendingZoomRef.current = null;
            const node = chartRef.current;
            if (!pending || !node || !filteredData.length) {
                return;
            }

            const firstGame = filteredData[0].game_number;
            const lastGame = filteredData[filteredData.length - 1].game_number;
            const currentStartGame = startRef.current ?? firstGame;
            const currentEndGame = endRef.current ?? lastGame;
            const currentRange = currentEndGame - currentStartGame;
            if (currentRange <= 0) {
                return;
            }
            const zoomAmount = currentRange * zoomFactor * pending.direction;

            if (currentEndGame - currentStartGame <= MIN_ZOOM_WINDOW && zoomAmount > 0) {
                return;
            }

            const chartRect = node.getBoundingClientRect();
            const chartWidth = chartRect.width || 1;
            const mousePercentage = clamp((pending.clientX - chartRect.left) / chartWidth, 0, 1);

            const newStartGame = quantizeGame(currentStartGame + zoomAmount * mousePercentage, firstGame, lastGame);
            const newEndGame = quantizeGame(currentEndGame - zoomAmount * (1 - mousePercentage), firstGame, lastGame);

            if (newStartGame != null && newStartGame !== startRef.current) {
                setStartGame(newStartGame);
            }
            if (newEndGame != null && newEndGame !== endRef.current) {
                setEndGame(newEndGame);
            }
        });
    }, [filteredData]);

    return {
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
    };
};

/** Recharts labels arrive as floats; game numbers are integers. */
const toGameNumber = (value: number | undefined): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }
    return Math.round(value);
};

/** Snap a zoom bound to an integer game within the data range. */
const quantizeGame = (value: number, min: number, max: number): number | null => {
    if (!Number.isFinite(value)) {
        return null;
    }
    return clamp(Math.round(value), min, max);
};

const clamp = (value: number, min: number, max: number): number => {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
};
