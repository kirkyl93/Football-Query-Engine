import React, {useEffect, useMemo, useRef, useState} from "react";
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

/**
 * Drag-select + wheel/pinch zoom over filtered appearances. Resets to the
 * full range whenever the filtered data changes (same as the original,
 * which reset inside its derivation).
 */
export const useChartZoom = (filteredData: PlayerAppearance[]): UseChartZoomResult => {
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [startGame, setStartGame] = useState<number | null>(null);
    const [endGame, setEndGame] = useState<number | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [scrollbarWidth, setScrollbarWidth] = useState(0);
    const chartRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setStartGame(filteredData[0]?.game_number);
        setEndGame(filteredData[filteredData.length - 1]?.game_number);
    }, [filteredData]);

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

    const handleMouseDown = (e: { activeLabel?: number }) => {
        if (e.activeLabel) {
            setRefAreaLeft(e.activeLabel);
            setIsSelecting(true);
        }
    };

    const handleMouseMove = (e: { activeLabel?: number }) => {
        if (isSelecting && e.activeLabel) {
            setRefAreaRight(e.activeLabel);
        }
    };

    const handleMouseUp = () => {
        if (refAreaLeft && refAreaRight) {
            const [left, right] = [refAreaLeft, refAreaRight].sort((a, b) => a - b);
            setStartGame(left);
            setEndGame(right);
        }
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setIsSelecting(false);
    };

    const handleZoomOut = () => {
        setStartGame(filteredData[0].game_number);
        setEndGame(filteredData[filteredData.length - 1].game_number);
    };

    const stopScrolling = () => {
        if (scrollbarWidth === 0) {
            const calculatedScrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.paddingRight = `${calculatedScrollBarWidth}px`;
            setScrollbarWidth(calculatedScrollBarWidth);
        } else {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.body.style.overflow = 'hidden';
    }

    const enableScrolling = () => {
        if (chartRef.current)
            document.body.style.paddingRight = '';
        document.body.style.overflow = 'auto';
    }

    const handleZoom = (e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!filteredData.length || !chartRef.current) return;

        let zoomFactor = 0.05;
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

            if ((e as unknown as { lastTouchDistance?: number }).lastTouchDistance) {
                direction = currentDistance > (e as unknown as { lastTouchDistance: number }).lastTouchDistance ? 1 : -1;
            }
            (e as unknown as { lastTouchDistance: number }).lastTouchDistance = currentDistance;

            clientX = (touch1.clientX + touch2.clientX) / 2;
        } else {
            return;
        }

        const currentRange = (endGame || filteredData[filteredData.length - 1].game_number) - (startGame || filteredData[0].game_number);
        const zoomAmount = currentRange * zoomFactor * direction;

        const chartRect = chartRef.current.getBoundingClientRect();
        const mouseX = clientX - chartRect.left;
        const chartWidth = chartRect.width;
        const mousePercentage = mouseX / chartWidth;

        const currentStartGame = startGame || filteredData[0].game_number;
        const currentEndGame = endGame || filteredData[filteredData.length - 1].game_number;

        if (currentEndGame - currentStartGame <= 15 && zoomAmount > 0) {
            return;
        }

        const newStartGame = currentStartGame + zoomAmount * mousePercentage;
        const newEndGame = currentEndGame - zoomAmount * (1 - mousePercentage);

        setStartGame(newStartGame);
        setEndGame(newEndGame);
    };

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
