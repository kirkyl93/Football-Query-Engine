import {useMemo} from "react";
import type {PlayerAppearance} from "../../../types/Player";

const MIN_LENGTH = 20;
const MAX_LENGTH = 600;

/** Cubic down-scaling of a chart dimension as the game count grows. */
export const calculateSize = (dataLength: number, minValue: number, maxValue: number): number => {
    if (dataLength <= MIN_LENGTH) {
        return maxValue;
    }

    if (dataLength >= MAX_LENGTH) {
        return minValue;
    }

    const normalizedLength = (dataLength - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);

    const scale = Math.pow(1 - normalizedLength, 3);

    return minValue + scale * (maxValue - minValue);
};

/** Cubic up-scaling of bar opacity as the game count grows. */
export const calculateBarChartOpacity = (dataLength: number, minValue: number, maxValue: number): number => {
    if (dataLength <= MIN_LENGTH) {
        return minValue;
    }

    if (dataLength >= MAX_LENGTH) {
        return maxValue;
    }

    const normalizedLength = (dataLength - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
    const scale = Math.pow(normalizedLength, 3);

    return minValue + scale * (maxValue - minValue);
};

export interface ChartSizing {
    barChartWidth: number;
    strokeWidth: number;
    scatterDotRadius: number;
    rectangleWidth: number;
    rectangleHeight: number;
    barChartOpacity: number;
}

/**
 * Keep a 90-minute baseline and extend to the actual playing intervals,
 * regardless of competition. Empty and short windows retain a stable axis.
 */
export const calculateYDomain = (zoomedData: PlayerAppearance[]): number[] => {
    // Single pass without an intermediate array or spread call, so large
    // zoom windows don't allocate on every recompute.
    let maxMinutes = 90;
    for (let i = 0; i < zoomedData.length; i++) {
        const end = zoomedData[i].minutes_played[1];
        if (end > maxMinutes) {
            maxMinutes = end;
        }
    }
    return [0, maxMinutes];
};

/** All zoom-dependent chart dimensions, recomputed when the data changes. */
export const useChartSizing = (dataLength: number): ChartSizing => {
    return useMemo(() => ({
        barChartWidth: calculateSize(dataLength, 0.7, 20),
        strokeWidth: calculateSize(dataLength, 0.002, 1.6),
        scatterDotRadius: calculateSize(dataLength, 2.5, 8),
        rectangleWidth: calculateSize(dataLength, 3.5, 11),
        rectangleHeight: calculateSize(dataLength, 5, 13),
        barChartOpacity: calculateBarChartOpacity(dataLength, 0.25, 3),
    }), [dataLength]);
};
