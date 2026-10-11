import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PlayerAppearance} from "../../../../types/Player";
import {ChartSizing} from "../../lib/chartSizing";
import {ScatterEvent} from "../../lib/appearancesEventMapper";
import {CANVAS_HEIGHT, gameIndexAtX, plotFrameForSize, yForMinute} from "./appearancesCanvasGeometry";
import {drawAppearancesChart} from "./appearancesCanvasDraw";

interface AppearancesMainChartProps {
    zoomedData: PlayerAppearance[];
    barFills: string[];
    scatterData: ScatterEvent[];
    sizing: ChartSizing;
    yDomain: number[];
    refAreaLeft: number | null;
    refAreaRight: number | null;
    showCleanSheets: boolean;
    tooltip: React.ReactElement | ((props: any) => React.ReactNode);
    onMouseDown: (e: { activeLabel?: number }) => void;
    onMouseMove: (e: { activeLabel?: number }) => void;
    onMouseUp: () => void;
    /** Canvas height in px (compact tile preview vs full chart). */
    height?: number;
    /**
     * Pin the canvas to the bottom of a stretching flex column so
     * side-by-side comparison charts stay in line whatever sits above.
     */
    pinToBottom?: boolean;
}

interface HoverState {
    gameNumber: number;
    anchorX: number;
    anchorY: number;
}

const AppearancesMainChart: React.FC<AppearancesMainChartProps> = ({
    zoomedData,
    barFills,
    scatterData,
    sizing,
    yDomain,
    refAreaLeft,
    refAreaRight,
    showCleanSheets,
    tooltip,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    height = CANVAS_HEIGHT,
    pinToBottom = false,
}) => {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const [hover, setHover] = useState<HoverState | null>(null);

    // Container size via ResizeObserver (guarded for non-DOM environments).
    useEffect(() => {
        const node = wrapRef.current;
        if (!node || typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect) {
                setSize({width: rect.width, height});
            }
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [height]);

    // Paint on every visual input change. Hover state is intentionally
    // excluded: the tooltip is a DOM overlay, so hovering never repaints.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || size == null) {
            return;
        }
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.max(1, Math.round(size.width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawAppearancesChart(ctx, size.width, height, {
            zoomedData,
            barFills,
            scatterData,
            sizing,
            yDomain,
            refAreaLeft,
            refAreaRight,
            showCleanSheets,
        });
    }, [size, zoomedData, barFills, scatterData, sizing, yDomain, refAreaLeft, refAreaRight, showCleanSheets, height]);

    const appearanceByGame = useMemo(
        () => new Map(zoomedData.map((appearance) => [appearance.game_number, appearance])),
        [zoomedData],
    );

    const gameAtClientX = useCallback((clientX: number): number | null => {
        const node = wrapRef.current;
        if (!node) {
            return null;
        }
        const rect = node.getBoundingClientRect();
        const frame = plotFrameForSize(rect.width, height);
        const index = gameIndexAtX(clientX - rect.left, frame, zoomedData.length);
        if (index < 0) {
            return null;
        }
        return zoomedData[index]?.game_number ?? null;
    }, [zoomedData, height]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const gameNumber = gameAtClientX(e.clientX);
        if (gameNumber != null) {
            onMouseDown({activeLabel: gameNumber});
        }
    }, [gameAtClientX, onMouseDown]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const node = wrapRef.current;
        const gameNumber = gameAtClientX(e.clientX);
        if (gameNumber != null) {
            onMouseMove({activeLabel: gameNumber});
        }
        if (node && gameNumber != null) {
            const rect = node.getBoundingClientRect();
            const appearance = appearanceByGame.get(gameNumber);
            if (appearance) {
                const frame = plotFrameForSize(rect.width, height);
                const slot = frame.plotWidth / Math.max(1, zoomedData.length);
                const index = zoomedData.indexOf(appearance);
                const cx = frame.plotLeft + (index + 0.5) * slot;
                setHover({
                    gameNumber,
                    anchorX: cx,
                    anchorY: yForMinute(appearance.minutes_played[1], yDomain, frame),
                });
                return;
            }
        }
        setHover(null);
    }, [appearanceByGame, gameAtClientX, onMouseMove, yDomain, zoomedData, height]);

    const handleMouseUp = useCallback(() => {
        onMouseUp();
    }, [onMouseUp]);

    const handleMouseLeave = useCallback(() => {
        setHover(null);
        onMouseUp();
    }, [onMouseUp]);

    const hoverAppearance = hover ? appearanceByGame.get(hover.gameNumber) : undefined;
    // Hide the tooltip mid-drag (a reference area is being drawn instead).
    const showTooltip = hoverAppearance && refAreaLeft == null;

    return (
        <div style={pinToBottom ? {marginTop: 'auto'} : undefined}>
            <div
                ref={wrapRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{position: 'relative', height: `${height}px`}}
            >
                <canvas
                    ref={canvasRef}
                    style={{display: 'block', width: '100%', height: `${height}px`}}
                />
                {showTooltip && (
                    <div style={{
                        position: 'absolute',
                        left: hover!.anchorX > (size?.width ?? 0) - 280
                            ? Math.max(4, hover!.anchorX - 256)
                            : hover!.anchorX + 16,
                        top: Math.max(4, Math.min(hover!.anchorY - 60, height - 120)),
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}>
                        {renderTooltipContent(tooltip, hoverAppearance!)}
                    </div>
                )}
            </div>
        </div>
    );
};

const renderTooltipContent = (
    tooltip: React.ReactElement | ((props: any) => React.ReactNode),
    appearance: PlayerAppearance,
): React.ReactNode => {
    const props = {active: true, payload: [{payload: appearance}]};
    if (React.isValidElement(tooltip)) {
        return React.cloneElement(tooltip, props as any);
    }
    return (tooltip as (props: any) => React.ReactNode)(props);
};

export default React.memo(AppearancesMainChart);
