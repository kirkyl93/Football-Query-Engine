import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {teamGoalsByGameSlices} from "../lib/pieChartData";


interface TeamGoalsPerGameProps {
    playerName: string;
    teamGoalsByGame: number[];
    comparisonPlayerName: string;
    comparisonTeamGoalsByGame: number[];
}

const TeamGoalsByGameChart: React.FC<TeamGoalsPerGameProps> = (
    {
        playerName, teamGoalsByGame, comparisonPlayerName, comparisonTeamGoalsByGame
    }) => {
    return (
        <ComparisonPieChart
            title="Team goals by game"
            playerName={playerName}
            playerSlices={teamGoalsByGameSlices(teamGoalsByGame)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={teamGoalsByGameSlices(comparisonTeamGoalsByGame)}
        />
    )
}

export default TeamGoalsByGameChart;
