import {SearchFilterState} from "../../../types/SearchFilterState";
import {minuteBasedSortOptions, numberOfGamesOrSeasonsSortOptions} from "../../../types/SearchOptions";
import {UrlFilters} from "../../../types/UrlFilters";

/**
 * Serializes filter state to URL search params (mirror of
 * useSearchFiltersFromUrl). Pure and unit-testable; the caller owns
 * navigation.
 */
export const filterStateToSearchParams = (filterState: SearchFilterState): URLSearchParams => {
    const params = new URLSearchParams();

    const addParam = (key: string, value: unknown) => {
        if (value !== undefined && value !== null && value != '') {
            params.append(key, value.toString().trim());
        }
    }
    addParam(UrlFilters.SEASONS, filterState.seasons.join(','));
    addParam(UrlFilters.COMPETITIONS, filterState.competitions.join(','));
    addParam(UrlFilters.POSITIONS, filterState.positions.join(','));
    addParam(UrlFilters.MINUTE_FROM, filterState.minuteFrom);
    addParam(UrlFilters.MINUTE_TO, filterState.minuteTo);
    addParam(UrlFilters.MINIMUM_AGE, filterState.minAge);
    addParam(UrlFilters.MAXIMUM_AGE, filterState.maxAge);
    addParam(UrlFilters.MINIMUM_HEIGHT, filterState.minHeight);
    addParam(UrlFilters.MAXIMUM_HEIGHT, filterState.maxHeight);
    addParam(UrlFilters.PLAYER_NAMES, filterState.playerNames);
    addParam(UrlFilters.PLAYER_COUNTRIES, filterState.playerCountries.map(country => country.code));
    addParam(UrlFilters.CLUBS_PLAYED_FOR, filterState.clubsPlayedFor);
    addParam(UrlFilters.CLUBS_PLAYED_AGAINST, filterState.clubsPlayedAgainst);
    if (filterState.subsOnly) {
        addParam(UrlFilters.SUBS_ONLY, 1);
        addParam(UrlFilters.EARLIEST_SUB_ON_TIME, filterState.earliestSubOnTime);
        addParam(UrlFilters.LATEST_SUB_ON_TIME, filterState.latestSubOnTime);
    }
    addParam(UrlFilters.PENALTIES, filterState.penalties);
    addParam(UrlFilters.HOME_OR_AWAY, filterState.homeOrAway);
    addParam(UrlFilters.SORT_BY, filterState.sortBy);
    addParam(UrlFilters.SCOPE, filterState.statScope);
    if (minuteBasedSortOptions.includes(filterState.sortBy)) {
        addParam(UrlFilters.MINIMUM_APPEARANCES, filterState.minimumAppearances);
    }
    if (numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy)) {
        addParam(UrlFilters.MINIMUM_GOALS, filterState.minimumGoals);
        addParam(UrlFilters.MAXIMUM_GOALS, filterState.maximumGoals);
        addParam(UrlFilters.MINIMUM_ASSISTS, filterState.minimumAssists);
        addParam(UrlFilters.MAXIMUM_ASSISTS, filterState.maximumAssists);
        addParam(UrlFilters.MINIMUM_GOALS_AND_ASSISTS, filterState.minimumGoalsAndAssists);
        addParam(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS, filterState.maximumGoalsAndAssists);
    }

    return params;
};
