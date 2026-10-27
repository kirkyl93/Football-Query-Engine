import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
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
    /** Compact player previews keep their tooltip inside the enclosing card. */
    tooltipBoundaryRef?: React.RefObject<HTMLDivElement | null>;
}

interface HoverState {
    gameNumber: number;
    anchorX: number;
    anchorY: number;
    width: number;
    left: number;
    top: number;
    bounds?: {top: number; bottom: number; left: number; right: number};
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
    tooltipBoundaryRef,
}) => {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const [tooltipSize, setTooltipSize] = useState({width: 0, height: 0});
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
                const anchorY = yForMinute(appearance.minutes_played[1], yDomain, frame);
                const bounds = tooltipBoundaryRef?.current?.getBoundingClientRect();
                setHover(previous => previous?.gameNumber === gameNumber && previous.anchorX === cx
                    && previous.anchorY === anchorY && previous.width === rect.width
                    && previous.left === rect.left && previous.top === rect.top
                    && previous.bounds?.top === bounds?.top && previous.bounds?.bottom === bounds?.bottom
                    && previous.bounds?.left === bounds?.left && previous.bounds?.right === bounds?.right ? previous : {
                        gameNumber, anchorX: cx, anchorY, width: rect.width, left: rect.left, top: rect.top,
                        bounds: bounds ? {top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right} : undefined,
                    });
                return;
            }
        }
        setHover(null);
    }, [appearanceByGame, gameAtClientX, onMouseMove, yDomain, zoomedData, height, tooltipBoundaryRef]);

    const handleMouseUp = useCallback(() => {
        onMouseUp();
    }, [onMouseUp]);

    const handleMouseLeave = useCallback(() => {
        setHover(null);
        onMouseUp();
    }, [onMouseUp]);

    const hoverAppearance = hover ? appearanceByGame.get(hover.gameNumber) : undefined;
    // Hide the tooltip mid-drag (a reference area is being drawn instead).
    const showTooltip = Boolean(hoverAppearance && refAreaLeft == null);

    // Measure the actual content, including changes when club badges load.
    // Layout measurement happens before paint so a new tooltip cannot flash
    // below the chart and enlarge the surrounding modal's scroll area.
    useLayoutEffect(() => {
        const node = tooltipRef.current;
        if (!showTooltip || !node) return;
        const measure = () => {
            const rect = node.getBoundingClientRect();
            setTooltipSize(previous => previous.width === rect.width && previous.height === rect.height
                ? previous : {width: rect.width, height: rect.height});
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [showTooltip, hoverAppearance, tooltip]);

    const frame = plotFrameForSize(hover?.width ?? size?.width ?? 0, height);
    // Anchor to the plot, allowing a tall, full-size tooltip to extend above
    // it. A fixed portal avoids adding overflow to the chart or modal.
    const plotTop = (hover?.top ?? 0) + frame.plotTop;
    const plotBottom = plotTop + frame.plotHeight;
    const topLimit = Math.max(4, (hover?.bounds?.top ?? 0) + 4);
    const bottomLimit = Math.min(window.innerHeight - 4, (hover?.bounds?.bottom ?? window.innerHeight) - 4);
    const tooltipTop = Math.max(topLimit, Math.min(
        Math.max(plotTop, (hover?.top ?? 0) + (hover?.anchorY ?? 0) - 60),
        plotBottom - tooltipSize.height,
        bottomLimit - tooltipSize.height,
    ));
    const rightLimit = frame.plotLeft + frame.plotWidth;
    const preferredLeft = (hover?.anchorX ?? 0) + 16;
    const localLeft = Math.max(frame.plotLeft, Math.min(
        preferredLeft + tooltipSize.width <= rightLimit ? preferredLeft : (hover?.anchorX ?? 0) - tooltipSize.width - 16,
        rightLimit - tooltipSize.width,
    ));
    const leftLimit = Math.max(4, (hover?.bounds?.left ?? 0) + 4);
    const rightEdge = Math.min(window.innerWidth - 4, (hover?.bounds?.right ?? window.innerWidth) - 4);
    const tooltipLeft = Math.max(leftLimit, Math.min((hover?.left ?? 0) + localLeft, rightEdge - tooltipSize.width));

    useEffect(() => {
        const hide = () => setHover(null);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, []);

    return (
        <div>
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
                {showTooltip && createPortal(
                    <div ref={tooltipRef} role="tooltip" style={{
                        position: 'fixed',
                        display: 'flow-root',
                        width: 'max-content',
                        maxWidth: Math.max(0, Math.min(frame.plotWidth, window.innerWidth - 8)),
                        left: tooltipLeft,
                        top: tooltipTop,
                        pointerEvents: 'none',
                        zIndex: 1002,
                    }}>
                        {renderTooltipContent(tooltip, hoverAppearance!)}
                    </div>,
                    document.body,
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
