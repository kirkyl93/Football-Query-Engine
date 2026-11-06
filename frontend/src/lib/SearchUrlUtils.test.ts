import {afterEach, describe, expect, it, vi} from 'vitest';
import {constructSearchUrl, fetchPlayerOverallOrSeasonData, fetchPlayerGameData, fetchNumberOfGamesOrSeasonsResult} from './SearchUrlUtils';
import {createDefaultSearchFilterState} from '../pages/search/lib/defaultSearchFilter';
import {filterStateToSearchParams} from '../pages/search/lib/searchParamsSerializer';
import {naturalLanguageFiltersToSearchState} from './naturalLanguageSearch';
import {SortOptions, StatScope} from '../types/SearchOptions';

afterEach(() => vi.unstubAllGlobals());

const request = (searchParams: URLSearchParams) => ({page: 0, limit: 50, signal: new AbortController().signal, searchParams});
const mockFetch = () => {
    const fetch = vi.fn().mockResolvedValue({ok: true, json: async () => []});
    vi.stubGlobal('fetch', fetch);
    return fetch;
};

describe('search filters sent to the API', () => {
    it('carries a zero-total-goal appearance ranking from an LLM proposal into the fetch request', async () => {
        const fetch = mockFetch();
        const state = await naturalLanguageFiltersToSearchState({competitions: ['GB1'], positions: ['CF'], sortBy: SortOptions.APPEARANCES, statScope: StatScope.OVERALL, sortDirection: 'desc', minimumAppearances: 50, maximumAppearances: 100, maximumGoals: 0});
        await fetchPlayerOverallOrSeasonData(request(filterStateToSearchParams(state)));
        const url = new URL(fetch.mock.calls[0][0]);
        expect(url.pathname).toBe('/search');
        expect(['comps', 'positions', 'sort', 'direction', 'ma', 'maxap', 'maxg'].map(key => url.searchParams.get(key))).toEqual(['GB1', 'CF', 'ap', 'desc', '50', '100', '0']);
    });

    it('sends fewest-first and appearance bounds for ordinary totals', async () => {
        const fetch = mockFetch();
        const state = {...createDefaultSearchFilterState(), sortBy: SortOptions.GOALS, sortDirection: 'asc' as const, minimumAppearances: 50, maximumAppearances: 100};
        await fetchPlayerOverallOrSeasonData(request(filterStateToSearchParams(state)));
        const url = new URL(fetch.mock.calls[0][0]);
        expect(['sort', 'direction', 'ma', 'maxap'].map(key => url.searchParams.get(key))).toEqual(['g', 'asc', '50', '100']);
    });

    it('sends per-season qualification limits to the count endpoint', async () => {
        const fetch = mockFetch();
        const state = {...createDefaultSearchFilterState(), sortBy: SortOptions.NUMBER_OF_SEASONS_WITH, sortDirection: 'asc' as const, minimumAppearances: 30, maximumAppearances: 38, maximumGoals: 4};
        await fetchNumberOfGamesOrSeasonsResult(request(filterStateToSearchParams(state)));
        const url = new URL(fetch.mock.calls[0][0]);
        expect(url.pathname).toBe('/search/occurrences');
        expect(['sort', 'direction', 'ma', 'maxap', 'maxg'].map(key => url.searchParams.get(key))).toEqual(['sw', 'asc', '30', '38', '4']);
    });

    it('forces most-first for individual-game searches', async () => {
        const fetch = mockFetch();
        const state = {...createDefaultSearchFilterState(), statScope: StatScope.GAME, sortDirection: 'asc' as const};
        await fetchPlayerGameData(request(filterStateToSearchParams(state)));
        const url = new URL(fetch.mock.calls[0][0]);
        expect(url.pathname).toBe('/search/game');
        expect(url.searchParams.get('direction')).toBe('desc');
    });

    it('preserves zero bounds and URL-encodes names without adding extra filters', () => {
        const state = {...createDefaultSearchFilterState(), playerNames: ['A & B'], maximumAppearances: 0, maximumGoals: 0};
        const url = new URL(constructSearchUrl('http://localhost:8080/search', request(filterStateToSearchParams(state))));
        expect(url.searchParams.get('names')).toBe('A & B');
        expect(url.searchParams.get('maxap')).toBe('0');
        expect(url.searchParams.get('maxg')).toBe('0');
        expect(url.searchParams.has('B')).toBe(false);
    });

    it('keeps pagination owned by the request and drops substitution bounds unless enabled', () => {
        const params = new URLSearchParams('page=99&limit=999&earliestsub=60&latestsub=75');
        const url = new URL(constructSearchUrl('http://localhost:8080/search', request(params)));
        expect(url.searchParams.get('page')).toBe('0');
        expect(url.searchParams.get('limit')).toBe('50');
        expect(url.searchParams.get('scope')).toBe('o');
        expect(url.searchParams.has('earliestsub')).toBe(false);
        params.set('subonly', '1');
        const subs = new URL(constructSearchUrl('http://localhost:8080/search', request(params)));
        expect(['subonly', 'earliestsub', 'latestsub'].map(key => subs.searchParams.get(key))).toEqual(['1', '60', '75']);
    });
});

it('drops stale appearance bounds for game counts and forwards card qualification', async () => {
    const fetch = mockFetch();
    const params = new URLSearchParams('sort=gw&scope=o&ma=20&maxap=40&miny=1&maxr=0');
    await fetchNumberOfGamesOrSeasonsResult(request(params));
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.has('ma')).toBe(false);
    expect(url.searchParams.has('maxap')).toBe(false);
    expect(url.searchParams.get('miny')).toBe('1');
    expect(url.searchParams.get('maxr')).toBe('0');
});

it('drops all stale qualification bounds and reversed ordering for individual games', async () => {
    const fetch = mockFetch();
    await fetchPlayerGameData(request(new URLSearchParams('sort=y&scope=g&direction=asc&ma=20&maxap=40&maxg=0&miny=1&maxr=0')));
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('sort')).toBe('g');
    expect(url.searchParams.get('direction')).toBe('desc');
    expect(['ma', 'maxap', 'maxg', 'miny', 'maxr'].some(key => url.searchParams.has(key))).toBe(false);
});
