import React from "react";
import {Bar, BarChart, Tooltip, XAxis, YAxis} from "recharts";
import styles from './ComparisonBarChart.module.css';
import shared from "../../../../styles/shared.module.css";
import {BarRow} from "../../lib/barChartData";
import {COMPARISON_COLOUR, PLAYER_COLOUR} from "./StreakTooltipContent";

interface ComparisonBarChartProps {
    title: string;
    playerName: string;
    comparisonPlayerName: string;
    data: BarRow[];
    renderTooltipContent: (row: BarRow) => React.ReactNode;
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
}) => {
    const hasComparison = comparisonPlayerName.length > 0;

    return (
        <div style={{width: 500}}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '5px'
            }}>
                {title}
            </div>
            {hasComparison && (<div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '4px',
                    marginBottom: '4px',
                    fontSize: '13.5px',
                }}>
                    <span className={shared['square-title']} style={{backgroundColor: PLAYER_COLOUR}}></span> {playerName}
                    <span className={shared['square-title']} style={{backgroundColor: COMPARISON_COLOUR}}></span> {comparisonPlayerName}
                </div>
            )}

            <BarChart
                data={data}
                width={400}
                height={520}
                layout="vertical"
                margin={{top: 20, left: 50, right: 20, bottom: 50}}>
                <XAxis
                    type="number"
                    tick={{fontSize: 13}}
                />

                <YAxis
                    dataKey="name"
                    type="category"
                    tick={{fontSize: 13}}
                />
                <Tooltip content={(props: any) => {
                    const {active, payload} = props;
                    if (active && payload && payload.length) {
                        const row = data.find(row => row.name === payload[0].payload.name);
                        if (!row) {
                            return null;
                        }
                        return (
                            <div className={styles['team-streak-custom-tooltip']}>
                                {renderTooltipContent(row)}
                            </div>
                        );
                    }
                    return null;
                }}/>
                <Bar
                    dataKey="player1"
                    barSize={12}
                    stroke={"black"}
                    strokeWidth={1.2}
                    fill={PLAYER_COLOUR}
                />
                {hasComparison &&
                    <Bar
                        dataKey="player2"
                        barSize={12}
                        stroke={"black"}
                        strokeWidth={1.2}
                        fill={COMPARISON_COLOUR}
                    />
                }
            </BarChart>
        </div>
    );
};

export default ComparisonBarChart;
