import {SearchFilterState} from "../../../types/SearchFilterState";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "../../../types/SearchOptions";

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
