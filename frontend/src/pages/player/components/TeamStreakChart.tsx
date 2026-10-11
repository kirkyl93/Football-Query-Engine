import React from "react";
import {PlayerStreaks} from "../../../types/Player";
import ComparisonBarChart from "./charts/ComparisonBarChart";
import StreakTooltipContent from "./charts/StreakTooltipContent";
import {streakRows, teamStreakTypes} from "../lib/barChartData";


interface TeamStreakChartProps {
    playerName: string;
    playerStreaks: PlayerStreaks;
    comparisonPlayerName: string;
    comparisonPlayerStreaks: PlayerStreaks;
    height?: number;
}

const TeamStreakChart: React.FC<TeamStreakChartProps> = (
    {
        playerName, playerStreaks, comparisonPlayerName, comparisonPlayerStreaks, height
    }) => {
    return (
        <ComparisonBarChart
            title="Most consecutive games where team"
            playerName={playerName}
            comparisonPlayerName={comparisonPlayerName}
            data={streakRows(teamStreakTypes, playerStreaks, comparisonPlayerStreaks)}
            height={height}
            renderTooltipContent={(row) => {
                const streakType = teamStreakTypes.find(streak => streak.name === row.name);
                if (!streakType) {
                    return null;
                }
                return (
                    <StreakTooltipContent
                        playerStreak={playerStreaks[streakType.key]}
                        comparisonStreak={comparisonPlayerStreaks[streakType.key]}
                        comparisonPlayerName={comparisonPlayerName}
                    />
                );
            }}
        />
    )
}

export default TeamStreakChart;
