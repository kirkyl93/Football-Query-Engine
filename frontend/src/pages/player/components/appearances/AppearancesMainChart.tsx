import React, {useMemo, useRef} from "react";
import {
    Bar,
    Cell,
    ComposedChart,
    ReferenceArea,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {getColour} from "../../../../lib/ColourUtils";
import {PlayerAppearance} from "../../../../types/Player";
import {ChartSizing} from "../../lib/chartSizing";
import {ScatterEvent} from "../../lib/appearancesEventMapper";
import {getBarOutlineColour} from "../../lib/barOutlineColour";

interface AppearancesMainChartProps {
    zoomedData: PlayerAppearance[];
    scatterData: ScatterEvent[];
    sizing: ChartSizing;
    yDomain: number[];
    refAreaLeft: number | null;
    refAreaRight: number | null;
    chartRef: React.RefObject<HTMLDivElement | null>;
    showCleanSheets: boolean;
    tooltip: React.ReactElement | ((props: any) => React.ReactNode);
    onMouseDown: (e: { activeLabel?: number }) => void;
    onMouseMove: (e: { activeLabel?: number }) => void;
    onMouseUp: () => void;
    onZoom: (e: React.WheelEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    onEnter: () => void;
    onLeave: () => void;
}

const AppearancesMainChart: React.FC<AppearancesMainChartProps> = ({
    zoomedData,
    scatterData,
    sizing,
    yDomain,
    refAreaLeft,
    refAreaRight,
    chartRef,
    showCleanSheets,
    tooltip,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onZoom,
    onEnter,
    onLeave,
}) => {
    const syncId = useMemo(() => `chart-${Math.random().toString(36).substring(2, 10)}`, []);

    const currentClubIdRef = useRef<number>(-1);
    const currentClubColour = useRef<string>("");

    const {barChartWidth, strokeWidth, scatterDotRadius, rectangleWidth, rectangleHeight, barChartOpacity} = sizing;

    return (
        <div className="h-full"
             onWheel={onZoom}
             onTouchMove={onZoom}
             onMouseEnter={onEnter}
             onMouseLeave={onLeave}
             ref={chartRef}
             style={{touchAction: 'none'}}>
            <div style={{height: '360px'}}>
                <ResponsiveContainer>
                    <ComposedChart
                        data={zoomedData}
                        margin={{
                            top: 20,
                            right: 20,
                            left: 20,
                            bottom: 40,
                        }}
                        syncId={syncId}
                        onMouseDown={handleMouseDownShim(onMouseDown)}
                        onMouseMove={handleMouseMoveShim(onMouseMove)}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    >
                        <XAxis
                            dataKey={"game_number"}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            label={{
                                value: "Game Number",
                                dx: 0,
                                dy: 30,
                                style: {fontSize: 14, userSelect: 'none'},
                            }}
                            type='number'
                            tickCount={10}
                            domain={["dataMin", "dataMax" + 1]}
                            style={{fontSize: '12px', userSelect: 'none'}}
                            tick={{dy: 10}}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickCount={9}
                            label={{
                                value: "Minute",
                                dx: -30,
                                dy: 0,
                                angle: -90,
                                style: {fontSize: 14, userSelect: 'none'},
                            }}
                            domain={yDomain}
                            style={{fontSize: '12px', userSelect: 'none'}}
                            tick={{dx: -10}}
                            tickFormatter={(value) => (value > 0 ? value : "")}
                        />
                        <Tooltip content={tooltip}/>

                        <Bar
                            type="monotone"
                            dataKey="minutes_played"
                            barSize={barChartWidth}
                            fillOpacity={barChartOpacity}
                            stroke={"black"}
                            strokeWidth={strokeWidth}
                            isAnimationActive={false}
                        >
                            {
                                zoomedData.map((entry, index) => {
                                    if (entry.club_id !== currentClubIdRef.current) {
                                        currentClubIdRef.current = entry.club_id;
                                        currentClubColour.current = getColour(currentClubIdRef.current);
                                    }

                                    const cleanSheet =
                                        showCleanSheets &&
                                        (entry.club_id === entry.home_club_id
                                            ? entry.away_club_goals === 0
                                            : entry.home_club_goals === 0);
                                    const adjustedOpacity = cleanSheet ? barChartOpacity + 0.35 : barChartOpacity;

                                    return (
                                        <Cell
                                            key={index}
                                            fill={currentClubColour.current}
                                            fillOpacity={adjustedOpacity}
                                            stroke={getBarOutlineColour(entry)}
                                        />
                                    );
                                })
                            }
                        </Bar>

                        <Scatter
                            name="d"
                            data={scatterData}
                            dataKey="minute"
                            isAnimationActive={false}
                            shape={(props: {
                                cx?: number;
                                cy?: number;
                                size?: number;
                                fill?: string;
                                payload?: any
                            }) => {
                                const {cx, cy, size, fill} = props;

                                switch (props.payload.shape) {
                                    case 'rectangle':
                                        return <rect
                                            x={cx! - (rectangleWidth / 2)}
                                            y={cy! - rectangleHeight / 2}
                                            width={rectangleWidth}
                                            height={rectangleHeight}
                                            stroke={"black"}
                                            strokeWidth={strokeWidth}
                                            fill={props.payload.color}
                                        />;
                                    default:
                                        return <circle cx={cx} cy={cy} r={scatterDotRadius}
                                                       fill={props.payload.color}/>;
                                }
                            }}
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

/** Recharts passes rich mouse state; the zoom hook only needs activeLabel. */
const handleMouseDownShim = (handler: (e: { activeLabel?: number }) => void) => (e: unknown) =>
    handler(e as { activeLabel?: number });

const handleMouseMoveShim = (handler: (e: { activeLabel?: number }) => void) => (e: unknown) =>
    handler(e as { activeLabel?: number });

export default AppearancesMainChart;
