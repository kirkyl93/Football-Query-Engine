export interface PieSlice {
    name: string;
    value: number;
    colour: string;
}

const slice = (name: string, value: number, colour: string): PieSlice => ({name, value, colour});

export const winDrawLossSlices = (wins: number, draws: number, losses: number): PieSlice[] => [
    slice("Win", wins, "#16a34a"),
    slice("Draw", draws, "#eab308"),
    slice("Loss", losses, "#ef4444"),
];

export const goalsByGameSlices = (goalsByGame: number[]): PieSlice[] => [
    slice("No goals", goalsByGame[0], "#cbd5e1"),
    slice("1 goal", goalsByGame[1], "#38bdf8"),
    slice("2 goals", goalsByGame[2], "#16a34a"),
    slice("3+ goals", goalsByGame[3], "#7c3aed"),
];

export const goalContributionSlices = (
    nonPenaltyGoals: number,
    penaltyGoals: number,
    assists: number,
    totalTeamGoals: number,
): PieSlice[] => [
    slice("Open play", nonPenaltyGoals, "#2563eb"),
    slice("Penalties", penaltyGoals, "#f59e0b"),
    slice("Assists", assists, "#16a34a"),
    slice("Not involved", totalTeamGoals - nonPenaltyGoals - penaltyGoals - assists, "#e2e8f0"),
];

export const teamGoalsByGameSlices = (teamGoalsByGame: number[]): PieSlice[] => [
    slice("No goals", teamGoalsByGame[0], "#ef4444"),
    slice("1 goal", teamGoalsByGame[1], "#f59e0b"),
    slice("2 goals", teamGoalsByGame[2], "#10b981"),
    slice("3 goals", teamGoalsByGame[3], "#3b82f6"),
    slice("4 goals", teamGoalsByGame[4], "#8b5cf6"),
    slice("5+ goals", teamGoalsByGame[5], "#0ea5e9"),
];

export const teamGoalsConcededSlices = (teamGoalsConcededByGame: number[]): PieSlice[] => [
    slice("No goals", teamGoalsConcededByGame[0], "#16a34a"),
    slice("1 goal", teamGoalsConcededByGame[1], "#84cc16"),
    slice("2 goals", teamGoalsConcededByGame[2], "#eab308"),
    slice("3 goals", teamGoalsConcededByGame[3], "#f97316"),
    slice("4 goals", teamGoalsConcededByGame[4], "#ef4444"),
    slice("5+ goals", teamGoalsConcededByGame[5], "#7f1d1d"),
];

export const appearanceTypeSlices = (
    startedAndFinished: number,
    startedAndSubbed: number,
    subbedOnAndOff: number,
    subbedOnAndFinished: number,
): PieSlice[] => [
    slice("Full game", startedAndFinished, "#16a34a"),
    slice("Subbed off", startedAndSubbed, "#f59e0b"),
    slice("Subbed on", subbedOnAndFinished, "#38bdf8"),
    slice("On and off", subbedOnAndOff, "#ef4444"),
];
