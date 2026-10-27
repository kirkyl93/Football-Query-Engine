import {afterEach, describe, expect, it, vi} from "vitest";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    NaturalLanguageSearchResponse,
    translateNaturalLanguageSearch,
} from "./naturalLanguageSearch";
import {HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope} from "../types/SearchOptions";
import {filterStateToSearchParams} from "../pages/search/lib/searchParamsSerializer";

describe("naturalLanguageFiltersToSearchState", () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    const mockClubLookup = (clubs: Record<string, {club_id: number; name: string}[]>) => {
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            const query = new URL(url, "http://localhost").searchParams.get("search_name")!;
            return {ok: true, json: async () => clubs[query.toLowerCase()] ?? []};
        });
        vi.stubGlobal("fetch", fetchMock);
        return fetchMock;
    };

    it("resolves club names into IDs for both filters and the search URL", async () => {
        mockClubLookup({
            "manchester united": [{club_id: 985, name: "Manchester United"}],
            "arsenal": [{club_id: 11, name: "Arsenal FC"}],
            "chelsea": [{club_id: 631, name: "Chelsea FC"}],
        });
        const state = await naturalLanguageFiltersToSearchState({
            clubsPlayedFor: ["Manchester United", "Arsenal FC"],
            clubsPlayedAgainst: ["Chelsea FC"],
        });
        expect(state.clubsPlayedFor).toEqual([985, 11]);
        expect(state.clubsPlayedAgainst).toEqual([631]);
        const params = filterStateToSearchParams(state);
        expect(params.get("clubspf")).toBe("985,11");
        expect(params.get("clubspa")).toBe("631");
    });

    it("trims club names and deduplicates club IDs", async () => {
        mockClubLookup({"manchester united": [{club_id: 985, name: "Manchester United"}]});
        const state = await naturalLanguageFiltersToSearchState({
            clubsPlayedFor: [" Manchester United ", "manchester united"],
        });
        expect(state.clubsPlayedFor).toEqual([985]);
    });

    it.each(["clubsPlayedFor", "clubsPlayedAgainst"] as const)("uses the top-ranked Newcastle lookup for %s", async field => {
        const fetchMock = mockClubLookup({"newcastle united": [{club_id: 762, name: "Newcastle United"}]});
        const controller = new AbortController();
        const state = await naturalLanguageFiltersToSearchState({[field]: ["Newcastle United"]}, controller.signal);
        expect(state[field]).toEqual([762]);
        const params = new URL(fetchMock.mock.calls[0][0], "http://localhost").searchParams;
        expect(params.get("search_name")).toBe("Newcastle United");
        expect(params.get("limit")).toBe("1");
        expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });

    it.each(["clubsPlayedFor", "clubsPlayedAgainst"] as const)("logs unknown %s and keeps recognised clubs", async field => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        mockClubLookup({"manchester united": [{club_id: 985, name: "Manchester United"}]});
        const state = await naturalLanguageFiltersToSearchState({[field]: ["Manchester United", "Doncaster Rovers"]});
        expect(state[field]).toEqual([985]);
        expect(warn).toHaveBeenCalledWith("Dropping unrecognised club in search translation:", "Doncaster Rovers");
    });

    it.each(["Crystal Palace FC", "fc Crystal Palace", "Crystal Palace F.C."])("removes FC from lookup %s", async name => {
        const fetchMock = mockClubLookup({"crystal palace": [{club_id: 873, name: "Crystal Palace"}]});
        const state = await naturalLanguageFiltersToSearchState({clubsPlayedAgainst: [name]});
        expect(state.clubsPlayedAgainst).toEqual([873]);
        const params = new URL(fetchMock.mock.calls[0][0], "http://localhost").searchParams;
        expect(params.get("search_name")).toBe("Crystal Palace");
    });

    it("keeps meaningful name parts such as AFC", async () => {
        const fetchMock = mockClubLookup({"afc bournemouth": [{club_id: 989, name: "AFC Bournemouth"}]});
        const state = await naturalLanguageFiltersToSearchState({clubsPlayedFor: ["AFC Bournemouth"]});
        expect(state.clubsPlayedFor).toEqual([989]);
        expect(new URL(fetchMock.mock.calls[0][0], "http://localhost").searchParams.get("search_name"))
            .toBe("AFC Bournemouth");
    });

    it("allows all club names to be unrecognised and preserves other filters", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        mockClubLookup({});
        const state = await naturalLanguageFiltersToSearchState({clubsPlayedAgainst: ["Doncaster Rovers"], competitions: ["GB1"]});
        expect(state.clubsPlayedAgainst).toEqual([]);
        expect(state.competitions).toEqual(["GB1"]);
    });

    it("reports club lookup failures without applying incomplete filters", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok: false, status: 503}));
        await expect(naturalLanguageFiltersToSearchState({clubsPlayedFor: ["Newcastle"]}))
            .rejects.toThrow("Club lookup failed (503)");
    });

    it("clears homepage defaults for absent proposal fields", async () => {
        const state = await naturalLanguageFiltersToSearchState({minAge: 30, competitions: ["GB1"]});
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
        expect(state.subsOnly).toBe(false);
        expect(state.earliestSubOnTime).toBeUndefined();
        expect(state.latestSubOnTime).toBeUndefined();
    });

    it("maps substitute appearances and entry times into the actual search URL", async () => {
        const state = await naturalLanguageFiltersToSearchState({
            subsOnly: true, earliestSubOnTime: 60, latestSubOnTime: 75, minuteFrom: 81,
        });
        expect(state).toMatchObject({subsOnly: true, earliestSubOnTime: 60, latestSubOnTime: 75, minuteFrom: 81});
        const params = filterStateToSearchParams(state);
        expect(params.get("subonly")).toBe("1");
        expect(params.get("earliestsub")).toBe("60");
        expect(params.get("latestsub")).toBe("75");
        expect(params.get("minfrom")).toBe("81");
    });

    it.each([
        {},
        {earliestSubOnTime: 61},
        {latestSubOnTime: 59},
        {earliestSubOnTime: 46, latestSubOnTime: 46},
    ])("preserves optional entry bounds for substitutes: %j", async bounds => {
        const state = await naturalLanguageFiltersToSearchState({subsOnly: true, ...bounds});
        expect(state.subsOnly).toBe(true);
        expect(state.earliestSubOnTime).toBe(bounds.earliestSubOnTime);
        expect(state.latestSubOnTime).toBe(bounds.latestSubOnTime);
    });

    it.each([undefined, false])("clears inactive entry bounds when subsOnly is %s", async subsOnly => {
        const state = await naturalLanguageFiltersToSearchState({subsOnly, earliestSubOnTime: 60, latestSubOnTime: 75});
        expect(state.subsOnly).toBe(false);
        expect(state.earliestSubOnTime).toBeUndefined();
        expect(state.latestSubOnTime).toBeUndefined();
        const params = filterStateToSearchParams(state);
        expect(params.has("subonly")).toBe(false);
        expect(params.has("earliestsub")).toBe(false);
        expect(params.has("latestsub")).toBe(false);
    });

    it("maps country codes to frontend country objects", async () => {
        const state = await naturalLanguageFiltersToSearchState({countries: [" ES ", "gb-eng"]});
        expect(state.playerCountries.map(country => country.code)).toEqual(expect.arrayContaining(["es", "gb-eng"]));
    });

    it("maps numeric and enum filters", async () => {
        const state = await naturalLanguageFiltersToSearchState({
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
