import { describe, expect, it } from 'vitest';
import { createDefaultSearchFilterState } from './defaultSearchFilter';
import { validateSearchFilters } from './searchFilterValidation';

describe('validateSearchFilters', () => {
    it('returns no errors for the default state', () => {
        expect(validateSearchFilters(createDefaultSearchFilterState())).toEqual([]);
    });

    it('flags min age above max age', () => {
        const state = {...createDefaultSearchFilterState(), minAge: 30, maxAge: 25};
        expect(validateSearchFilters(state)).toEqual([
            "Max age should be greater than or equal to Min age",
        ]);
    });

    it('flags minute-from after minute-to', () => {
        const state = {...createDefaultSearchFilterState(), minuteFrom: 80, minuteTo: 10};
        expect(validateSearchFilters(state)).toEqual([
            "Minute to should be later than or equal to minute from",
        ]);
    });

    it('flags earliest sub-on after latest sub-on when subs-only', () => {
        const state = {
            ...createDefaultSearchFilterState(),
            subsOnly: true,
            earliestSubOnTime: 70,
            latestSubOnTime: 60,
        };
        expect(validateSearchFilters(state)).toEqual([
            "Latest sub on minute should be later or equal to earliest sub on minute",
        ]);
    });

    it('ignores sub-on range when subs-only is off', () => {
        const state = {
            ...createDefaultSearchFilterState(),
            subsOnly: false,
            earliestSubOnTime: 70,
            latestSubOnTime: 60,
        };
        expect(validateSearchFilters(state)).toEqual([]);
    });
});
