import { describe, expect, it } from 'vitest';
import { PlayerAppearance } from '../../../types/Player';
import { calculatePlayerAndTeamStats } from './playerStatsCalculator';
import { calculatePlayerStreaks } from './playerStreakCalculator';

const baseAppearance: PlayerAppearance = {
    game_number: 1,
    club_id: 1,
    home_club_id: 1,
    home_club_name: 'Home',
    away_club_id: 2,
    away_club_name: 'Away',
    competition_id: 'GB1',
    competition_name: 'Premier League',
    competition_type: 'domestic',
    date: '2025-08-01',
    season: 2025,
    goals: 0,
    penalty_goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 0,
    away_club_goals: 0,
    goal_minutes: [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: 'W',
};

const scoringStart = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    ...baseAppearance,
    goals: 1,
    goal_minutes: [23],
    home_club_goals: 2,
    away_club_goals: 0,
    ...overrides,
});

describe('calculatePlayerAndTeamStats', () => {
    it('aggregates games, results and goals', () => {
        const stats = calculatePlayerAndTeamStats([
            scoringStart({date: '2025-08-01'}),
            scoringStart({date: '2025-08-08', goals: 2, goal_minutes: [10, 80], home_club_goals: 1, away_club_goals: 1}),
        ]);

        expect(stats.totalGames).toBe(2);
        expect(stats.totalWins).toBe(1);
        expect(stats.totalDraws).toBe(1);
        expect(stats.totalLosses).toBe(0);
        expect(stats.gamesStartedAndFinished).toBe(2);
        expect(stats.totalMinutes).toBe(180);
        expect(stats.totalPlayerGoalsExcludingPenalties).toBe(3);
        expect(stats.totalTeamGoals).toBe(3);
    });

    it('counts a second yellow as a red', () => {
        const stats = calculatePlayerAndTeamStats([
            {...baseAppearance, yellow_minutes: [30, 70]},
        ]);

        expect(stats.totalYellows).toBe(2);
        expect(stats.totalReds).toBe(1);
    });

    it('classifies all four starter/finisher buckets', () => {
        const stats = calculatePlayerAndTeamStats([
            {...baseAppearance, minutes_played: [0, 90], subbed_off_minute: 0},
            {...baseAppearance, minutes_played: [0, 65], subbed_off_minute: 65},
            {...baseAppearance, minutes_played: [60, 90], subbed_off_minute: 0},
            {...baseAppearance, minutes_played: [60, 75], subbed_off_minute: 75},
        ]);

        expect(stats.totalGames).toBe(4);
        expect(stats.gamesStartedAndFinished).toBe(1);
        expect(stats.gamesStartedAndSubbedOff).toBe(1);
        expect(stats.gamesSubbedOnAndFinished).toBe(1);
        expect(stats.gamesSubbedOnAndSubbedOff).toBe(1);
        expect(stats.totalMinutes).toBe(90 + 65 + 30 + 15);
    });

    it('attributes team goals to the away side correctly', () => {
        const stats = calculatePlayerAndTeamStats([
            {
                ...baseAppearance,
                club_id: 2,
                home_club_goals: 1,
                away_club_goals: 3,
            },
        ]);

        expect(stats.totalWins).toBe(1);
        expect(stats.totalTeamGoals).toBe(3);
        expect(stats.totalTeamGoalsConceded).toBe(1);
    });

    it('separates penalties, assists and cards', () => {
        const stats = calculatePlayerAndTeamStats([
            {
                ...baseAppearance,
                goals: 2,
                penalty_goals: 1,
                goal_minutes: [10],
                penalty_goal_minutes: [80],
                assists: 1,
                assist_minutes: [30],
                yellow_cards: 1,
                yellow_minutes: [50],
                red_cards: 0,
                red_minutes: [85],
            },
        ]);

        expect(stats.totalPlayerGoalsExcludingPenalties).toBe(1);
        expect(stats.totalPenalties).toBe(1);
        expect(stats.totalPlayerAssists).toBe(1);
        expect(stats.totalYellows).toBe(1);
        expect(stats.totalReds).toBe(1);
    });

    it('caps per-game buckets at the last bucket', () => {
        const stats = calculatePlayerAndTeamStats([
            {...baseAppearance, goals: 5, home_club_goals: 5, away_club_goals: 0},
        ]);

        expect(stats.playerGoalsByGame).toEqual([0, 0, 0, 1]);
        expect(stats.teamGoalsByGame[5]).toBe(1);
        expect(stats.teamGoalsConcededByGame[0]).toBe(1);
    });

    it('distributes goals and assists into 15-minute buckets', () => {
        const stats = calculatePlayerAndTeamStats([
            {
                ...baseAppearance,
                goal_minutes: [5, 23, 46, 120],
                assist_minutes: [70],
            },
        ]);

        expect(stats.playerGoalsByMinute).toEqual([1, 1, 0, 1, 0, 0, 1]);
        expect(stats.playerAssistsByMinute).toEqual([0, 0, 0, 0, 1, 0, 0]);
    });

    it('spreads minutes played across interval buckets', () => {
        const fullGame = calculatePlayerAndTeamStats([{...baseAppearance, minutes_played: [0, 90]}]);
        expect(fullGame.playerAppearancesByMinute).toEqual([15, 15, 15, 15, 15, 15, 0]);

        const substitute = calculatePlayerAndTeamStats([{...baseAppearance, minutes_played: [60, 90]}]);
        expect(substitute.playerAppearancesByMinute).toEqual([0, 0, 0, 0, 15, 15, 0]);
    });

    it('returns defaults for an empty game log', () => {
        const stats = calculatePlayerAndTeamStats([]);

        expect(stats.totalGames).toBe(0);
        expect(stats.totalWins).toBe(0);
        expect(stats.totalPlayerGoalsExcludingPenalties).toBe(0);
        expect(stats.playerGoalsByGame).toEqual([0, 0, 0, 0]);
    });
});

