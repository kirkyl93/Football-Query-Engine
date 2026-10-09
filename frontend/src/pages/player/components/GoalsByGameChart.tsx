import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {goalsByGameSlices} from "../lib/pieChartData";


interface GoalsByGameProps {
    playerName: string;
    goalsByGame: number[];
    comparisonPlayerName: string;
    comparisonGoalsByGame: number[];
}

const GoalsByGameChart: React.FC<GoalsByGameProps> = (
    {
        playerName, goalsByGame, comparisonPlayerName, comparisonGoalsByGame
    }) => {
    return (
        <ComparisonPieChart
            title="Goals by game"
            playerName={playerName}
            playerSlices={goalsByGameSlices(goalsByGame)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={goalsByGameSlices(comparisonGoalsByGame)}
        />
    )
}

export default GoalsByGameChart;
