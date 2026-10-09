import React from "react";
import ComparisonPieChart from "./charts/ComparisonPieChart";
import {goalContributionSlices} from "../lib/pieChartData";


interface GoalAndAssistContributionProps {
    playerName: string;
    nonPenaltyGoals: number;
    penaltyGoals: number;
    assists: number;
    totalTeamGoals: number;
    comparisonPlayerName: string;
    comparisonNonPenaltyGoals: number;
    comparisonPenaltyGoals: number;
    comparisonAssists: number;
    comparisonTotalTeamGoals: number;
}

const GoalAndAssistContributionChart: React.FC<GoalAndAssistContributionProps> = (
    {
        playerName, nonPenaltyGoals, penaltyGoals, assists, totalTeamGoals, comparisonPlayerName,
        comparisonNonPenaltyGoals, comparisonPenaltyGoals, comparisonAssists, comparisonTotalTeamGoals
    }) => {
    return (
        <ComparisonPieChart
            title="Team goals contributed to"
            playerName={playerName}
            playerSlices={goalContributionSlices(nonPenaltyGoals, penaltyGoals, assists, totalTeamGoals)}
            comparisonPlayerName={comparisonPlayerName}
            comparisonSlices={goalContributionSlices(
                comparisonNonPenaltyGoals, comparisonPenaltyGoals, comparisonAssists, comparisonTotalTeamGoals,
            )}
        />
    )
}

export default GoalAndAssistContributionChart;
