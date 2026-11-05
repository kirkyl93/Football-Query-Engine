import {describe, expect, it} from 'vitest';
import {formatMinutesPerEvent, getDisplayStatForSmallScreen} from './smallScreenStat';
import {SortOptions} from '../../../types/SearchOptions';
import {PlayerSearchResult} from '../../../types/Player';

describe('minutes per event display', () => {
    it.each([
        [2.55, '2.6'], [64.35, '64.4'], [67.5, '67.5'], [450 / 7, '64.3'], [67.56, '67.6'],
        [90, '90.0'], [0, '0.0'], [null, '—'],
    ] as const)('formats %s as %s', (rate, expected) => {
        expect(formatMinutesPerEvent(rate)).toBe(expected);
    });

    it.each([
        [SortOptions.MINUTES_PER_GOAL, 'mins_per_goal'],
        [SortOptions.MINUTES_PER_ASSIST, 'mins_per_assist'],
        [SortOptions.MINUTES_PER_GOAL_OR_ASSIST, 'mins_per_goal_or_assist'],
        [SortOptions.MINUTES_PER_YELLOW, 'mins_per_yellow'],
        [SortOptions.MINUTES_PER_RED, 'mins_per_red'],
    ] as const)('formats the mobile and details value for %s', (sort, field) => {
        const player = {[field]: 450 / 7} as unknown as PlayerSearchResult;
        expect(getDisplayStatForSmallScreen(sort, player)).toBe('64.3');
        player[field] = null;
        expect(getDisplayStatForSmallScreen(sort, player)).toBe('—');
    });

    it('keeps event totals as integers', () => {
        const player = {total_goals: 7} as PlayerSearchResult;
        expect(getDisplayStatForSmallScreen(SortOptions.GOALS, player)).toBe(7);
    });
});
