import React from "react";
import {BAR_STROKE_CUTOFF} from "./appearanceBarShape";

interface ScatterGlyphProps {
    cx?: number;
    cy?: number;
    payload?: { shape?: string; color?: string };
    rectangleWidth: number;
    rectangleHeight: number;
    scatterDotRadius: number;
    strokeWidth: number;
}

/**
 * Event marker for the appearances scatter overlay. Plain SVG elements (no
 * Recharts wrapper) and no per-marker stroke once it becomes sub-pixel.
 * Memoised so re-renders of the parent chart don't re-render unchanged
 * markers through a fresh inline closure.
 */
export const ScatterGlyph: React.FC<ScatterGlyphProps> = React.memo(({
    cx,
    cy,
    payload,
    rectangleWidth,
    rectangleHeight,
    scatterDotRadius,
    strokeWidth,
}) => {
    if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) {
        return null;
    }

    if (payload?.shape === "rectangle") {
        const showStroke = strokeWidth >= BAR_STROKE_CUTOFF;
        return (
            <rect
                x={cx - rectangleWidth / 2}
                y={cy - rectangleHeight / 2}
                width={rectangleWidth}
                height={rectangleHeight}
                stroke={showStroke ? "black" : "none"}
                strokeWidth={showStroke ? strokeWidth : 0}
                fill={payload.color}
            />
        );
    }

    return <circle cx={cx} cy={cy} r={scatterDotRadius} fill={payload?.color} />;
});

ScatterGlyph.displayName = "ScatterGlyph";
