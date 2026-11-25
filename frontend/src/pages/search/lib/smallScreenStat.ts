import {SortOptions} from "../../../types/SearchOptions";
import {PlayerSearchResult} from "../../../types/Player";
import type {SearchFilterState} from "../../../types/SearchFilterState";

const statForSort: Partial<Record<SortOptions, string>> = {
    [SortOptions.GOALS]: "total_goals",
    [SortOptions.ASSISTS]: "total_assists",
    [SortOptions.GOALS_AND_ASSISTS]: "goals_and_assists",
    [SortOptions.APPEARANCES]: "total_appearances",
    [SortOptions.MINUTES_PLAYED]: "total_minutes_played",
    [SortOptions.YELLOW_CARDS]: "total_yellow_cards",
    [SortOptions.RED_CARDS]: "total_red_cards",
    [SortOptions.MINUTES_PER_GOAL]: "mins_per_goal",
    [SortOptions.MINUTES_PER_ASSIST]: "mins_per_assist",
    [SortOptions.MINUTES_PER_GOAL_OR_ASSIST]: "mins_per_goal_or_assist",
    [SortOptions.MINUTES_PER_YELLOW]: "mins_per_yellow",
    [SortOptions.MINUTES_PER_RED]: "mins_per_red",
};

export function getCompactSearchStats(filters: SearchFilterState): string[] {
    const bounds = [
        ["total_appearances", filters.minimumAppearances, filters.maximumAppearances, 1],
        ["total_goals", filters.minimumGoals, filters.maximumGoals, 0],
        ["total_assists", filters.minimumAssists, filters.maximumAssists, 0],
        ["goals_and_assists", filters.minimumGoalsAndAssists, filters.maximumGoalsAndAssists, 0],
        ["total_yellow_cards", filters.minimumYellowCards, filters.maximumYellowCards, 0],
        ["total_red_cards", filters.minimumRedCards, filters.maximumRedCards, 0],
    ] as const;
    const stats = new Set<string>(bounds
        .filter(([, min, max, minBound]) => (min ?? -1) >= minBound || (max ?? -1) >= 0)
        .map(([field]) => field));
    if (!stats.size) stats.add(statForSort[filters.sortBy] ?? "total_goals");
    if (stats.delete("goals_and_assists")) {
        stats.add("total_goals");
        stats.add("total_assists");
    }
    return [...stats];
}

export const getDisplayTitleForSmallScreen = (sortBy: SortOptions): string | null => {
    switch (sortBy) {
        case SortOptions.GOALS:
            return "Goals";
        case SortOptions.ASSISTS:
            return "Assists";
        case SortOptions.GOALS_AND_ASSISTS:
            return "Goals and assists";
        case SortOptions.YELLOW_CARDS:
            return "Yellows";
        case SortOptions.RED_CARDS:
            return "Reds";
        case SortOptions.MINUTES_PLAYED:
            return "Mins";
        case SortOptions.APPEARANCES:
            return "Apps";
        case SortOptions.MINUTES_PER_GOAL:
            return "Mins per goal";
        case SortOptions.MINUTES_PER_ASSIST:
            return "Mins per assist";
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            return "Mins per goal or assist";
        case SortOptions.MINUTES_PER_YELLOW:
            return "Mins per yellow";
        case SortOptions.MINUTES_PER_RED:
            return "Mins per red";
        default:
            return null;
    }
};

export const getDisplayStatForSmallScreen = (sortBy: SortOptions, player: Partial<PlayerSearchResult>): number | string | null => {
    switch (sortBy) {
        case SortOptions.GOALS:
            return player.total_goals ?? '—';
        case SortOptions.ASSISTS:
            return player.total_assists ?? '—';
        case SortOptions.GOALS_AND_ASSISTS:
            return player.total_goals == null || player.total_assists == null ? '—' : player.total_goals + player.total_assists;
        case SortOptions.YELLOW_CARDS:
            return player.total_yellow_cards ?? '—';
        case SortOptions.RED_CARDS:
            return player.total_red_cards ?? '—';
        case SortOptions.MINUTES_PLAYED:
            return player.total_minutes_played ?? '—';
        case SortOptions.APPEARANCES:
            return player.total_appearances ?? '—';
        case SortOptions.MINUTES_PER_GOAL:
            return formatMinutesPerEvent(player.mins_per_goal);
        case SortOptions.MINUTES_PER_ASSIST:
            return formatMinutesPerEvent(player.mins_per_assist);
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            return formatMinutesPerEvent(player.mins_per_goal_or_assist);
        case SortOptions.MINUTES_PER_YELLOW:
            return formatMinutesPerEvent(player.mins_per_yellow);
        case SortOptions.MINUTES_PER_RED:
            return formatMinutesPerEvent(player.mins_per_red);
        default:
            return null;
    }
};

const rateFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
});

export const formatMinutesPerEvent = (value: number | null | undefined): string =>
    value == null ? '—' : rateFormatter.format(value);
