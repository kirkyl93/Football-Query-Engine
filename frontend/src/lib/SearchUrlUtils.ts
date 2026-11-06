import {FetchParams} from "../pages/search/hooks/useInfiniteScroll";
import {UrlFilters} from "../types/UrlFilters";
import {StatScope} from "../types/SearchOptions";
import {PlayerGameSearchResult, PlayerNumberOfGamesOrSeasonsResult, PlayerSearchResult} from "../types/Player";
import {API_BASE_URL} from "../config";
import {fetchJson} from "./apiError";

export const constructSearchUrl = (baseUrl: string, { page, limit, searchParams }: FetchParams): string => {
    const params = new URLSearchParams({page: String(page), limit: String(limit)});
    const handledSeparately = new Set<UrlFilters>([
        UrlFilters.SCOPE, UrlFilters.SUBS_ONLY,
        UrlFilters.EARLIEST_SUB_ON_TIME, UrlFilters.LATEST_SUB_ON_TIME,
    ]);

    const scope = searchParams.get(UrlFilters.SCOPE) || StatScope.OVERALL;
    const gameCount = searchParams.get(UrlFilters.SORT_BY) === 'gw';
    const appearanceBounds = new Set<UrlFilters>([UrlFilters.MINIMUM_APPEARANCES, UrlFilters.MAXIMUM_APPEARANCES]);
    const qualificationBounds = new Set<UrlFilters>([
        ...appearanceBounds, UrlFilters.MINIMUM_GOALS, UrlFilters.MAXIMUM_GOALS,
        UrlFilters.MINIMUM_ASSISTS, UrlFilters.MAXIMUM_ASSISTS,
        UrlFilters.MINIMUM_GOALS_AND_ASSISTS, UrlFilters.MAXIMUM_GOALS_AND_ASSISTS,
        UrlFilters.MINIMUM_YELLOW_CARDS, UrlFilters.MAXIMUM_YELLOW_CARDS,
        UrlFilters.MINIMUM_RED_CARDS, UrlFilters.MAXIMUM_RED_CARDS,
    ]);

    // Use the shared filter definitions so adding a filter cannot silently omit
    // it from the actual API request.
    for (const key of Object.values(UrlFilters)) {
        if (handledSeparately.has(key) || (scope === StatScope.GAME && qualificationBounds.has(key)) || (gameCount && appearanceBounds.has(key))) {
            continue;
        }
        const value = searchParams.get(key);
        if (value !== null && value !== '') {
            params.set(key, value);
        }
    }

    if (scope !== StatScope.GAME) {
        params.set(UrlFilters.SCOPE, scope);
    }
    else {
        params.set(UrlFilters.SORT_DIRECTION, 'desc');
        if (!['g', 'a', 'ga'].includes(params.get(UrlFilters.SORT_BY) ?? '')) {
            params.set(UrlFilters.SORT_BY, 'g');
        }
    }

    if (searchParams.has(UrlFilters.SUBS_ONLY)) {
        params.set(UrlFilters.SUBS_ONLY, '1');
        for (const key of [UrlFilters.EARLIEST_SUB_ON_TIME, UrlFilters.LATEST_SUB_ON_TIME]) {
            const value = searchParams.get(key);
            if (value !== null && value !== '') {
                params.set(key, value);
            }
        }
    }
    return baseUrl + '?' + params.toString();
};

export const fetchNumberOfGamesOrSeasonsResult = async (params: FetchParams): Promise<PlayerNumberOfGamesOrSeasonsResult[]> => {
    const url = constructSearchUrl(`${API_BASE_URL}/search/occurrences`, params);
    return fetchJson<PlayerNumberOfGamesOrSeasonsResult[]>('/search/occurrences', url, params.signal);
}

export const fetchPlayerOverallOrSeasonData = async (params: FetchParams): Promise<PlayerSearchResult[]> => {
    const url = constructSearchUrl(`${API_BASE_URL}/search`, params);
    return fetchJson<PlayerSearchResult[]>('/search', url, params.signal);
}

export const fetchPlayerGameData = async (params: FetchParams): Promise<PlayerGameSearchResult[]> => {
    const url = constructSearchUrl(`${API_BASE_URL}/search/game`, params);
    return fetchJson<PlayerGameSearchResult[]>('/search/game', url, params.signal);
}
