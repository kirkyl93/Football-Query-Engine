import {PlayerAppearance} from "../../../../types/Player";
import {ChartSizing} from "../../lib/chartSizing";
import {ScatterEvent} from "../../lib/appearancesEventMapper";
import {getClubPrimary} from "../../../../lib/ClubDirectory";
import {getBarOutlineColour} from "../../lib/barOutlineColour";
import {BAR_STROKE_CUTOFF} from "./appearancesCanvasGeometry";
import {
    CANVAS_X_TICK_DY,
    CANVAS_X_TITLE_DY,
    CANVAS_Y_TITLE_DX,
    PlotFrame,
    barCenterX,
    barFillAndStrokeAlpha,
    barWidthForSlot,
    gameTicks,
    isCleanSheet,
    minuteTicks,
    plotFrameForSize,
    slotWidthForCount,
    squareMarkerSize,
    yForMinute,
} from "./appearancesCanvasGeometry";

export interface AppearancesDrawModel {
    zoomedData: PlayerAppearance[];
    barFills: string[];
    scatterData: ScatterEvent[];
    sizing: ChartSizing;
    yDomain: number[];
    refAreaLeft: number | null;
    refAreaRight: number | null;
    showCleanSheets: boolean;
}

const TICK_FILL = "#666666";
const TITLE_FILL = "#808080";
const TICK_FONT = "12px Inter, sans-serif";
const TITLE_FONT = "14px Inter, sans-serif";
const CANVAS_STROKE_BOOST = 0.5;

/**
 * Renders the appearances chart into a 2D context in CSS pixels (the caller
 * applies the devicePixelRatio transform). Range bars per game, event markers,
 * clean-sheet opacity boost, drag-select reference area.
 * Deliberately dependency-free.
 */
