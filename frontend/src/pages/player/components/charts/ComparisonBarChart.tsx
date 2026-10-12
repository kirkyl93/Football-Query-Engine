import React, {useId} from "react";
import {Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import styles from './ComparisonBarChart.module.css';
import {BarRow} from "../../lib/barChartData";
import {COMPARISON_COLOUR, PLAYER_COLOUR} from "./StreakTooltipContent";

interface ComparisonBarChartProps {
    title: string;
    playerName: string;
    comparisonPlayerName: string;
    data: BarRow[];
    renderTooltipContent: (row: BarRow) => React.ReactNode;
    /** Render height in px: compact tile vs expanded modal. */
    height?: number;
    layout?: 'vertical' | 'horizontal';
}

const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
    title,
    playerName,
    comparisonPlayerName,
    data,
    renderTooltipContent,
    height = 300,
    layout = 'vertical',
}) => {
    const hasComparison = comparisonPlayerName.length > 0;
    const semantic = data.some((row) => row.colour);
    const shortName = (name: string) => name.length > 24 ? `${name.slice(0, 23)}…` : name;
    const compact = height < 250;
    const minimal = height < 200;
    const patternId = useId().replace(/:/g, '');
    const horizontal = layout === 'horizontal';

    const yAxisWidth = horizontal ? (minimal ? 8 : 34) : minimal ? 10 : compact ? 92 : 175;
    const tickFontSize = compact ? 10.5 : 12;
    const barSize = horizontal ? (minimal ? 14 : 20) : compact ? 8 : 12;
    const labelFontSize = minimal ? 10 : 11;

    const fillFor = (row: BarRow): string => row.colour ?? PLAYER_COLOUR;
    const hatchFor = (row: BarRow, index: number): string => `url(#${patternId}-${index})`;

    return (
        <div className={styles['chart-shell']}>
            <div className={styles['chart-title']}>
                {title}
            </div>
            {hasComparison && (
                <div className={styles['chart-legend']}>
                    {semantic ? (
                        <>
                            <span className={styles['legend-item']} title={`${playerName} — solid bars`}>
                                <span className={styles['legend-solid']} />
                                {shortName(playerName) || 'Player'} (solid)
                            </span>
                            <span className={styles['legend-item']} title={`${comparisonPlayerName} — striped bars`}>
                                <span className={styles['legend-striped']} />
                                {shortName(comparisonPlayerName)} (striped)
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={styles['legend-item']} title={playerName || 'Player'}>
                                <span className={styles['legend-dot']} style={{backgroundColor: PLAYER_COLOUR}} />
                                {shortName(playerName) || 'Player'}
                            </span>
                            <span className={styles['legend-item']} title={comparisonPlayerName}>
                                <span className={styles['legend-dot']} style={{backgroundColor: COMPARISON_COLOUR}} />
                                {shortName(comparisonPlayerName)}
                            </span>
                        </>
                    )}
                </div>
            )}

            <div className={styles['chart-body']} style={{height}}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout={layout}
                        margin={{top: 8, left: 8, right: 16, bottom: 8}}
                        barCategoryGap="28%"
                        barGap={4}
                    >
                        <defs>
                            {hasComparison && semantic && data.map((row, index) => (
                                <pattern
                                    key={row.name}
                                    id={`${patternId}-${index}`}
                                    width="6"
                                    height="6"
                                    patternUnits="userSpaceOnUse"
                                    patternTransform="rotate(45)"
                                >
                                    <rect width="6" height="6" fill="#ffffff" />
                                    <rect width="2.5" height="6" fill={fillFor(row)} />
                                </pattern>
                            ))}
                        </defs>
                        <CartesianGrid horizontal={true} vertical={false} stroke="#eef0f3" />
                        {horizontal ? (
                            <XAxis
                                dataKey="name"
                                type="category"
                                height={minimal ? 10 : 70}
                                interval={0}
                                tick={minimal ? false : {
                                    fontSize: tickFontSize,
                                    fill: '#333',
                                    angle: -25,
                                    textAnchor: 'end',
                                }}
                                axisLine={false}
                                tickLine={false}
                            />
                        ) : (
                            <XAxis
                                type="number"
                                tick={minimal ? false : {fontSize: tickFontSize, fill: '#666'}}
                                axisLine={minimal ? false : {stroke: '#e5e7eb'}}
                                tickLine={false}
                            />
                        )}
                        {horizontal ? (
                            <YAxis
                                type="number"
                                width={yAxisWidth}
                                tick={minimal ? false : {fontSize: tickFontSize, fill: '#666'}}
                                axisLine={false}
                                tickLine={false}
                            />
                        ) : (
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={yAxisWidth}
                                tick={minimal ? false : {fontSize: tickFontSize, fill: '#333'}}
                                axisLine={false}
                                tickLine={false}
                            />
                        )}
                        <Tooltip
                            cursor={{fill: 'rgba(0, 0, 0, 0.04)'}}
                            content={(props: any) => {
                                const {active, payload} = props;
                                if (active && payload && payload.length) {
                                    const row = data.find(row => row.name === payload[0].payload.name);
                                    if (!row) {
                                        return null;
                                    }
                                    return (
                                        <div className={styles['team-streak-custom-tooltip']}>
                                            <div className={styles['tooltip-title']}>{row.name}</div>
                                            {renderTooltipContent(row)}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="player1"
                            name={playerName || 'Player'}
                            barSize={barSize}
                            radius={horizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}
                            stroke="#131313"
                            strokeWidth={1}
                            fill={semantic ? undefined : PLAYER_COLOUR}
                            isAnimationActive={!minimal}
                        >
                            {semantic && data.map((row) => (
                                <Cell key={row.name} fill={fillFor(row)} />
                            ))}
                            {!minimal && (
                                <LabelList
                                    dataKey="player1"
                                    position={horizontal ? "top" : "right"}
                                    formatter={(value: React.ReactNode) => formatBarValue(value)}
                                    style={{fontSize: labelFontSize, fill: '#333', fontWeight: 600}}
                                />
                            )}
                        </Bar>
                        {hasComparison &&
                            <Bar
                                dataKey="player2"
                                name={comparisonPlayerName}
                                barSize={barSize}
                                radius={horizontal ? [6, 6, 0, 0] : [0, 6, 6, 0]}
                                stroke="#131313"
                                strokeWidth={1}
                                fill={semantic ? undefined : COMPARISON_COLOUR}
                                isAnimationActive={!minimal}
                            >
                                {semantic && data.map((row, index) => (
                                    <Cell key={row.name} fill={hatchFor(row, index)} />
                                ))}
                                {!minimal && (
                                    <LabelList
                                        dataKey="player2"
                                        position={horizontal ? "top" : "right"}
                                        formatter={(value: React.ReactNode) => formatBarValue(value)}
                                        style={{fontSize: labelFontSize, fill: '#333', fontWeight: 600}}
                                    />
                                )}
                            </Bar>
                        }
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

/** Bar values render raw; rates show 2dp to match their tooltips. */
const formatBarValue = (value: React.ReactNode): string | number => {
    if (typeof value === "number") {
        return Number.isInteger(value) ? value : value.toFixed(2);
    }
    return typeof value === "string" ? value : "";
};

export default ComparisonBarChart;
