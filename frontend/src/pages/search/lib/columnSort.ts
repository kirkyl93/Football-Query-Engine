import { SortOptions } from "../../../types/SearchOptions";

export type SortDirection = 'asc' | 'desc';

/**
 * True ordering applied by the backend for each sort. Everything is
 * descending except the minutes-per-event sorts (lower is better).
 * The header arrow mirrors this so it never lies.
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

/**
 * The Goals header doubles as the Goals+Assists control (there is no
 * G+A column): clicking it cycles Goals -> Goals+Assists -> Goals.
 * Every other header just selects its own sort.
 */
export const nextSortForColumn = (
    currentSort: SortOptions,
    columnSort: SortOptions,
): SortOptions => {
    if (columnSort === SortOptions.GOALS) {
        if (currentSort === SortOptions.GOALS) {
            return SortOptions.GOALS_AND_ASSISTS;
        }
        if (currentSort === SortOptions.GOALS_AND_ASSISTS) {
            return SortOptions.GOALS;
        }
    }
    return columnSort;
};
