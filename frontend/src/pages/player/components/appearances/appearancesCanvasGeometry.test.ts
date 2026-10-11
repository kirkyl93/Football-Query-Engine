import { describe, expect, it } from 'vitest';
import type { PlayerAppearance } from '../../../../types/Player';
import {
    barCenterX,
    barFillAndStrokeAlpha,
    barWidthForSlot,
    clampOpacity,
    gameIndexAtX,
    gameTicks,
    isCleanSheet,
    minuteTicks,
    plotFrameForSize,
    slotWidthForCount,
    squareMarkerSize,
    yForMinute,
} from './appearancesCanvasGeometry';

const frame = plotFrameForSize(1400, 360);

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 1,
    club_id: 1,
    home_club_id: 1,
    home_club_name: 'Home',
    away_club_id: 2,
    away_club_name: 'Away',
    competition_id: 'GB1',
    competition_name: 'Premier League',
    competition_type: 'League',
    date: '2025-08-01',
    season: 2025,
    goals: 0,
    penalty_goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 2,
    away_club_goals: 0,
    goal_minutes: [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: 'Win',
    ...overrides,
});

describe('appearancesCanvasGeometry', () => {
    it('reserves the axis margins from the container size', () => {
        expect(frame.plotLeft).toBe(64);
        expect(frame.plotTop).toBe(20);
        expect(frame.plotWidth).toBe(1400 - 64 - 20);
        expect(frame.plotTop + frame.plotHeight).toBe(261);
    });

    it('lays bars out evenly and hit-tests them exactly', () => {
        const count = 37;
        for (let i = 0; i < count; i++) {
            const cx = barCenterX(i, frame, count);
            // The pixel at each bar centre must hit-test back to that bar.
            expect(gameIndexAtX(cx, frame, count)).toBe(i);
            // So must pixels just inside either edge of its slot.
            const slot = slotWidthForCount(frame.plotWidth, count);
            expect(gameIndexAtX(cx - slot / 2 + 1, frame, count)).toBe(i);
            expect(gameIndexAtX(cx + slot / 2 - 1, frame, count)).toBe(i);
        }
    });

    it('caps bar width at the slot so bars never overlap', () => {
        expect(barWidthForSlot(20, 35)).toBe(20);
        expect(barWidthForSlot(20, 10)).toBe(10);
        expect(barWidthForSlot(0.7, 1.2)).toBe(0.7);
        expect(barWidthForSlot(20, 0)).toBe(0);
    });

    it('sizes markers from the density curve, capped at the bar, floored at the minimum', () => {
        // At 39 games the sized width is ~10.3
        expect(squareMarkerSize(10.3, 18.2)).toBeCloseTo(10.3, 5);
        expect(squareMarkerSize(11, 20)).toBe(11);
        // Narrow bars cap the marker instead of letting it overflow.
        expect(squareMarkerSize(10.3, 8)).toBe(8);
        expect(squareMarkerSize(10.3, 0.7)).toBe(5);
        expect(squareMarkerSize(3.5, 0.7)).toBe(5);
        expect(squareMarkerSize(11, 0)).toBe(5);
    });

    it('boosts clean-sheet fills and every border uniformly', () => {
        expect(barFillAndStrokeAlpha(1, true)).toEqual({fill: 1, stroke: 1});
        expect(barFillAndStrokeAlpha(0.25, true)).toEqual({fill: 0.6, stroke: 0.6});
        expect(barFillAndStrokeAlpha(0.25, false)).toEqual({fill: 0.25, stroke: 0.6});
        expect(barFillAndStrokeAlpha(Number.NaN, true)).toEqual({fill: 1, stroke: 1});
    });

    it('clamps hit-testing outside the plot and handles empty data', () => {
        expect(gameIndexAtX(-1000, frame, 37)).toBe(0);
        expect(gameIndexAtX(100000, frame, 37)).toBe(36);
        expect(gameIndexAtX(500, frame, 0)).toBe(-1);
    });

    it('maps minutes linearly within the y-domain', () => {
        const top = yForMinute(90, [0, 90], frame);
        const bottom = yForMinute(0, [0, 90], frame);
        expect(top).toBe(frame.plotTop);
        expect(bottom).toBe(frame.plotTop + frame.plotHeight);
        expect(yForMinute(45, [0, 90], frame)).toBeCloseTo((top + bottom) / 2, 5);
        // Result dots below the axis extrapolate past the plot bottom.
        expect(yForMinute(-10, [0, 90], frame)).toBeGreaterThan(bottom);
    });

    it('detects clean sheets with the same rule as the SVG shape', () => {
        expect(isCleanSheet(game(), true)).toBe(true);
        expect(isCleanSheet(game({away_club_goals: 2}), true)).toBe(false);
        expect(isCleanSheet(game(), false)).toBe(false);
        // Away side keeps a clean sheet when the hosts score nothing.
        expect(isCleanSheet(game({club_id: 2, home_club_goals: 0}), true)).toBe(true);
    });

    it('picks a readable handful of game ticks', () => {
        const ticks = gameTicks(1, 600);
        expect(ticks.length).toBeLessThanOrEqual(11);
        expect(ticks[0]).toBe(1);
        expect(ticks[ticks.length - 1]).toBe(600);
        expect(gameTicks(5, 5)).toEqual([5]);
        expect(gameTicks(10, 1)).toEqual([]);
    });

    it('picks round minute ticks', () => {
        expect(minuteTicks(90)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
        expect(minuteTicks(120)[0]).toBe(0);
    });

    it('clamps opacity into canvas range', () => {
        expect(clampOpacity(3)).toBe(1);
        expect(clampOpacity(-0.5)).toBe(0);
        expect(clampOpacity(0.6)).toBe(0.6);
        expect(clampOpacity(Number.NaN)).toBe(1);
    });
});
