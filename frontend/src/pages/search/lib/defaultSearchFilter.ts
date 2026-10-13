import {SearchFilterState} from "../../../types/SearchFilterState";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "../../../types/SearchOptions";
import {filterStateToSearchParams} from "./searchParamsSerializer";

export const createDefaultSearchFilterState = (): SearchFilterState => ({
    seasons: [2025],
    competitions: ['GB1'],
    positions: [],
    minuteFrom: undefined,
    minuteTo: undefined,
    minAge: undefined,
    maxAge: undefined,
    minHeight: undefined,
    maxHeight: undefined,
    playerNames: [],
    playerCountries: [],
    clubsPlayedFor: [],
    clubsPlayedAgainst: [],
    subsOnly: false,
    earliestSubOnTime: undefined,
    latestSubOnTime: undefined,
    penalties: PenaltyOptions.INCLUDE_PENALTIES,
    homeOrAway: HomeOrAwayOptions.EITHER,
    statScope: StatScope.OVERALL,
    sortBy: SortOptions.GOALS,
    minimumAppearances: undefined,
    minimumGoals: undefined,
    maximumGoals: undefined,
    minimumAssists: undefined,
    maximumAssists: undefined,
    minimumGoalsAndAssists: undefined,
    maximumGoalsAndAssists: undefined
});

/**
 * Single source of truth for the "home page": Premier League top scorers 25/26.
 * Used by the header logo link and by the redirect from bare `/` with no params.
 */
export const getDefaultSearchPath = (): string => {
    const params = filterStateToSearchParams(createDefaultSearchFilterState());
    const query = params.toString();
    return query ? `/?${query}` : '/';
};
