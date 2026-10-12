import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {winDrawLossSlices} from "../lib/pieChartData";


interface PlayerWinPercentageProps {
    playerName: string;
    wins: number,
    draws: number,
    losses: number,
    comparisonPlayerName: string;
    comparisonWins: number;
    comparisonDraws: number;
    comparisonLosses: number;
    height?: number;
}

const PlayerWinPercentageChart: React.FC<PlayerWinPercentageProps> = (
    {
        playerName, wins, draws, losses, comparisonPlayerName, comparisonWins, comparisonDraws, comparisonLosses, height
    }) => {
    return (
        <ComparisonPieChart
            title="Win percentage"
            playerName={playerName}
            playerSlices={winDrawLossSlices(wins, draws, losses)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={winDrawLossSlices(comparisonWins, comparisonDraws, comparisonLosses)}
            height={height}
        />
    )
}

export default PlayerWinPercentageChart;
