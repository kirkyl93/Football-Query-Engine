import {PlayerAppearance} from "../../../../types/Player";

export const CANVAS_MARGIN = {top: 20, right: 20, left: 20, bottom: 40};
/** Width reserved for the minute-axis tick labels. */
export const CANVAS_Y_AXIS_WIDTH = 44;

export const CANVAS_HEIGHT = 360;
/**
 * Strokes thinner than this are invisible but still cost paint time across
 * hundreds of bars, so they are omitted.
 */
export const BAR_STROKE_CUTOFF = 0.4;

export const CANVAS_X_AXIS_HEIGHT = 59;
/** X tick label centres sit this far below the plot bottom (measured). */
export const CANVAS_X_TICK_DY = 49;
/** X axis title centre sits this far below the plot bottom (measured). */
export const CANVAS_X_TITLE_DY = 71;
/**
 * Minute axis title centre sits this far left of the plot edge, leaving a
 * readable gap to the tick labels (two- and three-digit minutes alike).
 */
export const CANVAS_Y_TITLE_DX = 40;

export interface PlotFrame {
    plotLeft: number;
    plotTop: number;
    plotWidth: number;
    plotHeight: number;
}

/** Plot area inside a container of the given CSS-pixel size. */
export const plotFrameForSize = (width: number, height: number): PlotFrame => {
    const plotTop = CANVAS_MARGIN.top;
    const plotBottom = height - CANVAS_MARGIN.bottom - CANVAS_X_AXIS_HEIGHT;
    return {
        plotLeft: CANVAS_MARGIN.left + CANVAS_Y_AXIS_WIDTH,
        plotTop,
        plotWidth: Math.max(0, width - CANVAS_MARGIN.left - CANVAS_Y_AXIS_WIDTH - CANVAS_MARGIN.right),
        plotHeight: Math.max(0, plotBottom - plotTop),
    };
};

export const slotWidthForCount = (plotWidth: number, dataLength: number): number =>
    dataLength <= 0 ? 0 : plotWidth / dataLength;

/** Horizontal centre of the i-th bar (0-based) in CSS pixels. */
export const barCenterX = (index: number, frame: PlotFrame, dataLength: number): number =>
    frame.plotLeft + (index + 0.5) * slotWidthForCount(frame.plotWidth, dataLength);

/**
 * Rendered bar width: the sized width, capped at the slot so bars never
 * overlap each other once the screen shrinks below one bar per slot.
 */
export const barWidthForSlot = (sizedWidth: number, slotWidth: number): number =>
    Math.max(0, Math.min(sizedWidth, slotWidth));

/**
 * Minimum event-marker size, so dense charts keep visible markers instead
 * of shrinking them away entirely.
 */
export const MIN_MARKER_SIZE = 5;

export const squareMarkerSize = (sizedWidth: number, barWidth: number): number =>
    Math.max(MIN_MARKER_SIZE, Math.min(sizedWidth, barWidth));

/** Opacity boost the clean-sheet cue adds to the bar body (never the border). */
export const CLEAN_SHEET_OPACITY_BOOST = 0.35;

/**
 * Bar alphas: the fill carries the clean-sheet boost only for clean sheets,
 * while every border gets the boost uniformly — so borders stay identical
 * across games but render more prominently than the base fill opacity.
 */
export const barFillAndStrokeAlpha = (baseOpacity: number, cleanSheet: boolean): {
    fill: number;
    stroke: number;
} => ({
    fill: clampOpacity(baseOpacity + (cleanSheet ? CLEAN_SHEET_OPACITY_BOOST : 0)),
    stroke: clampOpacity(baseOpacity + CLEAN_SHEET_OPACITY_BOOST),
});

/** Vertical pixel for a minute value on the given y-domain. */
export const yForMinute = (
    minute: number,
    yDomain: number[],
    frame: PlotFrame,
): number => {
    const low = yDomain[0] ?? 0;
    const high = yDomain[1] ?? 90;
    if (!(high > low)) {
        return frame.plotTop + frame.plotHeight;
    }
    const t = (minute - low) / (high - low);
    return frame.plotTop + frame.plotHeight * (1 - t);
};

/**
 * Index of the game under horizontal pixel x, clamped into range.
 * Returns -1 when there is no data.
 */
export const gameIndexAtX = (x: number, frame: PlotFrame, dataLength: number): number => {
    if (dataLength <= 0) {
        return -1;
    }
    const slot = slotWidthForCount(frame.plotWidth, dataLength);
    if (!(slot > 0)) {
        return -1;
    }
    const raw = Math.floor((x - frame.plotLeft) / slot);
    return Math.max(0, Math.min(dataLength - 1, raw));
};

export const isCleanSheet = (entry: PlayerAppearance, showCleanSheets: boolean): boolean => {
    if (!showCleanSheets) {
        return false;
    }
    return entry.club_id === entry.home_club_id
        ? entry.away_club_goals === 0
        : entry.home_club_goals === 0;
};

/** ~10 evenly spaced integer game numbers spanning the visible window. */
export const gameTicks = (firstGame: number, lastGame: number, maxTicks = 10): number[] => {
    if (!Number.isFinite(firstGame) || !Number.isFinite(lastGame) || lastGame < firstGame) {
        return [];
    }
    const span = lastGame - firstGame + 1;
    const step = Math.max(1, Math.ceil(span / maxTicks));
    const ticks: number[] = [];
    for (let game = firstGame; game <= lastGame; game += step) {
        ticks.push(game);
    }
    if (ticks[ticks.length - 1] !== lastGame) {
        ticks.push(lastGame);
    }
    return ticks;
};

/** Evenly spaced minute ticks from 0 to yMax (inclusive). */
export const minuteTicks = (yMax: number, count = 9): number[] => {
    if (!Number.isFinite(yMax) || yMax <= 0 || count < 2) {
        return [0];
    }
    const rawStep = yMax / (count - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
    const step = nice * magnitude;
    const ticks: number[] = [];
    for (let value = 0; value <= yMax + 1e-9; value += step) {
        ticks.push(Math.round(value * 100) / 100);
    }
    return ticks;
};

/** Canvas globalAlpha must stay within [0, 1] (out-of-range values are ignored). */
export const clampOpacity = (opacity: number): number => {
    if (!Number.isFinite(opacity)) {
        return 1;
    }
    return Math.max(0, Math.min(1, opacity));
};
