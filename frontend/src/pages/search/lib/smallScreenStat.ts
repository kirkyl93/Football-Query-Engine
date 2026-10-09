import {SortOptions} from "../../../types/SearchOptions";
import {PlayerSearchResult} from "../../../types/Player";

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

export const getDisplayStatForSmallScreen = (sortBy: SortOptions, player: PlayerSearchResult): number | null => {
    switch (sortBy) {
        case SortOptions.GOALS:
            return player.total_goals;
        case SortOptions.ASSISTS:
            return player.total_assists;
        case SortOptions.GOALS_AND_ASSISTS:
            return player.total_goals + player.total_assists;
        case SortOptions.YELLOW_CARDS:
            return player.total_yellow_cards;
        case SortOptions.RED_CARDS:
            return player.total_red_cards;
        case SortOptions.MINUTES_PLAYED:
            return player.total_minutes_played;
        case SortOptions.APPEARANCES:
            return player.total_appearances;
        case SortOptions.MINUTES_PER_GOAL:
            return player.mins_per_goal;
        case SortOptions.MINUTES_PER_ASSIST:
            return player.mins_per_assist;
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            return player.mins_per_goal_or_assist;
        case SortOptions.MINUTES_PER_YELLOW:
            return player.mins_per_yellow;
        case SortOptions.MINUTES_PER_RED:
            return player.mins_per_red;
        default:
            return null;
    }
};
