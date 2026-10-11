import { describe, expect, it } from 'vitest';
import { createDefaultPlayerStats, createDefaultPlayerStreaks } from '../../../types/Player';
import {
    appearanceTypeSlices,
    goalContributionSlices,
    goalsByGameSlices,
    teamGoalsByGameSlices,
    teamGoalsConcededSlices,
    winDrawLossSlices,
} from './pieChartData';
import { per90Rows, perGameRate, per90Rate, streakRows, teamStreakTypes } from './barChartData';

describe('pieChartData', () => {
    it('maps win/draw/loss slices', () => {
        expect(winDrawLossSlices(10, 5, 3)).toEqual([
            {name: "Win", value: 10, colour: "#16a34a"},
            {name: "Draw", value: 5, colour: "#eab308"},
            {name: "Loss", value: 3, colour: "#ef4444"},
        ]);
    });

    it('maps goals-by-game buckets', () => {
        expect(goalsByGameSlices([20, 10, 5, 2])).toEqual([
            {name: "No goals", value: 20, colour: "#cbd5e1"},
            {name: "1 goal", value: 10, colour: "#38bdf8"},
            {name: "2 goals", value: 5, colour: "#16a34a"},
            {name: "3+ goals", value: 2, colour: "#7c3aed"},
        ]);
    });

    it('derives the not-involved slice from team totals', () => {
        const slices = goalContributionSlices(20, 5, 10, 60);
        expect(slices[3]).toEqual({name: "Not involved", value: 25, colour: "#e2e8f0"});
    });

    it('maps team goals and conceded buckets', () => {
        expect(teamGoalsByGameSlices([1, 2, 3, 4, 5, 6])[5]).toEqual({name: "5+ goals", value: 6, colour: "#0ea5e9"});
        expect(teamGoalsConcededSlices([1, 2, 3, 4, 5, 6])[0]).toEqual({name: "No goals", value: 1, colour: "#16a34a"});
    });

    it('maps appearance-type buckets', () => {
        expect(appearanceTypeSlices(30, 5, 2, 3)).toEqual([
            {name: "Full game", value: 30, colour: "#16a34a"},
            {name: "Subbed off", value: 5, colour: "#f59e0b"},
            {name: "Subbed on", value: 3, colour: "#38bdf8"},
            {name: "On and off", value: 2, colour: "#ef4444"},
        ]);
    });
});

describe('streakRows', () => {
    it('maps streak counts for both players', () => {
        const player = createDefaultPlayerStreaks();
        player.longestWinningStreak.count = 4;
        const rows = streakRows(teamStreakTypes, player, createDefaultPlayerStreaks());

        expect(rows).toHaveLength(7);
        expect(rows[0]).toEqual({name: "won", player1: 4, player2: 0});
    });
});

describe('safePer90Rate', () => {
    it('computes a standard rate', () => {
        expect(per90Rate(900, 10)).toBe("1.00");
    });

    it('returns zero instead of NaN for empty data', () => {
        expect(per90Rate(0, 0)).toBe("0.00");
        expect(perGameRate(0, 0)).toBe("0.00");
    });

    it('returns zero when nothing was scored', () => {
        expect(per90Rate(900, 0)).toBe("0.00");
    });
});

describe('per90Rows', () => {
    it('maps all seven rows without NaN for empty comparison stats', () => {
        const stats = {...createDefaultPlayerStats(), totalMinutes: 900, totalPlayerGoalsExcludingPenalties: 9};
        const rows = per90Rows(stats, createDefaultPlayerStats());

        expect(rows).toHaveLength(7);
        expect(rows[0]).toEqual({name: "goals", player1: "0.90", player2: "0.00"});
        expect(rows.every(row => row.player1 !== "NaN" && row.player2 !== "NaN")).toBe(true);
    });
});
