import React, {useCallback, useMemo} from "react";
import {
    Bar,
    ComposedChart,
    ReferenceArea,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {PlayerAppearance} from "../../../../types/Player";
import {ChartSizing} from "../../lib/chartSizing";
import {ScatterEvent} from "../../lib/appearancesEventMapper";
import {createAppearanceBarShape} from "./appearanceBarShape";
import {ScatterGlyph} from "./ScatterEventShape";

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
}

// Static chart chrome: module-level so Recharts never sees a fresh object
// identity (and re-renders) just because the parent committed.
const CHART_MARGIN = {top: 20, right: 20, left: 20, bottom: 40};
const X_AXIS_LABEL = {
    value: "Game Number",
    dx: 0,
    dy: 30,
    style: {fontSize: 14, userSelect: 'none' as const},
};
const Y_AXIS_LABEL = {
    value: "Minute",
    dx: -30,
    dy: 0,
    angle: -90,
    style: {fontSize: 14, userSelect: 'none' as const},
};
const X_AXIS_STYLE = {fontSize: '12px', userSelect: 'none' as const};
const Y_AXIS_STYLE = {fontSize: '12px', userSelect: 'none' as const};
const X_AXIS_TICK = {dy: 10};
const Y_AXIS_TICK = {dx: -10};

const formatYTick = (value: number): string => (value > 0 ? String(value) : "");

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
}) => {
    const {barChartWidth, strokeWidth, scatterDotRadius, rectangleWidth, rectangleHeight, barChartOpacity} = sizing;

    const barShape = useMemo(
        () => createAppearanceBarShape({zoomedData, barFills, showCleanSheets, barChartOpacity, strokeWidth}),
        [zoomedData, barFills, showCleanSheets, barChartOpacity, strokeWidth],
    );

    // Stable scatter renderer: the previous inline closure gave Scatter a new
    // shape identity on every parent commit, remounting every marker.
    const scatterShape = useCallback((props: {
        cx?: number;
        cy?: number;
        payload?: { shape?: string; color?: string };
    }) => (
        <ScatterGlyph
            cx={props.cx}
            cy={props.cy}
            payload={props.payload}
            rectangleWidth={rectangleWidth}
            rectangleHeight={rectangleHeight}
            scatterDotRadius={scatterDotRadius}
            strokeWidth={strokeWidth}
        />
    ), [rectangleWidth, rectangleHeight, scatterDotRadius, strokeWidth]);

    // Recharts passes rich mouse state; the zoom hook only needs activeLabel.
    // Stable shims (instead of per-render closures) keep ComposedChart props
    // referentially stable across commits that don't touch zoom.
    const handleMouseDown = useCallback((e: unknown) => {
        onMouseDown(e as { activeLabel?: number });
    }, [onMouseDown]);
    const handleMouseMove = useCallback((e: unknown) => {
        onMouseMove(e as { activeLabel?: number });
    }, [onMouseMove]);

    // No wheel/pinch handlers here by design: the wheel scrolls the page
    // natively and touch scrolls/zooms via the browser. Zooming is via
    // drag-select on the chart plus the zoom-out button.
    return (
        <div>
            <div style={{height: '360px'}}>
                <ResponsiveContainer>
                    <ComposedChart
                        data={zoomedData}
                        margin={CHART_MARGIN}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    >
                        <XAxis
                            dataKey={"game_number"}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            label={X_AXIS_LABEL}
                            type='category'
                            tickCount={10}
                            style={X_AXIS_STYLE}
                            tick={X_AXIS_TICK}
                            interval="preserveStartEnd"
                            minTickGap={24}
                            allowDuplicatedCategory={false}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickCount={9}
                            label={Y_AXIS_LABEL}
                            domain={yDomain}
                            style={Y_AXIS_STYLE}
                            tick={Y_AXIS_TICK}
                            tickFormatter={formatYTick}
                            width={44}
                        />
                        <Tooltip content={tooltip} animationDuration={0}/>

                        <Bar
                            dataKey="minutes_played"
                            barSize={barChartWidth}
                            fillOpacity={barChartOpacity}
                            stroke={"black"}
                            strokeWidth={strokeWidth}
                            isAnimationActive={false}
                            shape={barShape}
                        />

                        <Scatter
                            name="d"
                            data={scatterData}
                            dataKey="minute"
                            isAnimationActive={false}
                            shape={scatterShape}
                        />
                        {refAreaLeft && refAreaRight && (
                            <ReferenceArea
                                x1={refAreaLeft}
                                x2={refAreaRight}
                                strokeOpacity={0.3}
                                fill="hsl(var(--foreground))"
                                fillOpacity={0.05}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default React.memo(AppearancesMainChart);
