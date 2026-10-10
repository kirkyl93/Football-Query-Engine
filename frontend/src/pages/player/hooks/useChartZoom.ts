import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PlayerAppearance} from "../../../types/Player";

interface UseChartZoomResult {
    zoomedData: PlayerAppearance[];
    startGame: number | null;
    endGame: number | null;
    refAreaLeft: number | null;
    refAreaRight: number | null;
    handleMouseDown: (e: { activeLabel?: number }) => void;
    handleMouseMove: (e: { activeLabel?: number }) => void;
    handleMouseUp: () => void;
    handleZoomOut: () => void;
}

/**
 * Drag-select zoom over filtered appearances. Resets to the full range
 * whenever the filtered data changes (same as the original, which reset
 * inside its derivation).
 *
 * Mouse-wheel / pinch zoom was removed deliberately: every wheel tick
 * committed a full SVG re-render of hundreds of bars plus markers, which
 * made scrolling over the chart janky even on mid-sized careers. The wheel
 * now scrolls the page natively (fast, compositor-driven) and zooming is
 * via drag-select plus the zoom-out button.
 *
 * Performance notes:
 * - Drag-move updates are coalesced with requestAnimationFrame so a burst
 *   of mousemove events produces at most one state update per frame.
 * - Zoom bounds are quantized to integer game numbers.
 * - All handlers are useCallback-stable; only the zoomed window values change.
 */
export const useChartZoom = (filteredData: PlayerAppearance[]): UseChartZoomResult => {
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [startGame, setStartGame] = useState<number | null>(null);
    const [endGame, setEndGame] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    // Mutable mirrors so rAF callbacks and stable handlers always see the
    // latest values without re-subscribing on every zoom change.
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
    const pendingMoveRef = useRef<number | null>(null);

    useEffect(() => {
        setStartGame(filteredData[0]?.game_number ?? null);
        setEndGame(filteredData[filteredData.length - 1]?.game_number ?? null);
    }, [filteredData]);

    // Cancel any queued frame work on unmount.
    useEffect(() => {
        const move = rafMoveRef.current;
        return () => {
            if (move != null && typeof cancelAnimationFrame !== "undefined") {
                cancelAnimationFrame(move);
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

    return {
        zoomedData,
        startGame,
        endGame,
        refAreaLeft,
        refAreaRight,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleZoomOut,
    };
};

/** Recharts labels arrive as floats; game numbers are integers. */
const toGameNumber = (value: number | undefined): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }
    return Math.round(value);
};
