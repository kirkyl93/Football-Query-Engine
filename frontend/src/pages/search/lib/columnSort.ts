import { SortOptions, StatScope } from "../../../types/SearchOptions";

export type SortDirection = 'asc' | 'desc';

/**
 * Default ordering applied by the backend for each sort. Everything is
 * descending except the minutes-per-event sorts (lower is better).
 * Explicit direction choices override these defaults in the query and header.
 */
export const SORT_DIRECTIONS: Record<SortOptions, SortDirection> = {
    [SortOptions.GOALS]: 'desc',
    [SortOptions.ASSISTS]: 'desc',
    [SortOptions.GOALS_AND_ASSISTS]: 'desc',
    [SortOptions.APPEARANCES]: 'desc',
    [SortOptions.MINUTES_PLAYED]: 'desc',
    [SortOptions.YELLOW_CARDS]: 'desc',
    [SortOptions.RED_CARDS]: 'desc',
    [SortOptions.MINUTES_PER_GOAL]: 'asc',
    [SortOptions.MINUTES_PER_ASSIST]: 'asc',
    [SortOptions.MINUTES_PER_GOAL_OR_ASSIST]: 'asc',
    [SortOptions.MINUTES_PER_YELLOW]: 'asc',
    [SortOptions.MINUTES_PER_RED]: 'asc',
    [SortOptions.NUMBER_OF_GAMES_WITH]: 'desc',
    [SortOptions.NUMBER_OF_SEASONS_WITH]: 'desc',
};

export const SORT_ARROWS: Record<SortDirection, string> = {
    asc: '▲',
    desc: '▼',
};

/** Shared selection behavior for the drawer and table headers. */
export const nextSortSelection = (
    current: {sortBy: SortOptions; sortDirection?: SortDirection; statScope: StatScope},
    sortBy: SortOptions,
): {sortBy: SortOptions; sortDirection?: SortDirection} => {
    if (current.statScope === StatScope.GAME) return {sortBy, sortDirection: 'desc'};
    if (current.sortBy !== sortBy) return {sortBy, sortDirection: undefined};
    const direction = current.sortDirection ?? SORT_DIRECTIONS[sortBy];
    return {sortBy, sortDirection: direction === 'asc' ? 'desc' : 'asc'};
};