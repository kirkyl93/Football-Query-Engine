import React from "react";
import {PlayerStats} from "../../../types/Player";
import ComparisonBarChart from "./charts/ComparisonBarChart";
import {COMPARISON_COLOUR, PLAYER_COLOUR} from "./charts/StreakTooltipContent";
import {per90Rows} from "../lib/barChartData";
import shared from "../../../styles/shared.module.css";
import styles from './charts/ComparisonBarChart.module.css';


interface Per90Props {
    playerName: string;
    playerStats: PlayerStats;
    comparisonPlayerName: string;
    comparisonPlayerStats: PlayerStats;
}

const Per90Chart: React.FC<Per90Props> = (
    {
        playerName, playerStats, comparisonPlayerName, comparisonPlayerStats
    }) => {
    return (
        <ComparisonBarChart
            title="Per 90"
            playerName={playerName}
            comparisonPlayerName={comparisonPlayerName}
            data={per90Rows(playerStats, comparisonPlayerStats)}
            renderTooltipContent={(row) => {
                if (comparisonPlayerName.length === 0) {
                    return (
                        <p className={styles['tooltip-value']}>
                            {row.player1}
                        </p>
                    );
                }
                return (
                    <>
                        <p className={styles['tooltip-value']}>
                            <span className={shared['square-title']} style={{backgroundColor: PLAYER_COLOUR}}></span> {row.player1}
                        </p>
                        <p className={styles['tooltip-value']}>
                            <span className={shared['square-title']} style={{backgroundColor: COMPARISON_COLOUR}}></span> {row.player2}
                        </p>
                    </>
                );
            }}
        />
    )
}

export default Per90Chart;
