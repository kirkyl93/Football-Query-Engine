import {PlayerStats, PlayerStreaks} from "../../../types/Player";

export interface BarRow {
    name: string;
    player1: number | string;
    player2: number | string;
}

export interface StreakType {
    name: string;
    key: keyof PlayerStreaks;
}

export const teamStreakTypes: StreakType[] = [
    {name: "won", key: "longestWinningStreak"},
    {name: "didn't lose", key: "longestUnbeatenStreak"},
    {name: "lost", key: "longestLosingStreak"},
    {name: "scored", key: "longestTeamScoringStreak"},
    {name: "didn't score", key: "longestTeamNotScoringStreak"},
    {name: "kept a clean sheet", key: "longestCleanSheetStreak"},
    {name: "didn't keep a clean sheet", key: "longestStreakWithoutCleanSheet"}
];

export const playerStreakTypes: StreakType[] = [
    {name: "scored", key: "longestGoalStreak"},
    {name: "scored (excl. penalties)", key: "longestGoalStreakExcludingPenalties"},
    {name: "didn't score", key: "longestGoalDrought"},
    {name: "assisted", key: "longestAssistStreak"},
    {name: "booked", key: "longestYellowStreak"},
    {name: "sent off", key: "longestRedStreak"},
];

export const streakRows = (
    types: StreakType[],
    playerStreaks: PlayerStreaks,
    comparisonPlayerStreaks: PlayerStreaks,
): BarRow[] => types.map(type => ({
    name: type.name,
    player1: playerStreaks[type.key].count,
    player2: comparisonPlayerStreaks[type.key].count,
}));

export const per90Rate = (totalMinutes: number, count: number): string => {
    if (totalMinutes <= 0 || count <= 0) {
        return "0.00";
    }
    return (90 / (totalMinutes / count)).toFixed(2);
};

export const perGameRate = (total: number, games: number): string => {
    if (games <= 0) {
        return "0.00";
    }
    return (total / games).toFixed(2);
};

export const per90Rows = (playerStats: PlayerStats, comparisonPlayerStats: PlayerStats): BarRow[] => [
    {
        name: "goals",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerGoalsExcludingPenalties + playerStats.totalPenalties),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerGoalsExcludingPenalties + comparisonPlayerStats.totalPenalties),
    },
    {
        name: "goals (excl. penalties)",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerGoalsExcludingPenalties),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerGoalsExcludingPenalties),
    },
    {
        name: "assists",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerAssists),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerAssists),
    },
    {
        name: "yellows",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalYellows),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalYellows),
    },
    {
        name: "reds",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalReds),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalReds),
    },
    {
        name: "team goals",
        player1: perGameRate(playerStats.totalTeamGoals, playerStats.totalGames),
        player2: perGameRate(comparisonPlayerStats.totalTeamGoals, comparisonPlayerStats.totalGames),
    },
    {
        name: "team conceded",
        player1: perGameRate(playerStats.totalTeamGoalsConceded, playerStats.totalGames),
        player2: perGameRate(comparisonPlayerStats.totalTeamGoalsConceded, comparisonPlayerStats.totalGames),
    },
];
