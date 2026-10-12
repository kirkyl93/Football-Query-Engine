import {PlayerStats, PlayerStreaks} from "../../../types/Player";

export interface BarRow {
    name: string;
    player1: number | string;
    player2: number | string;
    /**
     * Semantic colour for the row (green = scored/won, red = lost/sent
     * off, yellow = booked …). Travels on the datum like pie slices do;
     * the chart renders it solid for player 1 and striped for player 2.
     */
    colour?: string;
}

export interface StreakType {
    name: string;
    key: keyof PlayerStreaks;
    colour: string;
}

export const teamStreakTypes: StreakType[] = [
    {name: "won", key: "longestWinningStreak", colour: "#22c55e"},
    {name: "didn't lose", key: "longestUnbeatenStreak", colour: "#84cc16"},
    {name: "lost", key: "longestLosingStreak", colour: "#ef4444"},
    {name: "scored", key: "longestTeamScoringStreak", colour: "#3b82f6"},
    {name: "didn't score", key: "longestTeamNotScoringStreak", colour: "#94a3b8"},
    {name: "kept a clean sheet", key: "longestCleanSheetStreak", colour: "#eab308"},
    {name: "didn't keep a clean sheet", key: "longestStreakWithoutCleanSheet", colour: "#f97316"}
];

export const playerStreakTypes: StreakType[] = [
    {name: "scored", key: "longestGoalStreak", colour: "#22c55e"},
    {name: "scored (excl. penalties)", key: "longestGoalStreakExcludingPenalties", colour: "#3b82f6"},
    {name: "didn't score", key: "longestGoalDrought", colour: "#94a3b8"},
    {name: "assisted", key: "longestAssistStreak", colour: "#14b8a6"},
    {name: "booked", key: "longestYellowStreak", colour: "#eab308"},
    {name: "sent off", key: "longestRedStreak", colour: "#ef4444"},
];

export const streakRows = (
    types: StreakType[],
    playerStreaks: PlayerStreaks,
    comparisonPlayerStreaks: PlayerStreaks,
): BarRow[] => types.map(type => ({
    name: type.name,
    player1: playerStreaks[type.key].count,
    player2: comparisonPlayerStreaks[type.key].count,
    colour: type.colour,
}));

export const per90Rate = (totalMinutes: number, count: number): number => {
    if (totalMinutes <= 0 || count <= 0) {
        return 0;
    }
    return Math.round((90 / (totalMinutes / count)) * 100) / 100;
};

export const perGameRate = (total: number, games: number): number => {
    if (games <= 0) {
        return 0;
    }
    return Math.round((total / games) * 100) / 100;
};

export const per90Rows = (playerStats: PlayerStats, comparisonPlayerStats: PlayerStats): BarRow[] => [
    {
        name: "goals",
        colour: "#22c55e",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerGoalsExcludingPenalties + playerStats.totalPenalties),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerGoalsExcludingPenalties + comparisonPlayerStats.totalPenalties),
    },
    {
        name: "goals (excl. penalties)",
        colour: "#84cc16",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerGoalsExcludingPenalties),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerGoalsExcludingPenalties),
    },
    {
        name: "assists",
        colour: "#3b82f6",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalPlayerAssists),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalPlayerAssists),
    },
    {
        name: "yellows",
        colour: "#eab308",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalYellows),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalYellows),
    },
    {
        name: "reds",
        colour: "#ef4444",
        player1: per90Rate(playerStats.totalMinutes, playerStats.totalReds),
        player2: per90Rate(comparisonPlayerStats.totalMinutes, comparisonPlayerStats.totalReds),
    },
    {
        name: "team goals",
        colour: "#6366f1",
        player1: perGameRate(playerStats.totalTeamGoals, playerStats.totalGames),
        player2: perGameRate(comparisonPlayerStats.totalTeamGoals, comparisonPlayerStats.totalGames),
    },
    {
        name: "team conceded",
        colour: "#94a3b8",
        player1: perGameRate(playerStats.totalTeamGoalsConceded, playerStats.totalGames),
        player2: perGameRate(comparisonPlayerStats.totalTeamGoalsConceded, comparisonPlayerStats.totalGames),
    },
];
