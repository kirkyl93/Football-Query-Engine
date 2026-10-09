import {SearchFilterState} from "../../../types/SearchFilterState";

/**
 * Pure validation for the search filter drawer.
 * Returns a list of human-readable problems (empty = valid), so the
 * caller can decide how to surface them. Covered by unit tests in PR 5.
 */
export const validateSearchFilters = (filterState: SearchFilterState): string[] => {
    const errors: string[] = [];

    if (filterState.minAge !== undefined && filterState.maxAge !== undefined && filterState.minAge > filterState.maxAge) {
        errors.push("Max age should be greater than or equal to Min age");
    }

    if (filterState.minuteFrom !== undefined && filterState.minuteTo !== undefined && filterState.minuteFrom > filterState.minuteTo) {
        errors.push("Minute to should be later than or equal to minute from");
    }

    if (filterState.subsOnly && filterState.earliestSubOnTime !== undefined && filterState.latestSubOnTime !== undefined &&
        filterState.earliestSubOnTime > filterState.latestSubOnTime) {
        errors.push("Latest sub on minute should be later or equal to earliest sub on minute");
    }

    return errors;
};
