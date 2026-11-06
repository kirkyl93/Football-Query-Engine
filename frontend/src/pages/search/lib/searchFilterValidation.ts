import {SortOptions, StatScope} from "../../../types/SearchOptions";
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

    if (filterState.statScope !== StatScope.GAME) {
        for (const [minimum, maximum, label] of [
            ...(filterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? [] : [[filterState.minimumAppearances, filterState.maximumAppearances, 'appearances'] as const]),
            [filterState.minimumGoals, filterState.maximumGoals, 'goals'],
            [filterState.minimumAssists, filterState.maximumAssists, 'assists'],
            [filterState.minimumGoalsAndAssists, filterState.maximumGoalsAndAssists, 'goals and assists'],
        ] as const) {
            if (minimum !== undefined && (!Number.isInteger(minimum) || minimum < 0)) errors.push('Minimum ' + label + ' must be a non-negative integer');
            if (maximum !== undefined && (!Number.isInteger(maximum) || maximum < 0)) errors.push('Maximum ' + label + ' must be a non-negative integer');
            if (minimum !== undefined && maximum !== undefined && minimum > maximum) errors.push('Maximum ' + label + ' should be greater than or equal to minimum ' + label);
        }
        if (filterState.sortBy !== SortOptions.NUMBER_OF_GAMES_WITH && ((filterState.minimumAppearances ?? 0) > 2000 || (filterState.maximumAppearances ?? 0) > 2000)) errors.push('Appearance limits must be at most 2000');
    }
    if (filterState.statScope !== StatScope.GAME) {
        for (const [minimum, maximum, label] of [
            [filterState.minimumYellowCards, filterState.maximumYellowCards, 'yellow cards'],
            [filterState.minimumRedCards, filterState.maximumRedCards, 'red cards'],
        ] as const) {
            if (minimum !== undefined && maximum !== undefined && minimum > maximum) errors.push(`Maximum ${label} should be greater than or equal to minimum ${label}`);
        }
    }
    return errors;
};
