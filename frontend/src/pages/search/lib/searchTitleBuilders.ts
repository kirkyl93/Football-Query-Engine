import {SearchFilterState} from "../../../types/SearchFilterState";
import {
    HomeOrAwayOptions,
    minuteBasedSortOptions,
    numberOfGamesOrSeasonsSortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope,
} from "../../../types/SearchOptions";
import {
    describeAge,
    describeCompetitions,
    describeRange,
    describeSeasons,
    describeSpan,
    findCompetitionNameById,
    joinClauses,
    joinList,
} from "../../../lib/titleUtils";

/**
 * Pure title-string builders for the search header.
 * Each builder returns a bare clause; `constructSearchTitle` joins them
 * under a headline: "Top scorers: Premier League, 2025/26, aged 20–30".
 */

const SORT_HEADLINES: Record<SortOptions, string> = {
    [SortOptions.GOALS]: "Top scorers",
    [SortOptions.ASSISTS]: "Most assists",
    [SortOptions.GOALS_AND_ASSISTS]: "Most goals and assists",
    [SortOptions.APPEARANCES]: "Most appearances",
    [SortOptions.MINUTES_PLAYED]: "Most minutes played",
    [SortOptions.YELLOW_CARDS]: "Most yellow cards",
    [SortOptions.RED_CARDS]: "Most red cards",
    [SortOptions.MINUTES_PER_GOAL]: "Fewest minutes per goal",
    [SortOptions.MINUTES_PER_ASSIST]: "Fewest minutes per assist",
    [SortOptions.MINUTES_PER_GOAL_OR_ASSIST]: "Fewest minutes per goal or assist",
    [SortOptions.MINUTES_PER_YELLOW]: "Fewest minutes per yellow card",
    [SortOptions.MINUTES_PER_RED]: "Fewest minutes per red card",
    [SortOptions.NUMBER_OF_GAMES_WITH]: "Most games with",
    [SortOptions.NUMBER_OF_SEASONS_WITH]: "Most seasons with",
};

export const sortByTitle = (filterState: SearchFilterState): string =>
    SORT_HEADLINES[filterState.sortBy];

export const sortCriteriaTitle = (filterState: SearchFilterState): string => {
    if (minuteBasedSortOptions.includes(filterState.sortBy)) {
        const minimumAppearances = filterState.minimumAppearances ?? 0;
        return minimumAppearances > 0 ? `at least ${minimumAppearances} appearances` : "";
    }

    if (numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy)) {
        return joinClauses(
            describeRange(filterState.minimumGoals, filterState.maximumGoals, "goal"),
            describeRange(filterState.minimumAssists, filterState.maximumAssists, "assist"),
            describeRange(
                filterState.minimumGoalsAndAssists,
                filterState.maximumGoalsAndAssists,
                "goal and assist",
                "goals and assists",
            ),
        );
    }

    return "";
};

export const statScopeTitle = (filterState: SearchFilterState): string => {
    if (filterState.statScope === StatScope.SEASON) {
        return "per-season stats";
    }

    if (filterState.statScope === StatScope.GAME) {
        return "per-game stats";
    }

    return "";
};

export const competitionsTitle = (filterState: SearchFilterState): string =>
    describeCompetitions(filterState.competitions.map(findCompetitionNameById));

export const seasonsTitle = (filterState: SearchFilterState): string =>
    describeSeasons(filterState.seasons);

export const positionTitle = (filterState: SearchFilterState): string =>
    joinList(filterState.positions);

export const minsTitle = (filterState: SearchFilterState): string => {
    const from = filterState.minuteFrom ?? 0;
    const to = filterState.minuteTo ?? 0;

    if (from > 0 && to > 0) {
        return from === to ? `minute ${from}` : `minutes ${from}–${to}`;
    }
    if (from > 0) {
        return `from minute ${from}`;
    }
    if (to > 0) {
        return `until minute ${to}`;
    }
    return "";
};

export const ageTitle = (filterState: SearchFilterState): string =>
    describeAge(filterState.minAge, filterState.maxAge);

export const heightTitle = (filterState: SearchFilterState): string =>
    describeSpan(filterState.minHeight, filterState.maxHeight, "cm");

export const namesTitle = (filterState: SearchFilterState): string =>
    joinList(filterState.playerNames);

export const countriesTitle = (filterState: SearchFilterState): string =>
    joinList(filterState.playerCountries.map(country => country.name));

export const subsTitle = (filterState: SearchFilterState): string => {
    if (!filterState.subsOnly) {
        return "";
    }

    const earliest = filterState.earliestSubOnTime ?? 0;
    const latest = filterState.latestSubOnTime ?? 0;

    let timing = "";
    if (earliest > 0 && latest > 0) {
        timing = earliest === latest
            ? `came on in minute ${earliest}`
            : `came on between minutes ${earliest} and ${latest}`;
    } else if (earliest > 0) {
        timing = `came on from minute ${earliest} onwards`;
    } else if (latest > 0) {
        timing = `came on by minute ${latest}`;
    }

    return timing || "subs only";
};

export const pensTitle = (filterState: SearchFilterState): string => {
    if (filterState.penalties === PenaltyOptions.EXCLUDE_PENALTIES) {
        return "excluding penalties";
    }

    if (filterState.penalties === PenaltyOptions.ONLY_PENALTIES) {
        return "penalties only";
    }

    return "";
};

export const homeOrAwayTitle = (filterState: SearchFilterState): string => {
    if (filterState.homeOrAway === HomeOrAwayOptions.HOME) {
        return "home matches";
    }

    if (filterState.homeOrAway === HomeOrAwayOptions.AWAY) {
        return "away matches";
    }

    return "";
};

export const constructSearchTitle = (filterState: SearchFilterState): string => {
    const headline = sortByTitle(filterState);
    const criteria = joinClauses(
        sortCriteriaTitle(filterState),
        statScopeTitle(filterState),
        competitionsTitle(filterState),
        seasonsTitle(filterState),
        positionTitle(filterState),
        minsTitle(filterState),
        ageTitle(filterState),
        heightTitle(filterState),
        namesTitle(filterState),
        countriesTitle(filterState),
        subsTitle(filterState),
        pensTitle(filterState),
        homeOrAwayTitle(filterState),
    );

    return criteria ? `${headline}: ${criteria}` : headline;
}

/** Display the ranking separately from complete, independently wrapping filters. */
export const constructSearchTitleParts = (filterState: SearchFilterState) => {
    const isCount = numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy);
    const criteria = sortCriteriaTitle(filterState);
    const headline = isCount
        ? criteria ? `${sortByTitle(filterState)} ${criteria}`
            : filterState.sortBy === SortOptions.NUMBER_OF_SEASONS_WITH ? "Most qualifying seasons" : "Most qualifying games"
        : sortByTitle(filterState);
    const filters = [
        competitionsTitle(filterState), seasonsTitle(filterState), statScopeTitle(filterState),
        positionTitle(filterState), minsTitle(filterState), ageTitle(filterState),
        heightTitle(filterState), namesTitle(filterState), countriesTitle(filterState),
        subsTitle(filterState), pensTitle(filterState), homeOrAwayTitle(filterState),
        isCount ? "" : criteria,
    ].filter(Boolean);
    return {headline, filters};
};
