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
        expect(params.has(UrlFilters.PLAYER_NAMES)).toBe(false);
        expect(params.has(UrlFilters.PLAYER_COUNTRIES)).toBe(false);
        expect(params.has(UrlFilters.CLUBS_PLAYED_FOR)).toBe(false);
        expect(params.has(UrlFilters.CLUBS_PLAYED_AGAINST)).toBe(false);
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

    it('includes appearance and goal bounds for aggregate sorts', () => {
        const minuteSort = {
            ...createDefaultSearchFilterState(),
            sortBy: SortOptions.MINUTES_PER_GOAL,
            minimumAppearances: 10,
            minimumGoals: 5,
        };
        const params = filterStateToSearchParams(minuteSort);

        expect(params.get(UrlFilters.MINIMUM_APPEARANCES)).toBe('10');
        expect(params.get(UrlFilters.MINIMUM_GOALS)).toBe('5');
    });
});

it('serializes card bounds for all aggregate rankings, including zero',()=>{
    const state={...createDefaultSearchFilterState(),sortBy:SortOptions.NUMBER_OF_SEASONS_WITH,minimumYellowCards:10,maximumYellowCards:12,minimumRedCards:0,maximumRedCards:0};
    const params=filterStateToSearchParams(state);
    expect(['miny','maxy','minr','maxr'].map(key=>params.get(key))).toEqual(['10','12','0','0']);
    for(const sortBy of [SortOptions.NUMBER_OF_GAMES_WITH,SortOptions.YELLOW_CARDS]){
        const other=filterStateToSearchParams({...state,sortBy});
        expect(['miny','maxy','minr','maxr'].map(key=>other.get(key))).toEqual(['10','12','0','0']);
    }
});

it('does not serialize stale appearance limits for game counts', () => {
    const state = {...createDefaultSearchFilterState(), sortBy: SortOptions.NUMBER_OF_GAMES_WITH, minimumAppearances: 100, maximumAppearances: 50, minimumYellowCards: 1};
    const params = filterStateToSearchParams(state);
    expect(params.has('ma')).toBe(false);
    expect(params.has('maxap')).toBe(false);
    expect(params.get('miny')).toBe('1');
});

it('removes qualification bounds and fewest-first ordering for individual games', () => {
    const state = {...createDefaultSearchFilterState(), statScope: 'g' as import('../../../types/SearchOptions').StatScope, sortDirection: 'asc' as const, minimumAppearances: 10, maximumGoals: 0, minimumYellowCards: 1};
    const params = filterStateToSearchParams(state);
    expect(params.get('direction')).toBe('desc');
    expect(['ma', 'maxap', 'maxg', 'miny'].some(key => params.has(key))).toBe(false);
});
