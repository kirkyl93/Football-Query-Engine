import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import NaturalLanguageSearchBar from "./NaturalLanguageSearchBar";
import {SearchFilterState} from "../../../types/SearchFilterState";

vi.mock("../../../lib/naturalLanguageSearch", () => ({
    translateNaturalLanguageSearch: vi.fn(),
    naturalLanguageFiltersToSearchState: vi.fn(),
    getNaturalLanguageSearchIssue: vi.fn(),
}));

import type {NaturalLanguageSearchResponse} from "../../../lib/naturalLanguageSearch";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    translateNaturalLanguageSearch,
} from "../../../lib/naturalLanguageSearch";

const mockedTranslate = vi.mocked(translateNaturalLanguageSearch);
const mockedToSearchState = vi.mocked(naturalLanguageFiltersToSearchState);
const mockedGetIssue = vi.mocked(getNaturalLanguageSearchIssue);

const makeResponse = (overrides: Partial<NaturalLanguageSearchResponse> = {}): NaturalLanguageSearchResponse => ({
    summary: "English strikers with 10+ goals in 2019/20",
    errorCode: null,
    filters: {},
    ...overrides,
});

const mappedState = {marker: "mapped"} as unknown as SearchFilterState;

describe("NaturalLanguageSearchBar", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("submits on Enter and applies the mapped filters", async () => {
        const onApplyFilters = vi.fn();
        mockedTranslate.mockResolvedValue(makeResponse());
        mockedGetIssue.mockReturnValue(null);
        mockedToSearchState.mockReturnValue(mappedState);

        render(<NaturalLanguageSearchBar onApplyFilters={onApplyFilters} />);
        await userEvent.type(screen.getByRole("textbox"), "top scorers in England{enter}");

        await waitFor(() => expect(onApplyFilters).toHaveBeenCalledWith(mappedState));
        expect(mockedToSearchState).toHaveBeenCalledWith(makeResponse().filters);
        expect(screen.getByText(/Results for: English strikers/)).toBeInTheDocument();
    });

    it("disables the submit button while a search is in flight", async () => {
        let resolve!: (response: NaturalLanguageSearchResponse) => void;
        mockedTranslate.mockImplementation(
            () => new Promise<NaturalLanguageSearchResponse>((res) => { resolve = res; }),
        );

        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        await userEvent.type(screen.getByRole("textbox"), "query{enter}");

        expect(screen.getByRole("button", {name: "Run search"})).toBeDisabled();
        expect(screen.getByRole("status")).toHaveTextContent("Finding the right filters");
        expect(screen.getByRole("textbox")).toBeDisabled();

        resolve(makeResponse());
        await screen.findByText(/Results for:/);
        expect(screen.getByRole("button", {name: "Run search"})).toBeEnabled();
    });

    it("ignores empty and whitespace-only questions", async () => {
        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        const user = userEvent.setup();
        const input = screen.getByRole("textbox");

        await user.click(input);
        await user.keyboard("{enter}");
        await user.type(input, "   {enter}");

        expect(screen.queryByRole("button", {name: "Run search"})).not.toBeInTheDocument();
        expect(mockedTranslate).not.toHaveBeenCalled();
    });

    it("allows multiline editing and submits with the in-box arrow", async () => {
        mockedTranslate.mockResolvedValue(makeResponse());
        mockedGetIssue.mockReturnValue(null);
        mockedToSearchState.mockReturnValue(mappedState);
        const onApplyFilters = vi.fn();
        render(<NaturalLanguageSearchBar onApplyFilters={onApplyFilters} />);
        const user = userEvent.setup();
        const input = screen.getByRole("textbox");

        await user.type(input, "Most assists{shift>}{enter}{/shift}in La Liga");
        expect(input).toHaveValue("Most assists\nin La Liga");
        expect(mockedTranslate).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", {name: "Run search"}));
        await waitFor(() => expect(onApplyFilters).toHaveBeenCalledWith(mappedState));
        expect(mockedTranslate).toHaveBeenCalledWith("Most assists\nin La Liga", expect.anything());
    });

    it("does not search when Enter confirms an IME composition", async () => {
        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        const input = screen.getByRole("textbox");
        await userEvent.type(input, "Most assists");

        fireEvent.keyDown(input, {key: "Enter", isComposing: true});
        expect(mockedTranslate).not.toHaveBeenCalled();
    });

    it("shows actionable rejection guidance without applying filters", async () => {
        const onApplyFilters = vi.fn();
        const message = "Specify a ranking statistic, such as minutes per goal or minutes per assist.";
        mockedTranslate.mockRejectedValue(new Error(message));

        render(<NaturalLanguageSearchBar onApplyFilters={onApplyFilters} />);
        const user = userEvent.setup();
        await user.click(screen.getByRole("textbox"));
        await user.paste("Most efficient Premier League players");
        await user.keyboard("{enter}");

        expect(await screen.findByRole("alert")).toHaveTextContent(message);
        expect(screen.getByRole("textbox")).toHaveValue("Most efficient Premier League players");
        expect(onApplyFilters).not.toHaveBeenCalled();
    });

    it("shows the summary as an alert for unsupported filters", async () => {
        mockedTranslate.mockResolvedValue(
            makeResponse({errorCode: "unsupported_filter", summary: "That filter is not supported"}),
        );
        mockedGetIssue.mockReturnValue("That filter is not supported");

        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        await userEvent.type(screen.getByRole("textbox"), "left-footed goals{enter}");

        expect(await screen.findByRole("alert")).toHaveTextContent("That filter is not supported");
    });

    it("shows an error message when translation fails", async () => {
        mockedTranslate.mockRejectedValue(new Error("Search queries must be 500 characters or fewer."));

        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        await userEvent.type(screen.getByRole("textbox"), "query{enter}");

        expect(await screen.findByRole("alert")).toHaveTextContent("Search queries must be 500 characters or fewer.");
    });

    it("caps the query at 500 characters", () => {
        render(<NaturalLanguageSearchBar onApplyFilters={vi.fn()} />);
        expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500");
    });
});
