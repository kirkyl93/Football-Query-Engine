import React from "react";
import {PlayerStats, PlayerStreaks} from "../../../types/Player";
import TeamStreakChart from "./TeamStreakChart";
import PlayerStreakChart from "./PlayerStreakChart";
import Per90Chart from "./Per90Chart";
import PlayerWinPercentageChart from "./PlayerWinPercentageChart";
import GoalsByGameChart from "./GoalsByGameChart";
import GoalAndAssistContributionChart from "./GoalAndAssistContributionChart";
import TeamGoalsByGameChart from "./TeamGoalsByGameChart";
import TeamGoalsConcededByGameChart from "./TeamGoalsConcededByGameChart";
import SubbedOnAndOffChart from "./SubbedOnAndOffChart";

export const FOCUS_BAR_HEIGHT = 480;
export const FOCUS_PIE_HEIGHT = 340;

export interface StatDef {
    id: string;
    title: string;
    kind: 'bar' | 'pie';
    render: (height: number) => React.ReactNode;
}

export interface StatDefArgs {
    playerName: string;
    comparisonPlayerName: string;
    stats: PlayerStats;
    comparisonStats: PlayerStats;
    playerStreaks: PlayerStreaks;
    comparisonPlayerStreaks: PlayerStreaks;
}

export interface StatGroup {
    id: 'streaks' | 'player' | 'team';
    title: string;
    subtitle: string;
    chartIds: string[];
}

export const STAT_GROUPS: StatGroup[] = [
    {
        id: 'streaks',
        title: 'Streak charts',
        subtitle: 'Consecutive games, team and player',
        chartIds: ['team-streaks', 'player-streaks'],
    },
    {
        id: 'player',
        title: 'Player charts',
        subtitle: 'Per-90, goals and appearances',
        chartIds: ['per90', 'goals-by-game', 'goal-contribution', 'appearance-type'],
    },
    {
        id: 'team',
        title: 'Team charts',
        subtitle: 'Results and goals with you in the side',
        chartIds: ['win-pct', 'team-goals', 'team-conceded'],
    },
];

/**
 * Shared stat chart registry. Level-0 tiles preview from these defs and
 * open single charts fullscreen; each chart also renders fullscreen from
 * the same def. Small charts are stateless (pure functions of props), so
 * re-rendering at another height loses nothing.
 */
export const buildStatDefs = ({
    playerName,
    comparisonPlayerName,
    stats,
    comparisonStats,
    playerStreaks,
    comparisonPlayerStreaks,
}: StatDefArgs): StatDef[] => [
    {
        id: 'team-streaks', title: 'Team streaks', kind: 'bar',
        render: (height) => (
            <TeamStreakChart
                playerName={playerName}
                playerStreaks={playerStreaks}
                comparisonPlayerName={comparisonPlayerName}
                comparisonPlayerStreaks={comparisonPlayerStreaks}
                height={height}
            />
        ),
    },
    {
        id: 'player-streaks', title: 'Player streaks', kind: 'bar',
        render: (height) => (
            <PlayerStreakChart
                playerName={playerName}
                playerStreaks={playerStreaks}
                comparisonPlayerName={comparisonPlayerName}
                comparisonPlayerStreaks={comparisonPlayerStreaks}
                height={height}
            />
        ),
    },
    {
        id: 'per90', title: 'Per 90', kind: 'bar',
        render: (height) => (
            <Per90Chart
                playerName={playerName}
                playerStats={stats}
                comparisonPlayerName={comparisonPlayerName}
                comparisonPlayerStats={comparisonStats}
                height={height}
            />
        ),
    },
    {
        id: 'win-pct', title: 'Win percentage', kind: 'pie',
        render: (height) => (
            <PlayerWinPercentageChart
                playerName={playerName}
                wins={stats.totalWins}
                draws={stats.totalDraws}
                losses={stats.totalLosses}
                comparisonPlayerName={comparisonPlayerName}
                comparisonWins={comparisonStats.totalWins}
                comparisonDraws={comparisonStats.totalDraws}
                comparisonLosses={comparisonStats.totalLosses}
                height={height}
            />
        ),
    },
    {
        id: 'goals-by-game', title: 'Goals by game', kind: 'pie',
        render: (height) => (
            <GoalsByGameChart
                playerName={playerName}
                goalsByGame={stats.playerGoalsByGame}
                comparisonPlayerName={comparisonPlayerName}
                comparisonGoalsByGame={comparisonStats.playerGoalsByGame}
                height={height}
            />
        ),
    },
    {
        id: 'goal-contribution', title: 'Team goals contributed to', kind: 'pie',
        render: (height) => (
            <GoalAndAssistContributionChart
                playerName={playerName}
                nonPenaltyGoals={stats.totalPlayerGoalsExcludingPenalties}
                penaltyGoals={stats.totalPenalties}
                assists={stats.totalPlayerAssists}
                totalTeamGoals={stats.totalTeamGoals}
                comparisonPlayerName={comparisonPlayerName}
                comparisonNonPenaltyGoals={comparisonStats.totalPlayerGoalsExcludingPenalties}
                comparisonPenaltyGoals={comparisonStats.totalPenalties}
                comparisonAssists={comparisonStats.totalPlayerAssists}
                comparisonTotalTeamGoals={comparisonStats.totalTeamGoals}
                height={height}
            />
        ),
    },
    {
        id: 'team-goals', title: 'Team goals by game', kind: 'pie',
        render: (height) => (
            <TeamGoalsByGameChart
                playerName={playerName}
                teamGoalsByGame={stats.teamGoalsByGame}
                comparisonPlayerName={comparisonPlayerName}
                comparisonTeamGoalsByGame={comparisonStats.teamGoalsByGame}
                height={height}
            />
        ),
    },
    {
        id: 'team-conceded', title: 'Team goals conceded by game', kind: 'pie',
        render: (height) => (
            <TeamGoalsConcededByGameChart
                playerName={playerName}
                teamGoalsConcededByGame={stats.teamGoalsConcededByGame}
                comparisonPlayerName={comparisonPlayerName}
                comparisonTeamGoalsConcededByGame={comparisonStats.teamGoalsConcededByGame}
                height={height}
            />
        ),
    },
    {
        id: 'appearance-type', title: 'Appearance by type', kind: 'pie',
        render: (height) => (
            <SubbedOnAndOffChart
                playerName={playerName}
                startedAndFinished={stats.gamesStartedAndFinished}
                startedAndSubbed={stats.gamesStartedAndSubbedOff}
                subbedOnAndOff={stats.gamesSubbedOnAndSubbedOff}
                subbedOnAndFinished={stats.gamesSubbedOnAndFinished}
                comparisonPlayerName={comparisonPlayerName}
                comparisonStartedAndFinished={comparisonStats.gamesStartedAndFinished}
                comparisonStartedAndSubbed={comparisonStats.gamesStartedAndSubbedOff}
                comparisonSubbedOnAndOff={comparisonStats.gamesSubbedOnAndSubbedOff}
                comparisonSubbedOnAndFinished={comparisonStats.gamesSubbedOnAndFinished}
                height={height}
            />
        ),
    },
];
