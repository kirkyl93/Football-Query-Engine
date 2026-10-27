import {countries} from "../data/Countries";
import {API_BASE_URL} from "../config";
import {Club} from "../types/Club";
import {SearchFilterState} from "../types/SearchFilterState";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "../types/SearchOptions";

/** Mirrors the backend FilterProposal JSON contract. */
export interface NaturalLanguageFilterProposal {
    seasons?: number[];
    competitions?: string[];
    positions?: string[];
    minuteFrom?: number;
    minuteTo?: number;
    minAge?: number;
    maxAge?: number;
    minHeight?: number;
    maxHeight?: number;
    playerNames?: string[];
    clubsPlayedFor?: string[];
    clubsPlayedAgainst?: string[];
    subsOnly?: boolean;
    earliestSubOnTime?: number;
    latestSubOnTime?: number;
    countries?: string[];
    penalties?: PenaltyOptions;
    homeOrAway?: HomeOrAwayOptions;
    statScope?: StatScope;
    sortBy?: SortOptions;
    minimumAppearances?: number;
    minimumGoals?: number;
    maximumGoals?: number;
    minimumAssists?: number;
    maximumAssists?: number;
    minimumGoalsAndAssists?: number;
    maximumGoalsAndAssists?: number;
}

export interface NaturalLanguageSearchResponse {
    summary: string;
    errorCode: string | null;
    filters: NaturalLanguageFilterProposal;
}

interface NaturalLanguageSearchError {
    error?: string;
    message?: string;
}

/** Calls POST /natural-language-search. Pass a signal to cancel an in-flight request. */
export async function translateNaturalLanguageSearch(
    query: string,
    signal?: AbortSignal,
): Promise<NaturalLanguageSearchResponse> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) throw new Error("Enter a search query.");
    if (normalizedQuery.length > 500) throw new Error("Search queries must be 500 characters or fewer.");

    const response = await fetch(`${API_BASE_URL}/natural-language-search`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({query: normalizedQuery}),
        signal,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null) as NaturalLanguageSearchError | null;
        throw new Error(body?.message || body?.error || `Search translation failed (${response.status}).`);
    }

    return await response.json() as Promise<NaturalLanguageSearchResponse>;
}

/**
 * Maps the backend's sparse proposal to the existing search state. Do not use
 * createDefaultSearchFilterState here: it intentionally preselects PL/2025.
 */
export async function naturalLanguageFiltersToSearchState(
    proposal: NaturalLanguageFilterProposal,
    signal?: AbortSignal,
): Promise<SearchFilterState> {
    const [clubsPlayedFor, clubsPlayedAgainst] = await Promise.all([
        resolveClubNames(proposal.clubsPlayedFor, signal),
        resolveClubNames(proposal.clubsPlayedAgainst, signal),
    ]);
    const countryCodes = new Set((proposal.countries ?? []).map(code => code.trim().toLowerCase()));
    return {
        seasons: proposal.seasons ?? [],
        competitions: proposal.competitions ?? [],
        positions: proposal.positions ?? [],
        minuteFrom: proposal.minuteFrom,
        minuteTo: proposal.minuteTo,
        minAge: proposal.minAge,
        maxAge: proposal.maxAge,
        minHeight: proposal.minHeight,
        maxHeight: proposal.maxHeight,
        playerNames: proposal.playerNames ?? [],
        playerCountries: countries.filter(country => countryCodes.has(country.code.toLowerCase())),
        clubsPlayedFor,
        clubsPlayedAgainst,
        subsOnly: proposal.subsOnly ?? false,
        earliestSubOnTime: proposal.subsOnly ? proposal.earliestSubOnTime : undefined,
        latestSubOnTime: proposal.subsOnly ? proposal.latestSubOnTime : undefined,
        penalties: proposal.penalties ?? PenaltyOptions.INCLUDE_PENALTIES,
        homeOrAway: proposal.homeOrAway ?? HomeOrAwayOptions.EITHER,
        statScope: proposal.statScope ?? StatScope.OVERALL,
        sortBy: proposal.sortBy ?? SortOptions.GOALS,
        minimumAppearances: proposal.minimumAppearances,
        minimumGoals: proposal.minimumGoals,
        maximumGoals: proposal.maximumGoals,
        minimumAssists: proposal.minimumAssists,
        maximumAssists: proposal.maximumAssists,
        minimumGoalsAndAssists: proposal.minimumGoalsAndAssists,
        maximumGoalsAndAssists: proposal.maximumGoalsAndAssists,
    };
}

async function resolveClubNames(names: string[] = [], signal?: AbortSignal): Promise<number[]> {
    const ids = await Promise.all(names.map(async name => {
        const searchName = name.trim().split(/\s+/).filter(word => !/^f\.?c\.?$/i.test(word)).join(" ");
        if (!searchName) {
            console.warn("Dropping unrecognised club in search translation:", name.slice(0, 100));
            return null;
        }
        const params = new URLSearchParams({search_name: searchName, limit: "1"});
        const response = await fetch(`${API_BASE_URL}/clubs?${params}`, {signal});
        if (!response.ok) {
            throw new Error(`Club lookup failed (${response.status}). Please try again.`);
        }
        // The endpoint prioritises GB1/ES1/IT1/FR1, then stadium capacity.
        const matches = await response.json() as Club[];
        if (matches.length === 0) {
            console.warn("Dropping unrecognised club in search translation:", name.slice(0, 100));
            return null;
        }
        return matches[0].club_id;
    }));
    return [...new Set(ids.filter((id): id is number => id !== null))];
}

/** Returns a rejection message, or null when usable. */
export function getNaturalLanguageSearchIssue(response: NaturalLanguageSearchResponse): string | null {
    if (response.errorCode) return response.summary;
    return null;
}
