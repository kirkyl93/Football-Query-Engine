import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {teamGoalsConcededSlices} from "../lib/pieChartData";


interface TeamGoalsConcededPerGameProps {
    playerName: string;
    teamGoalsConcededByGame: number[];
    comparisonPlayerName: string;
    comparisonTeamGoalsConcededByGame: number[];
}

const TeamGoalsConcededByGameChart: React.FC<TeamGoalsConcededPerGameProps> = (
    {
        playerName, teamGoalsConcededByGame, comparisonPlayerName, comparisonTeamGoalsConcededByGame
    }) => {
    return (
        <ComparisonPieChart
            title="Team goals conceded by game"
            playerName={playerName}
            playerSlices={teamGoalsConcededSlices(teamGoalsConcededByGame)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={teamGoalsConcededSlices(comparisonTeamGoalsConcededByGame)}
        />
    )
}

export default TeamGoalsConcededByGameChart;
