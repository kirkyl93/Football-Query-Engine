import { competitions } from "../../../data/Competitions";
import type { Country } from "../../../data/Countries";
import { formatSeason } from "../../../lib/DateUtils";
import { SortOptions, StatScope } from "../../../types/SearchOptions";
import { sortTypes, statScopes } from "./searchFilterOptions";

/**
 * Short human-readable summaries shown on collapsed filter sections,
 * so active filters are visible without expanding. Empty string means
 * "nothing set" and renders nothing.
 */
export const seasonSummary = (seasons: number[]): string => {
    if (seasons.length === 0) {
        return "";
    }
    const sorted = [...seasons].sort((a, b) => a - b);
    const isConsecutive = sorted.every((s, i, arr) => i === 0 || s - arr[i - 1] === 1);
    if (isConsecutive) {
        if (sorted.length === 1) {
            return formatSeason(sorted[0]);
        }
        return `${formatSeason(sorted[0])}-${formatSeason(sorted[sorted.length - 1])}`;
    }
    if (sorted.length <= 2) {
        return sorted.map(formatSeason).join(" · ");
    }
    return `${sorted.length} seasons`;
};

export const competitionSummary = (competitionIds: string[]): string => {
    if (competitionIds.length === 0) {
        return "";
    }
    if (competitionIds.length !== 1) {
        return `${competitionIds.length} comps`;
    }
    const league = competitions.leagues.find((c) => c.competitionId === competitionIds[0]);
    if (league) {
        return league.name;
    }
    const euro = competitions.europeanCompetitions.find((c) => c.competitionId === competitionIds[0]);
    return euro ? euro.name : competitionIds[0];
};

export const positionSummary = (positions: string[]): string => {
    if (positions.length > 5) {
        return `${positions.length} positions`;
    }
    return positions.join(" · ");
};

export const minMaxSummary = (
    minValue: number | undefined,
    maxValue: number | undefined,
    unit: string,
): string => {
    if (minValue !== undefined && maxValue !== undefined) {
        return `${minValue}${unit}–${maxValue}${unit}`;
    }
    if (minValue !== undefined) {
        return `From ${minValue}${unit}`;
    }
    if (maxValue !== undefined) {
        return `Up to ${maxValue}${unit}`;
    }
    return "";
};

export const namesSummary = (names: string[]): string => {
    if (names.length === 0) {
        return "";
    }
    if (names.length <= 2) {
        return names.join(" + ");
    }
    return `${names.length} names`;
};

export const countriesSummary = (countries: Country[]): string => {
    if (countries.length === 0) {
        return "";
    }
    if (countries.length <= 3) {
        return countries.map((c) => c.name).join(" + ");
    }
    return `${countries.length} countries`;
};

export const clubsSummary = (playedFor: number[], playedAgainst: number[]): string => {
    const parts: string[] = [];
    if (playedFor.length > 0) {
        parts.push(`For: ${playedFor.length}`);
    }
    if (playedAgainst.length > 0) {
        parts.push(`Against: ${playedAgainst.length}`);
    }
    return parts.join(" · ");
};

export const subsSummary = (
    subsOnly: boolean,
    earliestSubOnTime: number | undefined,
    latestSubOnTime: number | undefined,
): string => {
    if (!subsOnly) {
        return "";
    }
    let summary = "Subs only";
    if (earliestSubOnTime !== undefined) {
        summary += ` from ${earliestSubOnTime}'`;
    }
    if (latestSubOnTime !== undefined) {
        summary += ` to ${latestSubOnTime}'`;
    }
    return summary;
};

export const radioSummary = (
    selectedId: string,
    options: { id: string; name: string }[],
    defaultId: string,
): string => {
    if (selectedId === defaultId) {
        return "";
    }
    return options.find((o) => o.id === selectedId)?.name ?? "";
};

/**
 * Compact sort labels for the collapsed summary. The full detail
 * (thresholds etc.) already lives in the table title and the expanded
 * section, so the summary stays scannable.
 */
export const SHORT_SORT_NAMES: Record<SortOptions, string> = {
    [SortOptions.GOALS]: "Goals",
    [SortOptions.ASSISTS]: "Assists",
    [SortOptions.GOALS_AND_ASSISTS]: "Goals + Assists",
    [SortOptions.APPEARANCES]: "Apps",
    [SortOptions.MINUTES_PLAYED]: "Mins",
    [SortOptions.YELLOW_CARDS]: "Yellows",
    [SortOptions.RED_CARDS]: "Reds",
    [SortOptions.MINUTES_PER_GOAL]: "Mins/goal",
    [SortOptions.MINUTES_PER_ASSIST]: "Mins/assist",
    [SortOptions.MINUTES_PER_GOAL_OR_ASSIST]: "Mins/G+A",
    [SortOptions.MINUTES_PER_YELLOW]: "Mins/yellow",
    [SortOptions.MINUTES_PER_RED]: "Mins/red",
    [SortOptions.NUMBER_OF_GAMES_WITH]: "Games with",
    [SortOptions.NUMBER_OF_SEASONS_WITH]: "Seasons with",
};

export const sortSummary = (sortBy: SortOptions, statScope: StatScope): string => {
    const sort = SHORT_SORT_NAMES[sortBy] ?? sortTypes.find((s) => s.id === sortBy)?.name ?? sortBy;
    const scope = statScopes.find((s) => s.id === statScope)?.name ?? statScope;
    return `${sort} · ${scope}`;
};
