import {afterEach, describe, expect, it, vi} from "vitest";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    NaturalLanguageSearchResponse,
    translateNaturalLanguageSearch,
} from "./naturalLanguageSearch";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "../types/SearchOptions";

describe("naturalLanguageFiltersToSearchState", () => {
    it("clears homepage defaults for absent proposal fields", () => {
        const state = naturalLanguageFiltersToSearchState({minAge: 30, competitions: ["GB1"]});
        expect(state.minAge).toBe(30);
        expect(state.competitions).toEqual(["GB1"]);
        expect(state.seasons).toEqual([]);
        expect(state.positions).toEqual([]);
        expect(state.clubsPlayedFor).toEqual([]);
        expect(state.clubsPlayedAgainst).toEqual([]);
        expect(state.playerCountries).toEqual([]);
        expect(state.penalties).toBe(PenaltyOptions.INCLUDE_PENALTIES);
        expect(state.homeOrAway).toBe(HomeOrAwayOptions.EITHER);
        expect(state.statScope).toBe(StatScope.OVERALL);
        expect(state.sortBy).toBe(SortOptions.GOALS);
    });

    it("maps country codes to frontend country objects", () => {
        const state = naturalLanguageFiltersToSearchState({countries: [" ES ", "gb-eng"]});
        expect(state.playerCountries.map(country => country.code)).toEqual(expect.arrayContaining(["es", "gb-eng"]));
    });

    it("maps numeric and enum filters", () => {
        const state = naturalLanguageFiltersToSearchState({
            seasons: [2020, 2021], positions: ["FW"], minuteFrom: 60, minuteTo: 90,
            maxAge: 25, minHeight: 180, playerNames: ["Alex"],
            penalties: PenaltyOptions.EXCLUDE_PENALTIES, homeOrAway: HomeOrAwayOptions.HOME,
            statScope: StatScope.SEASON, sortBy: SortOptions.ASSISTS,
            minimumAppearances: 10, minimumGoals: 2, maximumGoals: 20,
            minimumAssists: 1, maximumAssists: 10, minimumGoalsAndAssists: 5,
            maximumGoalsAndAssists: 30,
        });
        expect(state).toMatchObject({
            seasons: [2020, 2021], positions: ["FW"], minuteFrom: 60, minuteTo: 90,
            maxAge: 25, minHeight: 180, playerNames: ["Alex"],
            penalties: PenaltyOptions.EXCLUDE_PENALTIES, homeOrAway: HomeOrAwayOptions.HOME,
            statScope: StatScope.SEASON, sortBy: SortOptions.ASSISTS,
            minimumAppearances: 10, minimumGoals: 2, maximumGoals: 20,
            minimumAssists: 1, maximumAssists: 10, minimumGoalsAndAssists: 5,
            maximumGoalsAndAssists: 30,
        });
    });
});

describe("getNaturalLanguageSearchIssue", () => {
    const makeResponse = (overrides: Partial<NaturalLanguageSearchResponse> = {}): NaturalLanguageSearchResponse => ({
        summary: "Top scorers", errorCode: null, filters: {}, ...overrides,
    });
    it("returns actionable guidance for ambiguous queries", () => {
        expect(getNaturalLanguageSearchIssue(makeResponse({errorCode: "ambiguous_query", summary: "Specify a competition."}))).toBe("Specify a competition.");
    });
    it("returns null for successful translation", () => expect(getNaturalLanguageSearchIssue(makeResponse())).toBeNull());
    it("returns summary for unsupported filters", () => {
        expect(getNaturalLanguageSearchIssue(makeResponse({errorCode: "unsupported_filter", summary: "That filter is not supported"}))).toBe("That filter is not supported");
    });
});

describe("translateNaturalLanguageSearch", () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    it("preserves the API's explanation when a query is rejected", async () => {
        const message = "Specify a ranking statistic, such as minutes per goal or minutes per assist.";
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false, status: 422,
            json: async () => ({error: "ambiguous_query", message, filters: {competitions: ["GB1"]}}),
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(translateNaturalLanguageSearch("Most efficient Premier League players")).rejects.toThrow(message);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({query: "Most efficient Premier League players"});
    });

    it("accepts the simplified success response", async () => {
        const result = {summary: "Premier League top scorers", errorCode: null, filters: {competitions: ["GB1"], sortBy: "g"}};
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: true, json: async () => result}));
        await expect(translateNaturalLanguageSearch("Premier League top scorers")).resolves.toEqual(result);
    });
});
