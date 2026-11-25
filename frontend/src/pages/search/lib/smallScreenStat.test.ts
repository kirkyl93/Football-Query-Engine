import {describe, expect, it} from 'vitest';
import {formatMinutesPerEvent, getCompactSearchStats, getDisplayStatForSmallScreen} from './smallScreenStat';
import {SortOptions} from '../../../types/SearchOptions';
import {PlayerSearchResult} from '../../../types/Player';

import {createDefaultSearchFilterState} from './defaultSearchFilter';

describe('compact search columns', () => {
    it('keeps all filtered metrics, including a maximum of zero', () => {
        const filters = createDefaultSearchFilterState();
        expect(getCompactSearchStats({...filters, sortBy: SortOptions.YELLOW_CARDS, minimumAppearances: 20, maximumYellowCards: 0}))
            .toEqual(['total_appearances', 'total_yellow_cards']);
        expect(getCompactSearchStats({...filters, minimumGoalsAndAssists: 10}))
            .toEqual(['total_goals', 'total_assists']);
    });

    it('uses the sort metric when there are no active stat bounds', () => {
        const filters = createDefaultSearchFilterState();
        expect(getCompactSearchStats({...filters, sortBy: SortOptions.MINUTES_PER_ASSIST, minimumAppearances: 0, maximumGoals: -1}))
            .toEqual(['mins_per_assist']);
    });

    it.each([
        [SortOptions.GOALS, 'total_goals'],
        [SortOptions.ASSISTS, 'total_assists'],
        [SortOptions.GOALS_AND_ASSISTS, 'goals_and_assists'],
        [SortOptions.APPEARANCES, 'total_appearances'],
        [SortOptions.MINUTES_PLAYED, 'total_minutes_played'],
        [SortOptions.YELLOW_CARDS, 'total_yellow_cards'],
        [SortOptions.RED_CARDS, 'total_red_cards'],
        [SortOptions.MINUTES_PER_GOAL, 'mins_per_goal'],
        [SortOptions.MINUTES_PER_ASSIST, 'mins_per_assist'],
        [SortOptions.MINUTES_PER_GOAL_OR_ASSIST, 'mins_per_goal_or_assist'],
        [SortOptions.MINUTES_PER_YELLOW, 'mins_per_yellow'],
        [SortOptions.MINUTES_PER_RED, 'mins_per_red'],
    ] as const)('keeps the %s sort metric alongside an appearance filter', (sortBy, field) => {
        const filters = {...createDefaultSearchFilterState(), sortBy, minimumAppearances: 20};
        expect(getCompactSearchStats(filters)).toEqual([...new Set(['total_appearances', field])]);
    });

    it('also keeps the sort metric when a quiz supplies its own relevant stats', () => {
        const filters = {...createDefaultSearchFilterState(), sortBy: SortOptions.MINUTES_PER_GOAL};
        expect(getCompactSearchStats(filters, ['total_appearances'])).toEqual(['total_appearances', 'mins_per_goal']);
    });
});

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