export const drawAppearancesChart = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    model: AppearancesDrawModel,
): void => {
    const {zoomedData, barFills, scatterData, sizing, yDomain, showCleanSheets} = model;
    const frame = plotFrameForSize(width, height);
    const count = zoomedData.length;

    ctx.clearRect(0, 0, width, height);
    drawAxes(ctx, frame, zoomedData, yDomain);
    if (count === 0) {
        return;
    }

    const slot = slotWidthForCount(frame.plotWidth, count);
    // Never wider than the slot: fixed bar widths would overlap once the
    // screen shrinks below one bar per slot.
    const barWidth = barWidthForSlot(sizing.barChartWidth, slot);
    const gameIndexByGame = new Map<number, number>();
    zoomedData.forEach((appearance, index) => {
        if (!gameIndexByGame.has(appearance.game_number)) {
            gameIndexByGame.set(appearance.game_number, index);
        }
    });

    // Bars.
    for (let index = 0; index < count; index++) {
        const entry = zoomedData[index];
        const [startMinute, endMinute] = entry.minutes_played;
        const top = yForMinute(endMinute, yDomain, frame);
        const bottom = yForMinute(startMinute, yDomain, frame);
        const barHeight = bottom - top;
        if (!(barHeight > 0)) {
            continue;
        }
        const cx = barCenterX(index, frame, count);
        const x = cx - barWidth / 2;
        const alphas = barFillAndStrokeAlpha(sizing.barChartOpacity, isCleanSheet(entry, showCleanSheets));
        ctx.globalAlpha = alphas.fill;
        ctx.fillStyle = barFills[index] ?? getClubPrimary(entry.club_id);
        ctx.fillRect(x, top, barWidth, barHeight);
        if (sizing.strokeWidth >= BAR_STROKE_CUTOFF) {
            // Same alpha with or without a clean sheet: only the body
            // carries the clean-sheet boost, never the border.
            ctx.globalAlpha = alphas.stroke;
            ctx.lineWidth = sizing.strokeWidth + CANVAS_STROKE_BOOST;
            ctx.strokeStyle = getBarOutlineColour(entry);
            ctx.strokeRect(x, top, barWidth, barHeight);
        }
    }
    ctx.globalAlpha = 1;

    // Event markers.
    for (const event of scatterData) {
        const index = gameIndexByGame.get(event.game_number);
        if (index === undefined) {
            continue;
        }
        const cx = barCenterX(index, frame, count);
        const cy = yForMinute(event.minute, yDomain, frame);
        if (event.shape === "rectangle") {
            const side = squareMarkerSize(sizing.rectangleWidth, barWidth);
            ctx.fillStyle = event.color;
            ctx.fillRect(cx - side / 2, cy - side / 2, side, side);
            if (sizing.strokeWidth >= BAR_STROKE_CUTOFF) {
                ctx.lineWidth = sizing.strokeWidth + CANVAS_STROKE_BOOST;
                ctx.strokeStyle = "black";
                ctx.strokeRect(cx - side / 2, cy - side / 2, side, side);
            }
        } else {
            ctx.fillStyle = event.color;
            ctx.beginPath();
            ctx.arc(cx, cy, sizing.scatterDotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Drag-select reference area.
    const {refAreaLeft, refAreaRight} = model;
    if (refAreaLeft != null && refAreaRight != null) {
        const leftIndex = gameIndexByGame.get(Math.min(refAreaLeft, refAreaRight));
        const rightIndex = gameIndexByGame.get(Math.max(refAreaLeft, refAreaRight));
        if (leftIndex !== undefined && rightIndex !== undefined) {
            const x1 = barCenterX(leftIndex, frame, count) - slot / 2;
            const x2 = barCenterX(rightIndex, frame, count) + slot / 2;
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.fillRect(x1, frame.plotTop, x2 - x1, frame.plotHeight);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.strokeRect(x1, frame.plotTop, x2 - x1, frame.plotHeight);
        }
    }
};

const drawAxes = (
    ctx: CanvasRenderingContext2D,
    frame: PlotFrame,
    zoomedData: PlayerAppearance[],
    yDomain: number[],
): void => {
    ctx.textBaseline = "middle";

    // Minute ticks (labels only, like the SVG chart).
    const yMax = yDomain[1] ?? 90;
    ctx.font = TICK_FONT;
    ctx.fillStyle = TICK_FILL;
    ctx.textAlign = "right";
    for (const tick of minuteTicks(yMax)) {
        if (tick <= 0) {
            continue;
        }
        ctx.fillText(String(tick), frame.plotLeft - 10, yForMinute(tick, yDomain, frame));
    }
    // Minute title, rotated.
    ctx.save();
    ctx.translate(frame.plotLeft - CANVAS_Y_TITLE_DX, frame.plotTop + frame.plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = TITLE_FONT;
    ctx.fillStyle = TITLE_FILL;
    ctx.textAlign = "center";
    ctx.fillText("Minute", 0, 0);
    ctx.restore();

    // Game-number ticks (only for games present in the window).
    if (zoomedData.length > 0) {
        const firstGame = zoomedData[0].game_number;
        const lastGame = zoomedData[zoomedData.length - 1].game_number;
        const indexByGame = new Map(zoomedData.map((a, index) => [a.game_number, index]));
        ctx.font = TICK_FONT;
        ctx.fillStyle = TICK_FILL;
        ctx.textAlign = "center";
        for (const tick of gameTicks(firstGame, lastGame)) {
            const index = indexByGame.get(tick);
            if (index === undefined) {
                continue;
            }
            ctx.fillText(
                String(tick),
                barCenterX(index, frame, zoomedData.length),
                frame.plotTop + frame.plotHeight + CANVAS_X_TICK_DY,
            );
        }
    }
    // Game-number title.
    ctx.font = TITLE_FONT;
    ctx.fillStyle = TITLE_FILL;
    ctx.textAlign = "center";
    ctx.fillText("Game Number", frame.plotLeft + frame.plotWidth / 2, frame.plotTop + frame.plotHeight + CANVAS_X_TITLE_DY);
};
