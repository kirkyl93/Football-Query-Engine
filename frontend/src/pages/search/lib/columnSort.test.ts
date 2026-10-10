import { describe, expect, it } from 'vitest';
import {
    nextSortForColumn,
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

describe('nextSortForColumn', () => {
    it('selects the column sort when another sort is active', () => {
        expect(nextSortForColumn(SortOptions.GOALS, SortOptions.ASSISTS)).toBe(SortOptions.ASSISTS);
        expect(nextSortForColumn(SortOptions.YELLOW_CARDS, SortOptions.APPEARANCES)).toBe(
            SortOptions.APPEARANCES,
        );
    });

    it('returns the same sort when its own header is clicked', () => {
        expect(nextSortForColumn(SortOptions.ASSISTS, SortOptions.ASSISTS)).toBe(
            SortOptions.ASSISTS,
        );
    });

    it('cycles Goals -> Goals+Assists -> Goals on repeat clicks', () => {
        expect(nextSortForColumn(SortOptions.GOALS, SortOptions.GOALS)).toBe(
            SortOptions.GOALS_AND_ASSISTS,
        );
        expect(nextSortForColumn(SortOptions.GOALS_AND_ASSISTS, SortOptions.GOALS)).toBe(
            SortOptions.GOALS,
        );
    });

    it('selects Goals from any other sort', () => {
        expect(nextSortForColumn(SortOptions.ASSISTS, SortOptions.GOALS)).toBe(SortOptions.GOALS);
        expect(nextSortForColumn(SortOptions.MINUTES_PLAYED, SortOptions.GOALS)).toBe(
            SortOptions.GOALS,
        );
    });
});
