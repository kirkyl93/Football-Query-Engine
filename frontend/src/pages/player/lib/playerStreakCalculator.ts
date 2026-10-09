import {
    PlayerAppearance,
    PlayerStreaks,
    Result,
} from "../../../types/Player";

type StreakWithTempDate = {
    current: number;
    longest: number;
    tempStartDate: string;
    startDate: string;
    endDate: string;
};

const createStreak = (): StreakWithTempDate => ({
    longest: 0,
    current: 0,
    startDate: "",
    endDate: "",
    tempStartDate: ""
});

const updateStreak = (streak: StreakWithTempDate, condition: boolean, date: string) => {
    if (condition) {
        if (streak.current === 0) streak.tempStartDate = date;
        streak.current++;
        if (streak.current > streak.longest) {
            streak.longest = streak.current;
            streak.startDate = streak.tempStartDate;
            streak.endDate = date;
        }
    } else {
        streak.current = 0;
        streak.tempStartDate = "";
    }
};

/**
 * Computes longest/current streaks (goals, clean sheets, W/D/L, cards…)
 * across appearances in order.
 */
export const calculatePlayerStreaks = (appearances: PlayerAppearance[]): PlayerStreaks => {

    const streaks = {
        goal: createStreak(),
        goalExcludingPenalties: createStreak(),
        noGoal: createStreak(),
        assist: createStreak(),
        cleanSheet: createStreak(),
        withoutCleanSheet: createStreak(),
        teamScoring: createStreak(),
        teamNotScoring: createStreak(),
        winning: createStreak(),
        losing: createStreak(),
        unbeaten: createStreak(),
        yellow: createStreak(),
        red: createStreak()
    };

    appearances.forEach((appearance) => {
        const atHome = appearance.club_id === appearance.home_club_id;

        const result = appearance.home_club_goals === appearance.away_club_goals
            ? Result.DRAW
            : (atHome === (appearance.home_club_goals > appearance.away_club_goals) ? Result.WIN : Result.LOSS);

        const conditions = {
            goal: appearance.goals > 0,
            goalExcludingPenalties: appearance.goal_minutes.length > 0,
            noGoal: appearance.goals === 0,
            assist: appearance.assists > 0,
            yellow: appearance.yellow_minutes.length > 0,
            red: appearance.yellow_minutes.length > 1 || appearance.red_cards > 0,
            teamScoring: atHome ? appearance.home_club_goals > 0 : appearance.away_club_goals > 0,
            teamNotScoring: atHome ? appearance.home_club_goals === 0 : appearance.away_club_goals === 0,
            cleanSheet: atHome ? appearance.away_club_goals === 0 : appearance.home_club_goals === 0,
            withoutCleanSheet: atHome ? appearance.away_club_goals > 0 : appearance.home_club_goals > 0,
            winning: result === Result.WIN,
            losing: result === Result.LOSS,
            unbeaten: result !== Result.LOSS
        };

        Object.entries(conditions).forEach(([key, condition]) => {
            updateStreak(streaks[key as keyof typeof streaks], condition, appearance.date);
        });
    });

    const mapStreaks = (streaks: Record<string, StreakWithTempDate>) => {
        const keys = {
            longestWinningStreak: "winning",
            longestUnbeatenStreak: "unbeaten",
            longestLosingStreak: "losing",
            longestTeamScoringStreak: "teamScoring",
            longestTeamNotScoringStreak: "teamNotScoring",
            longestCleanSheetStreak: "cleanSheet",
            longestStreakWithoutCleanSheet: "withoutCleanSheet",
            longestGoalStreak: "goal",
            longestGoalStreakExcludingPenalties: "goalExcludingPenalties",
            longestGoalDrought: "noGoal",
            longestAssistStreak: "assist",
            longestYellowStreak: "yellow",
            longestRedStreak: "red"
        } as const;

        return Object.fromEntries(
            Object.entries(keys).map(([key, value]) => [
                key,
                {
                    count: streaks[value].longest,
                    startDate: streaks[value].startDate,
                    endDate: streaks[value].endDate
                }
            ])
        ) as PlayerStreaks;
    };

    return mapStreaks(streaks);
};
