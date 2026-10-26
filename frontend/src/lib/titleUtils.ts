import {competitions} from "../data/Competitions";
import {formatSeason} from "./DateUtils";

/**
 * Pure, casing-agnostic helpers for building natural-language chart titles.
 * Sub-builders return bare clauses (no leading separators); composers join
 * them with `joinClauses` and prefix a capitalized headline.
 */

export const joinClauses = (...clauses: (string | undefined | null)[]): string =>
    clauses.filter((clause): clause is string => Boolean(clause)).join(", ");

export const joinList = (items: string[], conjunction = "or"): string => {
    if (items.length === 0) {
        return "";
    }
    if (items.length === 1) {
        return items[0];
    }
    return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
};

export const cap = (text: string): string =>
    text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);

export const describeSeasons = (seasons: number[], allLabel = "all seasons"): string => {
    if (seasons.length === 0) {
        return allLabel;
    }

    if (seasons.length === 1) {
        return formatSeason(seasons[0]);
    }

    const sorted = [...seasons].sort((a, b) => a - b);
    const isConsecutive = sorted.every((season, index, arr) => index === 0 || season - arr[index - 1] === 1);

    if (isConsecutive) {
        return `${formatSeason(sorted[0])}–${formatSeason(sorted[sorted.length - 1])}`;
    }

    if (sorted.length >= 10) {
        return `${sorted.length} seasons`;
    }

    return sorted.map(formatSeason).join(", ");
};

export const findCompetitionNameById = (competitionId: string): string => {
    const match = competitions.leagues.find(comp => comp.competitionId === competitionId)
        ?? competitions.europeanCompetitions.find(comp => comp.competitionId === competitionId);
    return match ? match.name : competitionId;
};

export const findCompetitionNameByName = (name: string): string => {
    const match = competitions.leagues.find(comp => comp.name === name)
        ?? competitions.europeanCompetitions.find(comp => comp.name === name);
    return match ? match.name : name;
};

export const describeCompetitions = (names: string[], allLabel = "all comps"): string => {
    if (names.length === 0) {
        return allLabel;
    }

    if (names.length >= 10) {
        return `${names.length} comps`;
    }

    return names.join(" + ");
};

export const describeRange = (
    min: number | undefined,
    max: number | undefined,
    singular: string,
    plural = `${singular}s`,
): string => {
    const lo = min ?? -1;
    const hi = max ?? -1;

    if (lo >= 0 && hi >= 0) {
        if (lo === hi) {
            return `exactly ${lo} ${lo === 1 ? singular : plural}`;
        }
        return `between ${lo} and ${hi} ${plural}`;
    }
    if (lo >= 0) {
        return `at least ${lo} ${lo === 1 ? singular : plural}`;
    }
    if (hi >= 0) {
        return `at most ${hi} ${hi === 1 ? singular : plural}`;
    }
    return "";
};

export const describeSpan = (
    min: number | undefined,
    max: number | undefined,
    unit: string,
): string => {
    const lo = min ?? 0;
    const hi = max ?? 0;

    if (lo > 0 && hi > 0) {
        return lo === hi ? `${lo} ${unit}`.trim() : `${lo}–${hi} ${unit}`.trim();
    }
    if (lo > 0) {
        return `${lo}+ ${unit}`.trim();
    }
    if (hi > 0) {
        return `up to ${hi} ${unit}`.trim();
    }
    return "";
};

export const describeAge = (min: number | undefined, max: number | undefined): string => {
    const span = describeSpan(min, max, "");
    return span ? `aged ${span}` : "";
};
