import {useMemo} from "react";
import {countries, Country} from "../../../data/Countries";
import {
    HomeOrAwayOptions,
    PenaltyOptions,
    SortOptions,
    StatScope,
} from "../../../types/SearchOptions";
import {UrlFilters} from "../../../types/UrlFilters";
import {SearchFilterState} from "../../../types/SearchFilterState";

/**
 * Parses the URL query string into typed search filter state.
 * Mirror of filterStateToSearchParams. Pure parsing inside useMemo.
 */
export const useSearchFiltersFromUrl = (search: string): SearchFilterState => {
    return useMemo(() => {
        const params = new URLSearchParams(search);
        const selectedCountryCodes = params.get(UrlFilters.PLAYER_COUNTRIES)?.split(',').map(code => code.trim()) || [];
        return {
            seasons: params.get(UrlFilters.SEASONS)?.split(',').map(Number) || [],
            competitions: params.get(UrlFilters.COMPETITIONS)?.split(',') || [],
            positions: params.get(UrlFilters.POSITIONS)?.split(',') || [],
            minuteFrom: params.get(UrlFilters.MINUTE_FROM) ?
                parseInt(params.get(UrlFilters.MINUTE_FROM)!, 10) : undefined,
            minuteTo: params.get(UrlFilters.MINUTE_TO) ?
                parseInt(params.get(UrlFilters.MINUTE_TO)!, 10) : undefined,
            minAge: params.get(UrlFilters.MINIMUM_AGE) ?
                parseInt(params.get(UrlFilters.MINIMUM_AGE)!, 10) : undefined,
            maxAge: params.get(UrlFilters.MAXIMUM_AGE) ?
                parseInt(params.get(UrlFilters.MAXIMUM_AGE)!, 10) : undefined,
            minHeight: params.get(UrlFilters.MINIMUM_HEIGHT) ?
                parseInt(params.get(UrlFilters.MINIMUM_HEIGHT)!, 10) : undefined,
            maxHeight: params.get(UrlFilters.MAXIMUM_HEIGHT) ?
                parseInt(params.get(UrlFilters.MAXIMUM_HEIGHT)!, 10) : undefined,
            playerNames: params.get(UrlFilters.PLAYER_NAMES)?.split(',').map(name => name.trim()) || [],
            playerCountries: selectedCountryCodes.map(code =>
                countries.find(country => country.code === code))
                .filter((country): country is Country => country !== undefined),
            clubsPlayedFor: params.get(UrlFilters.CLUBS_PLAYED_FOR)?.split(',').map(Number) || [],
            clubsPlayedAgainst: params.get(UrlFilters.CLUBS_PLAYED_AGAINST)?.split(',').map(Number) || [],
            subsOnly: params.has(UrlFilters.SUBS_ONLY),
            earliestSubOnTime: params.get(UrlFilters.EARLIEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.EARLIEST_SUB_ON_TIME)!, 10) : undefined,
            latestSubOnTime: params.get(UrlFilters.LATEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.LATEST_SUB_ON_TIME)!, 10) : undefined,
            penalties: params.get(UrlFilters.PENALTIES) as PenaltyOptions || PenaltyOptions.INCLUDE_PENALTIES,
            homeOrAway: params.get(UrlFilters.HOME_OR_AWAY) as HomeOrAwayOptions || HomeOrAwayOptions.EITHER,
            sortBy: params.get(UrlFilters.SORT_BY) as SortOptions || SortOptions.GOALS,
            statScope: params.get(UrlFilters.SCOPE) as StatScope || StatScope.OVERALL,
            minimumAppearances: params.get(UrlFilters.MINIMUM_APPEARANCES) ?
                parseInt(params.get(UrlFilters.MINIMUM_APPEARANCES)!, 10) : undefined,
            minimumGoals: params.get(UrlFilters.MINIMUM_GOALS) ?
                parseInt(params.get(UrlFilters.MINIMUM_GOALS)!, 10) : undefined,
            maximumGoals: params.get(UrlFilters.MAXIMUM_GOALS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_GOALS)!, 10) : undefined,
            minimumAssists: params.get(UrlFilters.MINIMUM_ASSISTS) ?
                parseInt(params.get(UrlFilters.MINIMUM_ASSISTS)!, 10) : undefined,
            maximumAssists: params.get(UrlFilters.MAXIMUM_ASSISTS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_ASSISTS)!, 10) : undefined,
            minimumGoalsAndAssists: params.get(UrlFilters.MINIMUM_GOALS_AND_ASSISTS) ?
                parseInt(params.get(UrlFilters.MINIMUM_GOALS_AND_ASSISTS)!, 10) : undefined,
            maximumGoalsAndAssists: params.get(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS)!, 10) : undefined
        };
    }, [search]);
};
