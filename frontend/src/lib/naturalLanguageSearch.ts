import {countries} from "../data/Countries";
import {API_BASE_URL} from "../config";
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
 * Club and substitute-only fields are not currently part of the backend contract.
 */
export function naturalLanguageFiltersToSearchState(
    proposal: NaturalLanguageFilterProposal,
): SearchFilterState {
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
        clubsPlayedFor: [],
        clubsPlayedAgainst: [],
        subsOnly: false,
        earliestSubOnTime: undefined,
        latestSubOnTime: undefined,
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

/** Returns a rejection message, or null when usable. */
export function getNaturalLanguageSearchIssue(response: NaturalLanguageSearchResponse): string | null {
    if (response.errorCode) return response.summary;
    return null;
}
