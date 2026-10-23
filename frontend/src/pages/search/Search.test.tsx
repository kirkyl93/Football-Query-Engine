import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import Search from "./Search";
import {createDefaultSearchFilterState} from "./lib/defaultSearchFilter";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    translateNaturalLanguageSearch,
} from "../../lib/naturalLanguageSearch";

vi.mock("./components/SearchOverallTable", () => ({SearchOverallTable: () => <div>Results table</div>}));
vi.mock("./components/SearchByGameTable", () => ({SearchByGameTable: () => <div>Game results table</div>}));
vi.mock("./components/SearchByCountTable", () => ({SearchByCountTable: () => <div>Count results table</div>}));
vi.mock("./components/SearchFilterBar", () => ({default: () => null}));
vi.mock("../../lib/naturalLanguageSearch", () => ({
    translateNaturalLanguageSearch: vi.fn(),
    naturalLanguageFiltersToSearchState: vi.fn(),
    getNaturalLanguageSearchIssue: vi.fn(),
}));

function renderSearch() {
    return render(<MemoryRouter initialEntries={["/?seasons=2025&comps=GB1"]}><Search /></MemoryRouter>);
}

describe("results-page question disclosure", () => {
    beforeEach(() => { vi.resetAllMocks(); });

    it("keeps the question form hidden initially and focuses it on opening", async () => {
        renderSearch();
        expect(screen.getByText("Results table")).toBeVisible();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        const button = screen.getByRole("button", {name: "Ask another question"});
        expect(button).toHaveAttribute("aria-expanded", "false");

        await userEvent.setup().click(button);
        expect(button).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("textbox")).toHaveFocus();
        expect(translateNaturalLanguageSearch).not.toHaveBeenCalled();
    });

    it("preserves the draft when closed and restores focus to the trigger on Escape", async () => {
        const user = userEvent.setup();
        renderSearch();
        await user.click(screen.getByRole("button", {name: "Ask another question"}));
        await user.type(screen.getByRole("textbox"), "Most away assists");
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Ask another question"})).toHaveFocus();

        await user.click(screen.getByRole("button", {name: "Ask another question"}));
        expect(screen.getByRole("textbox")).toHaveValue("Most away assists");
        await user.click(screen.getByRole("button", {name: "Close question"}));
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("closes the question panel after a successful translation", async () => {
        vi.mocked(translateNaturalLanguageSearch).mockResolvedValue({
            summary: "Premier League top scorers", errorCode: null, filters: {},
        });
        vi.mocked(getNaturalLanguageSearchIssue).mockReturnValue(null);
        vi.mocked(naturalLanguageFiltersToSearchState).mockReturnValue(createDefaultSearchFilterState());
        const user = userEvent.setup();
        renderSearch();
        await user.click(screen.getByRole("button", {name: "Ask another question"}));
        await user.type(screen.getByRole("textbox"), "Premier League top scorers{enter}");

        await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
        expect(screen.getByRole("button", {name: "Ask another question"})).toHaveFocus();
        expect(screen.getByText("Results table")).toBeVisible();
    });

    it("keeps the question panel open with the draft when a request fails", async () => {
        vi.mocked(translateNaturalLanguageSearch).mockRejectedValue(new Error("Try again later"));
        const user = userEvent.setup();
        renderSearch();
        await user.click(screen.getByRole("button", {name: "Ask another question"}));
        await user.type(screen.getByRole("textbox"), "Most away goals{enter}");

        expect(await screen.findByRole("alert")).toHaveTextContent("Try again later");
        expect(screen.getByRole("textbox")).toHaveValue("Most away goals");
        expect(screen.getByRole("button", {name: "Close question"})).toHaveAttribute("aria-expanded", "true");
    });
});
