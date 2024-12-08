import {FetchParams} from "./InfiniteScrollWrapper";
import {
    PlayerGameSearchResult,
    PlayerNumberOfGamesOrSeasonsResult,
    PlayerSearchResult,
    StatScope,
    UrlFilters
} from "./types";

export const constructSearchUrl = (baseUrl: string, { page, limit, searchParams }: FetchParams): string => {
    let url = `${baseUrl}?page=${page}&limit=${limit}`;

    const paramMapping = [
        UrlFilters.SEASONS, UrlFilters.COMPETITIONS, UrlFilters.POSITIONS, UrlFilters.MINUTE_FROM, UrlFilters.MINUTE_TO,
        UrlFilters.MINIMUM_AGE, UrlFilters.MAXIMUM_AGE, UrlFilters.MINIMUM_HEIGHT, UrlFilters.MAXIMUM_HEIGHT, UrlFilters.PLAYER_NAMES,
        UrlFilters.PLAYER_COUNTRIES, UrlFilters.CLUBS_PLAYED_FOR, UrlFilters.CLUBS_PLAYED_AGAINST, UrlFilters.PENALTIES, UrlFilters.HOME_OR_AWAY,
        UrlFilters.SORT_BY, UrlFilters.MINIMUM_APPEARANCES, UrlFilters.MINIMUM_GOALS, UrlFilters.MAXIMUM_GOALS, UrlFilters.MINIMUM_ASSISTS,
        UrlFilters.MAXIMUM_ASSISTS, UrlFilters.MINIMUM_GOALS_AND_ASSISTS, UrlFilters.MAXIMUM_GOALS_AND_ASSISTS
    ];

    let statScope = searchParams.get(UrlFilters.SCOPE) as StatScope || StatScope.OVERALL;

    paramMapping.forEach((key) => {
        const value = searchParams.get(key);
        if (value) {
            url += `&${key}=${value}`;
        }
    });

    if (statScope != StatScope.GAME) {
        url += `&${UrlFilters.SCOPE}=${searchParams.get(UrlFilters.SCOPE)}`;
    }

    if (searchParams.has(UrlFilters.SUBS_ONLY)) {
        url += `&${UrlFilters.SUBS_ONLY}=1`;

        const earliestSub = searchParams.get(UrlFilters.EARLIEST_SUB_ON_TIME);
        const latestSub = searchParams.get(UrlFilters.LATEST_SUB_ON_TIME);

        if (earliestSub) {
            url += `&${UrlFilters.EARLIEST_SUB_ON_TIME}=${earliestSub}`;
        }

        if (latestSub) {
            url += `&${UrlFilters.LATEST_SUB_ON_TIME}=${latestSub}`;
        }
    }
    return url;
};

export const fetchNumberOfGamesOrSeasonsResult = async (params: FetchParams): Promise<PlayerNumberOfGamesOrSeasonsResult[]> => {
    let url = constructSearchUrl('http://localhost:8080/search/occurrences', params);

    const response = await fetch(url, { signal: params.signal });
    if (!response.ok) {
        throw new Error('Failed to fetch player stats');
    }
    return response.json();
}

export const fetchPlayerOverallOrSeasonData = async (params: FetchParams): Promise<PlayerSearchResult[]> => {
    let url = constructSearchUrl('http://localhost:8080/search', params);

    const response = await fetch(url, { signal: params.signal });
    if (!response.ok) {
        throw new Error('Failed to fetch player stats');
    }
    return response.json();
}

export const fetchPlayerGameData = async (params: FetchParams): Promise<PlayerGameSearchResult[]> => {
    let url = constructSearchUrl('http://localhost:8080/search/game', params);

    const response = await fetch(url, { signal: params.signal });
    if (!response.ok) {
        throw new Error('Failed to fetch player game data');
    }
    return response.json();
}