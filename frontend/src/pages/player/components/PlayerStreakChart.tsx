import React from "react";
import {PlayerStreaks} from "../../../types/Player";
import ComparisonBarChart from "./charts/ComparisonBarChart";
import StreakTooltipContent from "./charts/StreakTooltipContent";
import {playerStreakTypes, streakRows} from "../lib/barChartData";


interface PlayerStreakChartProps {
    playerName: string;
    playerStreaks: PlayerStreaks;
    comparisonPlayerName: string;
    comparisonPlayerStreaks: PlayerStreaks;
}

const PlayerStreakChart: React.FC<PlayerStreakChartProps> = (
    {
        playerName, playerStreaks, comparisonPlayerName, comparisonPlayerStreaks
    }) => {
    return (
        <ComparisonBarChart
            title="Most consecutive games where player"
            playerName={playerName}
            comparisonPlayerName={comparisonPlayerName}
            data={streakRows(playerStreakTypes, playerStreaks, comparisonPlayerStreaks)}
            renderTooltipContent={(row) => {
                const streakType = playerStreakTypes.find(streak => streak.name === row.name);
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

export default PlayerStreakChart;
