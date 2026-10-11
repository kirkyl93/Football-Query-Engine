import React from "react";
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import {PieSlice} from "../../lib/pieChartData";
import styles from './ComparisonPieChart.module.css';

interface ComparisonPieChartProps {
    title: string;
    playerName: string;
    playerSlices: PieSlice[];
    comparisonPlayerName: string;
    comparisonSlices: PieSlice[];
    /** Render height per pie in px: compact tile vs expanded modal. */
    height?: number;
}

/**
 * Shared single/comparison pie chart. Replaces six near-identical chart
 * components.
 */
const ComparisonPieChart: React.FC<ComparisonPieChartProps> = ({
    title,
    playerName,
    playerSlices,
    comparisonPlayerName,
    comparisonSlices,
    height = 240,
}) => {
    const hasComparison = comparisonPlayerName.length > 0;
    const total = (slices: PieSlice[]) => slices.reduce((sum, s) => sum + (s.value || 0), 0);
    // Render-height tiers: below 250px the donut shapes render without
    // slice legends or percentages (behind the tile's expand action).
    // Names always stay with comparison pies: two anonymous donuts carry
    // no meaning. Level-0 minis (<200px) skip entry animations.
    const compact = height < 250;
    const minimal = height < 200;

    const renderPie = (name: string, slices: PieSlice[], showName: boolean) => {
        const pieTotal = total(slices);
        const pctOf = (value: number) =>
            pieTotal > 0 ? `${((value / pieTotal) * 100).toFixed(0)}%` : '—';
        return (
            <div className={styles['pie-block']}>
                {showName && <div className={styles['pie-name']}>{name}</div>}
                <div className={styles['pie-chart']} style={{height}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={slices.map(slice => ({...slice, fill: slice.colour}))}
                                cx="50%"
                                cy="50%"
                                paddingAngle={3}
                                innerRadius="55%"
                                outerRadius="85%"
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                stroke="#fff"
                                strokeWidth={2}
                                isAnimationActive={!minimal}
                            >
                                {slices.map((slice, i) => (
                                    <Cell key={`${slice.name}-${i}`} fill={slice.colour} stroke="#131313" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={(props: any) => {
                                    const {active, payload} = props;
                                    if (active && payload && payload.length) {
                                        const datum = payload[0]?.payload;
                                        if (!datum) {
                                            return null;
                                        }
                                        const pct = pieTotal > 0 ? ((datum.value / pieTotal) * 100).toFixed(1) : '0.0';
                                        return (
                                            <div className={styles['pie-tooltip']}>
                                                <div className={styles['pie-tooltip-title']}>{datum.name}</div>
                                                <div className={styles['pie-tooltip-value']}>
                                                    {datum.value} · {pct}%
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            {/* No centre total: an unexplained number reads as
                                decoration. Totals live in the legend below so
                                each value carries its own label. */}
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {!compact && (
                    <div className={styles['pie-legend']}>
                        {slices.map((slice) => (
                            <span key={slice.name} className={styles['pie-legend-item']} title={`${slice.name}: ${slice.value}`}>
                                <span className={styles['pie-legend-dot']} style={{backgroundColor: slice.colour}} />
                                <span className={styles['pie-legend-label']}>{slice.name}</span>
                                <span className={styles['pie-legend-value']}>{slice.value}</span>
                                <span className={styles['pie-legend-pct']}>{pctOf(slice.value)}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles['chart-shell']}>
            <div className={styles['chart-title']}>
                {title}
            </div>
            <div className={`${styles['chart-row']} ${hasComparison ? '' : styles['single']}`}>
                {renderPie(playerName, playerSlices, hasComparison)}
                {hasComparison && renderPie(comparisonPlayerName, comparisonSlices, hasComparison)}
            </div>
        </div>
    );
};

export default ComparisonPieChart;
