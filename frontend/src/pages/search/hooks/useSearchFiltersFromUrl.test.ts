import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope } from '../../../types/SearchOptions';
import { useSearchFiltersFromUrl } from './useSearchFiltersFromUrl';

describe('useSearchFiltersFromUrl', () => {
    it('returns defaults for an empty query string', () => {
        const {result} = renderHook(({search}) => useSearchFiltersFromUrl(search), {
            initialProps: {search: ''},
        });

        expect(result.current.seasons).toEqual([]);
        expect(result.current.competitions).toEqual([]);
        expect(result.current.subsOnly).toBe(false);
        expect(result.current.penalties).toBe(PenaltyOptions.INCLUDE_PENALTIES);
        expect(result.current.homeOrAway).toBe(HomeOrAwayOptions.EITHER);
        expect(result.current.sortBy).toBe(SortOptions.GOALS);
        expect(result.current.statScope).toBe(StatScope.OVERALL);
        expect(result.current.minuteFrom).toBeUndefined();
    });

    it('parses a full filter query', () => {
        const search =
            '?seasons=2024,2025&comps=GB1&positions=CF&minfrom=10&minto=80' +
            '&minage=20&maxage=30&names=Kane&c=gb-eng,de&clubspf=1,2&subonly=1' +
            '&earliestsub=60&latestsub=75&penalty=ep&home=h&sort=a&scope=s';
        const {result} = renderHook(({search: s}) => useSearchFiltersFromUrl(s), {
            initialProps: {search},
        });

        expect(result.current.seasons).toEqual([2024, 2025]);
        expect(result.current.competitions).toEqual(['GB1']);
        expect(result.current.positions).toEqual(['CF']);
        expect(result.current.minuteFrom).toBe(10);
        expect(result.current.minuteTo).toBe(80);
        expect(result.current.minAge).toBe(20);
        expect(result.current.maxAge).toBe(30);
        expect(result.current.playerNames).toEqual(['Kane']);
        expect(result.current.playerCountries.map(c => c.name)).toEqual(['England', 'Germany']);
        expect(result.current.clubsPlayedFor).toEqual([1, 2]);
        expect(result.current.subsOnly).toBe(true);
        expect(result.current.earliestSubOnTime).toBe(60);
        expect(result.current.latestSubOnTime).toBe(75);
        expect(result.current.penalties).toBe(PenaltyOptions.EXCLUDE_PENALTIES);
        expect(result.current.homeOrAway).toBe(HomeOrAwayOptions.HOME);
        expect(result.current.sortBy).toBe(SortOptions.ASSISTS);
        expect(result.current.statScope).toBe(StatScope.SEASON);
    });

    it('drops unknown country codes', () => {
        const {result} = renderHook(({search}) => useSearchFiltersFromUrl(search), {
            initialProps: {search: '?c=xx,de'},
        });

        expect(result.current.playerCountries.map(c => c.code)).toEqual(['de']);
    });
});
