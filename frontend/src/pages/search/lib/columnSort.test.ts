import { describe, expect, it } from 'vitest';
import {
    SORT_ARROWS,
    SORT_DIRECTIONS,
} from './columnSort';
import { SortOptions } from '../../../types/SearchOptions';

describe('SORT_DIRECTIONS', () => {
    it('is descending for the standard stat sorts', () => {
        expect(SORT_DIRECTIONS[SortOptions.GOALS]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.ASSISTS]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.GOALS_AND_ASSISTS]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.APPEARANCES]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PLAYED]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.YELLOW_CARDS]).toBe('desc');
        expect(SORT_DIRECTIONS[SortOptions.RED_CARDS]).toBe('desc');
    });

    it('is ascending for the minutes-per-event sorts', () => {
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PER_GOAL]).toBe('asc');
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PER_ASSIST]).toBe('asc');
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PER_GOAL_OR_ASSIST]).toBe('asc');
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PER_YELLOW]).toBe('asc');
        expect(SORT_DIRECTIONS[SortOptions.MINUTES_PER_RED]).toBe('asc');
    });

    it('maps directions to arrows', () => {
        expect(SORT_ARROWS.desc).toBe('▼');
        expect(SORT_ARROWS.asc).toBe('▲');
    });
});
