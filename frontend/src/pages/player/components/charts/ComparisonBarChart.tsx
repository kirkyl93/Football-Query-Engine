import React from "react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
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
}

/**
 * Shared single/comparison vertical bar chart. Row data and tooltip content
 * come from callers via barChartData mappers.
 */
const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
    title,
    playerName,
    comparisonPlayerName,
    data,
    renderTooltipContent,
    height = 300,
}) => {
    const hasComparison = comparisonPlayerName.length > 0;
    const shortName = (name: string) => name.length > 18 ? `${name.slice(0, 17)}…` : name;
    // Render-height tiers: level-0 minis (<200px) keep the title only —
    // no ticks or legends, slim bars, no entry animations (all minis
    // mount at page load). Section modals (260px and up) restore full
    // axes, legends and animation.
    const compact = height < 250;
    const minimal = height < 200;
    const yAxisWidth = minimal ? 10 : compact ? 92 : 150;
    const tickFontSize = compact ? 10.5 : 12;
    const barSize = compact ? 8 : 12;

    return (
        <div className={styles['chart-shell']}>
            <div className={styles['chart-title']}>
                {title}
            </div>
            {!compact && (
                <div className={styles['chart-legend']}>
                    <span className={styles['legend-item']}>
                        <span className={styles['legend-dot']} style={{backgroundColor: PLAYER_COLOUR}} />
                        {shortName(playerName) || 'Player'}
                    </span>
                    {hasComparison && (
                        <span className={styles['legend-item']}>
                            <span className={styles['legend-dot']} style={{backgroundColor: COMPARISON_COLOUR}} />
                            {shortName(comparisonPlayerName)}
                        </span>
                    )}
                </div>
            )}

            <div className={styles['chart-body']} style={{height}}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{top: 8, left: 8, right: 16, bottom: 8}}
                        barCategoryGap="28%"
                        barGap={4}
                    >
                        <CartesianGrid horizontal={true} vertical={false} stroke="#eef0f3" />
                        <XAxis
                            type="number"
                            tick={minimal ? false : {fontSize: tickFontSize, fill: '#666'}}
                            axisLine={minimal ? false : {stroke: '#e5e7eb'}}
                            tickLine={false}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={yAxisWidth}
                            tick={minimal ? false : {fontSize: tickFontSize, fill: '#333'}}
                            axisLine={false}
                            tickLine={false}
                        />
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
                            radius={[0, 6, 6, 0]}
                            stroke="#131313"
                            strokeWidth={1}
                            fill={PLAYER_COLOUR}
                            isAnimationActive={!minimal}
                        />
                        {hasComparison &&
                            <Bar
                                dataKey="player2"
                                name={comparisonPlayerName}
                                barSize={barSize}
                                radius={[0, 6, 6, 0]}
                                stroke="#131313"
                                strokeWidth={1}
                                fill={COMPARISON_COLOUR}
                                isAnimationActive={!minimal}
                            />
                        }
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ComparisonBarChart;
