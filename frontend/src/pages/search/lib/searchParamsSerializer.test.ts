import { describe, expect, it } from 'vitest';
import { SortOptions } from '../../../types/SearchOptions';
import { UrlFilters } from '../../../types/UrlFilters';
import { createDefaultSearchFilterState } from './defaultSearchFilter';
import { filterStateToSearchParams } from './searchParamsSerializer';

describe('filterStateToSearchParams', () => {
    it('serializes the default state', () => {
        const params = filterStateToSearchParams(createDefaultSearchFilterState());

        expect(params.get(UrlFilters.SEASONS)).toBe('2025');
        expect(params.get(UrlFilters.COMPETITIONS)).toBe('GB1');
        expect(params.get(UrlFilters.PENALTIES)).toBe('ip');
        expect(params.get(UrlFilters.HOME_OR_AWAY)).toBe('e');
        expect(params.get(UrlFilters.SORT_BY)).toBe('g');
        expect(params.get(UrlFilters.SCOPE)).toBe('o');
        expect(params.has(UrlFilters.SUBS_ONLY)).toBe(false);
        expect(params.has(UrlFilters.MINUTE_FROM)).toBe(false);
    });

    it('includes sub-on times only when subs-only is set', () => {
        const withSubs = {
            ...createDefaultSearchFilterState(),
            subsOnly: true,
            earliestSubOnTime: 60,
            latestSubOnTime: 75,
        };
        const params = filterStateToSearchParams(withSubs);

        expect(params.get(UrlFilters.SUBS_ONLY)).toBe('1');
        expect(params.get(UrlFilters.EARLIEST_SUB_ON_TIME)).toBe('60');
        expect(params.get(UrlFilters.LATEST_SUB_ON_TIME)).toBe('75');
    });

    it('includes appearances only for minute-based sorts', () => {
        const minuteSort = {
            ...createDefaultSearchFilterState(),
            sortBy: SortOptions.MINUTES_PER_GOAL,
            minimumAppearances: 10,
            minimumGoals: 5,
        };
        const params = filterStateToSearchParams(minuteSort);

        expect(params.get(UrlFilters.MINIMUM_APPEARANCES)).toBe('10');
        expect(params.has(UrlFilters.MINIMUM_GOALS)).toBe(false);
    });
});
