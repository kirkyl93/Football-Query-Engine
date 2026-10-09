export interface PieSlice {
    name: string;
    value: number;
    colour: string;
}

const slice = (name: string, value: number, colour: string): PieSlice => ({name, value, colour});

export const winDrawLossSlices = (wins: number, draws: number, losses: number): PieSlice[] => [
    slice("Win", wins, "green"),
    slice("Draw", draws, "yellow"),
    slice("Loss", losses, "red"),
];

export const goalsByGameSlices = (goalsByGame: number[]): PieSlice[] => [
    slice("No goals", goalsByGame[0], "red"),
    slice("1 goal", goalsByGame[1], "yellow"),
    slice("2 goals", goalsByGame[2], "green"),
    slice("3+ goals", goalsByGame[3], "gold"),
];

export const goalContributionSlices = (
    nonPenaltyGoals: number,
    penaltyGoals: number,
    assists: number,
    totalTeamGoals: number,
): PieSlice[] => [
    slice("Open play", nonPenaltyGoals, "blue"),
    slice("Penalties", penaltyGoals, "gold"),
    slice("Assists", assists, "green"),
    slice("Not involved", totalTeamGoals - nonPenaltyGoals - penaltyGoals - assists, "red"),
];

export const teamGoalsByGameSlices = (teamGoalsByGame: number[]): PieSlice[] => [
    slice("No goals", teamGoalsByGame[0], "red"),
    slice("1 goal", teamGoalsByGame[1], "yellow"),
    slice("2 goals", teamGoalsByGame[2], "green"),
    slice("3 goals", teamGoalsByGame[3], "blue"),
    slice("4 goals", teamGoalsByGame[4], "silver"),
    slice("5+ goals", teamGoalsByGame[5], "gold"),
];

export const teamGoalsConcededSlices = (teamGoalsConcededByGame: number[]): PieSlice[] => [
    slice("No goals", teamGoalsConcededByGame[0], "gold"),
    slice("1 goal", teamGoalsConcededByGame[1], "green"),
    slice("2 goals", teamGoalsConcededByGame[2], "yellow"),
    slice("3 goals", teamGoalsConcededByGame[3], "orange"),
    slice("4 goals", teamGoalsConcededByGame[4], "red"),
    slice("5+ goals", teamGoalsConcededByGame[5], "black"),
];

export const appearanceTypeSlices = (
    startedAndFinished: number,
    startedAndSubbed: number,
    subbedOnAndOff: number,
    subbedOnAndFinished: number,
): PieSlice[] => [
    slice("Full game", startedAndFinished, "green"),
    slice("Subbed off", startedAndSubbed, "yellow"),
    slice("Subbed on", subbedOnAndFinished, "#FFBF00"),
    slice("On and off", subbedOnAndOff, "red"),
];
