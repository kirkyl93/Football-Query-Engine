import {Country} from "../data/Countries";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "./SearchOptions";

export interface SearchFilterState {
    seasons: number[];
    competitions: string[];
    positions: string[];
    minuteFrom?: number;
    minuteTo?: number;
    minAge?: number;
    maxAge?: number;
    minHeight?: number;
    maxHeight?: number;
    playerNames: string[];
    playerCountries: Country[];
    clubsPlayedFor: number[];
    clubsPlayedAgainst: number[];
    subsOnly: boolean;
    earliestSubOnTime?: number;
    latestSubOnTime?: number;
    penalties: PenaltyOptions;
    homeOrAway: HomeOrAwayOptions;
    statScope: StatScope;
    sortBy: SortOptions;
    minimumAppearances?: number;
    minimumGoals?: number;
    maximumGoals?: number;
    minimumAssists?: number;
    maximumAssists?: number;
    minimumGoalsAndAssists?: number;
    maximumGoalsAndAssists?: number;
}