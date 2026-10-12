import React from "react";
import {PlayerStats} from "../../../types/Player";
import ComparisonBarChart from "./charts/ComparisonBarChart";
import {PLAYER_COLOUR, stripedSwatch} from "./charts/StreakTooltipContent";
import {per90Rows} from "../lib/barChartData";
import styles from './charts/ComparisonBarChart.module.css';

/** Rates travel as numbers (proper axis scaling); tooltips show 2dp. */
const formatRate = (value: number | string): string =>
    typeof value === "number" ? value.toFixed(2) : value;


interface Per90Props {
    playerName: string;
    playerStats: PlayerStats;
    comparisonPlayerName: string;
    comparisonPlayerStats: PlayerStats;
    height?: number;
}

const Per90Chart: React.FC<Per90Props> = (
    {
        playerName, playerStats, comparisonPlayerName, comparisonPlayerStats, height
    }) => {
    return (
        <ComparisonBarChart
            title="Per 90"
            playerName={playerName}
            comparisonPlayerName={comparisonPlayerName}
            data={per90Rows(playerStats, comparisonPlayerStats)}
            height={height}
            layout="horizontal"
            renderTooltipContent={(row) => {
                const colour = row.colour ?? PLAYER_COLOUR;
                if (comparisonPlayerName.length === 0) {
                    return (
                        <p className={styles['tooltip-value']}>
                            <span className={styles['legend-solid']} style={{backgroundColor: colour}} /> {formatRate(row.player1)}
                        </p>
                    );
                }
                return (
                    <>
                        <p className={styles['tooltip-value']}>
                            <span className={styles['legend-solid']} style={{backgroundColor: colour}} /> {playerName}: {formatRate(row.player1)}
                        </p>
                        <p className={styles['tooltip-value']}>
                            <span className={styles['legend-striped']} style={stripedSwatch(colour)} /> {comparisonPlayerName}: {formatRate(row.player2)}
                        </p>
                    </>
                );
            }}
        />
    )
}

export default Per90Chart;
