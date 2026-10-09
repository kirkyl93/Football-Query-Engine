import React from "react";
import {AppearancesChart} from "./AppearancesChart";
import {PlayerAppearance, PlayerStats, PlayerStreaks} from "../../../types/Player";
import TeamStreakChart from "./TeamStreakChart";
import PlayerStreakChart from "./PlayerStreakChart";
import Per90Chart from "./Per90Chart";
import PlayerWinPercentageChart from "./PlayerWinPercentageChart";
import GoalsByGameChart from "./GoalsByGameChart";
import GoalAndAssistContributionChart from "./GoalAndAssistContributionChart";
import TeamGoalsByGameChart from "./TeamGoalsByGameChart";
import TeamGoalsConcededByGameChart from "./TeamGoalsConcededByGameChart";
import SubbedOnAndOffChart from "./SubbedOnAndOffChart";

const AppearancesChartMemo = React.memo(AppearancesChart);

interface PlayerChartsGridProps {
    playerLastName: string;
    playerGameData: PlayerAppearance[];
    comparisonPlayerName: string;
    comparisonPlayerGameData: PlayerAppearance[];
    stats: PlayerStats;
    comparisonStats: PlayerStats;
    playerStreaks: PlayerStreaks;
    comparisonPlayerStreaks: PlayerStreaks;
    onZoomChange: (data: PlayerAppearance[]) => void;
    onComparisonZoomChange: (data: PlayerAppearance[]) => void;
}

const PlayerChartsGrid: React.FC<PlayerChartsGridProps> = ({
    playerLastName,
    playerGameData,
    comparisonPlayerName,
    comparisonPlayerGameData,
    stats,
    comparisonStats,
    playerStreaks,
    comparisonPlayerStreaks,
    onZoomChange,
    onComparisonZoomChange,
}) => {
    return (
        <>
            <div className="graph">
                <AppearancesChartMemo
                    playerName={""} data={playerGameData} onZoomChange={onZoomChange}/>
                {comparisonPlayerGameData.length > 0 &&
                    <AppearancesChartMemo
                        playerName={comparisonPlayerName} data={comparisonPlayerGameData}
                        onZoomChange={onComparisonZoomChange}/>
                }
            </div>
            <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
                <TeamStreakChart
                    playerName={playerLastName}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                />
                <PlayerStreakChart
                    playerName={playerLastName}
                    playerStreaks={playerStreaks}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStreaks={comparisonPlayerStreaks}
                />
                <Per90Chart
                    playerName={playerLastName}
                    playerStats={stats}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonPlayerStats={comparisonStats}
                />
            </div>
            <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
                <PlayerWinPercentageChart
                    playerName={playerLastName}
                    wins={stats.totalWins}
                    draws={stats.totalDraws}
                    losses={stats.totalLosses}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonWins={comparisonStats.totalWins}
                    comparisonDraws={comparisonStats.totalDraws}
                    comparisonLosses={comparisonStats.totalLosses}
                />
                <GoalsByGameChart
                    playerName={playerLastName}
                    goalsByGame={stats.playerGoalsByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonGoalsByGame={comparisonStats.playerGoalsByGame}
                />
                <GoalAndAssistContributionChart
                    playerName={playerLastName}
                    nonPenaltyGoals={stats.totalPlayerGoalsExcludingPenalties}
                    penaltyGoals={stats.totalPenalties}
                    assists={stats.totalPlayerAssists}
                    totalTeamGoals={stats.totalTeamGoals}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonNonPenaltyGoals={comparisonStats.totalPlayerGoalsExcludingPenalties}
                    comparisonPenaltyGoals={comparisonStats.totalPenalties}
                    comparisonAssists={comparisonStats.totalPlayerAssists}
                    comparisonTotalTeamGoals={comparisonStats.totalTeamGoals}
                />
                <TeamGoalsByGameChart
                    playerName={playerLastName}
                    teamGoalsByGame={stats.teamGoalsByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonTeamGoalsByGame={comparisonStats.teamGoalsByGame}
                />
                <TeamGoalsConcededByGameChart
                    playerName={playerLastName}
                    teamGoalsConcededByGame={stats.teamGoalsConcededByGame}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonTeamGoalsConcededByGame={comparisonStats.teamGoalsConcededByGame}
                />
                <SubbedOnAndOffChart
                    playerName={playerLastName}
                    startedAndFinished={stats.gamesStartedAndFinished}
                    startedAndSubbed={stats.gamesStartedAndSubbedOff}
                    subbedOnAndOff={stats.gamesSubbedOnAndSubbedOff}
                    subbedOnAndFinished={stats.gamesSubbedOnAndFinished}
                    comparisonPlayerName={comparisonPlayerName}
                    comparisonStartedAndFinished={comparisonStats.gamesStartedAndFinished}
                    comparisonStartedAndSubbed={comparisonStats.gamesStartedAndSubbedOff}
                    comparisonSubbedOnAndOff={comparisonStats.gamesSubbedOnAndSubbedOff}
                    comparisonSubbedOnAndFinished={comparisonStats.gamesSubbedOnAndFinished}
                />
            </div>
        </>
    );
};

export default PlayerChartsGrid;