describe('calculatePlayerStreaks', () => {
    it('tracks goal streaks across games in order', () => {
        const streaks = calculatePlayerStreaks([
            scoringStart({date: '2025-08-01'}),
            scoringStart({date: '2025-08-08'}),
            {...baseAppearance, date: '2025-08-15'},
        ]);

        expect(streaks.longestGoalStreak.count).toBe(2);
        expect(streaks.longestGoalStreak.startDate).toBe('2025-08-01');
        expect(streaks.longestGoalStreak.endDate).toBe('2025-08-08');
        expect(streaks.longestGoalDrought.count).toBe(1);
    });

    it('tracks unbeaten runs including draws', () => {
        const win = scoringStart({date: '2025-08-01', home_club_goals: 2, away_club_goals: 0});
        const draw = scoringStart({date: '2025-08-08', goals: 0, goal_minutes: [], home_club_goals: 1, away_club_goals: 1});
        const loss = scoringStart({date: '2025-08-15', goals: 0, goal_minutes: [], home_club_goals: 0, away_club_goals: 1});
        const streaks = calculatePlayerStreaks([win, draw, loss, {...win, date: '2025-08-22'}]);

        expect(streaks.longestUnbeatenStreak.count).toBe(2);
        expect(streaks.longestWinningStreak.count).toBe(1);
        expect(streaks.longestLosingStreak.count).toBe(1);
        expect(streaks.longestLosingStreak.startDate).toBe('2025-08-15');
    });

    it('tracks clean sheets and scoring streaks with dates', () => {
        const streaks = calculatePlayerStreaks([
            scoringStart({date: '2025-08-01', home_club_goals: 2, away_club_goals: 0}),
            scoringStart({date: '2025-08-08', home_club_goals: 1, away_club_goals: 0}),
            scoringStart({date: '2025-08-15', goals: 0, goal_minutes: [], home_club_goals: 2, away_club_goals: 1}),
        ]);

        expect(streaks.longestCleanSheetStreak.count).toBe(2);
        expect(streaks.longestCleanSheetStreak.startDate).toBe('2025-08-01');
        expect(streaks.longestCleanSheetStreak.endDate).toBe('2025-08-08');
        expect(streaks.longestStreakWithoutCleanSheet.count).toBe(1);
        expect(streaks.longestTeamScoringStreak.count).toBe(3);
    });

    it('tracks team-not-scoring runs', () => {
        const streaks = calculatePlayerStreaks([
            scoringStart({date: '2025-08-01', home_club_goals: 2, away_club_goals: 0}),
            {...baseAppearance, date: '2025-08-08', home_club_goals: 0, away_club_goals: 0},
            {...baseAppearance, date: '2025-08-15', home_club_goals: 0, away_club_goals: 1},
        ]);

        expect(streaks.longestTeamNotScoringStreak.count).toBe(2);
        expect(streaks.longestTeamNotScoringStreak.startDate).toBe('2025-08-08');
    });

    it('keeps penalty-only games in the goal streak but not the non-penalty streak', () => {
        const openPlay = scoringStart({date: '2025-08-01'});
        const penaltiesOnly = scoringStart({
            date: '2025-08-08',
            goal_minutes: [],
            penalty_goal_minutes: [50],
            penalty_goals: 1,
        });
        const streaks = calculatePlayerStreaks([openPlay, penaltiesOnly, {...openPlay, date: '2025-08-15'}]);

        expect(streaks.longestGoalStreak.count).toBe(3);
        expect(streaks.longestGoalStreakExcludingPenalties.count).toBe(1);
    });

    it('tracks assist, yellow and red streaks', () => {
        const assisted = (date: string): PlayerAppearance => ({
            ...baseAppearance,
            date,
            assists: 1,
            assist_minutes: [60],
        });
        const booked = (date: string): PlayerAppearance => ({
            ...baseAppearance,
            date,
            yellow_cards: 1,
            yellow_minutes: [40],
        });
        const sentOff = (date: string): PlayerAppearance => ({
            ...baseAppearance,
            date,
            red_cards: 1,
            red_minutes: [80],
        });
        const streaks = calculatePlayerStreaks([
            assisted('2025-08-01'),
            assisted('2025-08-08'),
            booked('2025-08-15'),
            booked('2025-08-22'),
            sentOff('2025-08-29'),
            {...baseAppearance, date: '2025-09-05'},
        ]);

        expect(streaks.longestAssistStreak.count).toBe(2);
        expect(streaks.longestYellowStreak.count).toBe(2);
        expect(streaks.longestRedStreak.count).toBe(1);
        expect(streaks.longestRedStreak.startDate).toBe('2025-08-29');
    });

    it('tracks multi-game goal droughts', () => {
        const streaks = calculatePlayerStreaks([
            scoringStart({date: '2025-08-01'}),
            {...baseAppearance, date: '2025-08-08'},
            {...baseAppearance, date: '2025-08-15'},
            {...baseAppearance, date: '2025-08-22'},
        ]);

        expect(streaks.longestGoalDrought.count).toBe(3);
        expect(streaks.longestGoalDrought.startDate).toBe('2025-08-08');
        expect(streaks.longestGoalDrought.endDate).toBe('2025-08-22');
    });
});
