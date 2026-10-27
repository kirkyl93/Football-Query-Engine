import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import HomePage from "./HomePage";
import {createDefaultSearchFilterState} from "../search/lib/defaultSearchFilter";
import {exampleQueries} from "./exampleQueries";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {...actual, useNavigate: () => mockNavigate};
});

vi.mock("../../lib/naturalLanguageSearch", () => ({
    translateNaturalLanguageSearch: vi.fn(),
    naturalLanguageFiltersToSearchState: vi.fn(),
    getNaturalLanguageSearchIssue: vi.fn(),
}));

import type {NaturalLanguageSearchResponse} from "../../lib/naturalLanguageSearch";
import {
    getNaturalLanguageSearchIssue,
    naturalLanguageFiltersToSearchState,
    translateNaturalLanguageSearch,
} from "../../lib/naturalLanguageSearch";

const mockedTranslate = vi.mocked(translateNaturalLanguageSearch);
const mockedToSearchState = vi.mocked(naturalLanguageFiltersToSearchState);
const mockedGetIssue = vi.mocked(getNaturalLanguageSearchIssue);

const makeResponse = (overrides: Partial<NaturalLanguageSearchResponse> = {}): NaturalLanguageSearchResponse => ({
    summary: "Champions League top scorers since 2010",
    errorCode: null,
    filters: {},
    ...overrides,
});

describe("HomePage", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const renderHome = () => render(
        <MemoryRouter initialEntries={["/"]}>
            <HomePage />
        </MemoryRouter>,
    );

    it("renders the search guidance and keeps the full competition list collapsed", async () => {
        renderHome();

        expect(screen.getByRole("heading", {level: 1})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Example queries"})).toBeInTheDocument();
        expect(screen.getByText(/every season from 1992\/93/i)).toBeInTheDocument();
        expect(screen.getByText("Eredivisie")).not.toBeVisible();
        expect(screen.queryByText(/domestic cups/i)).not.toBeInTheDocument();
        expect(screen.getByText(/guaranteed to work as expected/)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Open the filter and sort menu"})).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Run search"})).not.toBeInTheDocument();

        await userEvent.setup().click(screen.getByText("Competitions covered", {exact: false}));
        expect(screen.getByText("Eredivisie")).toBeVisible();
    });

    it("shows the supported tiles without any interaction", () => {
        renderHome();

        expect(screen.getByText("Seasons")).toBeInTheDocument();
        expect(screen.getByText("Rankings")).toBeInTheDocument();
        expect(screen.getByText(/1992\/93 to 2025\/26/)).toBeInTheDocument();
    });

    it("shows the send icon once the input has text", async () => {
        const user = userEvent.setup();
        renderHome();

        await user.type(screen.getByRole("textbox"), "Most yellow cards in La Liga");

        expect(screen.getByRole("button", {name: "Run search"})).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows club lookup errors without navigating or applying partial filters", async () => {
        mockedTranslate.mockResolvedValue(makeResponse({filters: {clubsPlayedFor: ["Arsenal"]}}));
        mockedGetIssue.mockReturnValue(null);
        mockedToSearchState.mockImplementation(() => {
            throw new Error('Could not identify the requested club.');
        });
        renderHome();
        await userEvent.setup().type(screen.getByRole("textbox"), "Most goals for Arsenal{enter}");
        expect(await screen.findByText('Could not identify the requested club.'))
            .toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("fills and focuses the question from an example without submitting it", async () => {
        const user = userEvent.setup();
        renderHome();

        const button = within(screen.getByRole("group", {name: "Example queries"})).getAllByRole("button")[0];
        const example = exampleQueries.find(example => button.textContent?.includes(example.query))!;
        await user.click(button);

        expect(screen.getByRole("textbox")).toHaveValue(example.query);
        expect(screen.getByRole("textbox")).toHaveFocus();
        expect(mockedTranslate).not.toHaveBeenCalled();

        await user.type(screen.getByRole("textbox"), " in 2024");
        expect(screen.getByRole("textbox")).toHaveValue(`${example.query} in 2024`);
    });

    it("keeps the same three examples while typing and clearing the question", async () => {
        const user = userEvent.setup();
        renderHome();
        const group = screen.getByRole("group", {name: "Example queries"});
        const original = within(group).getAllByRole("button").map(button => button.textContent);
        expect(original).toHaveLength(3);

        await user.type(screen.getByRole("textbox"), "Most away goals");
        expect(within(group).getAllByRole("button").map(button => button.textContent)).toEqual(original);
        await user.clear(screen.getByRole("textbox"));
        expect(within(group).getAllByRole("button").map(button => button.textContent)).toEqual(original);
    });

    it("announces loading and disables examples and duplicate submissions while searching", async () => {
        mockedTranslate.mockImplementation((_query, signal) => new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }));
        const user = userEvent.setup();
        renderHome();
        await user.type(screen.getByRole("textbox"), "Most goals in La Liga{enter}");

        expect(screen.getByRole("status")).toHaveTextContent("Finding the right filters");
        expect(screen.getByRole("textbox")).toBeDisabled();
        expect(screen.getByRole("button", {name: "Run search"})).toBeDisabled();
        for (const button of within(screen.getByRole("group", {name: "Example queries"})).getAllByRole("button")) {
            expect(button).toBeDisabled();
        }
        await user.click(screen.getByRole("button", {name: "Run search"}));
        expect(mockedTranslate).toHaveBeenCalledTimes(1);
    });

    it("shows no send icon and does nothing when the input is empty or blank", async () => {
        const user = userEvent.setup();
        renderHome();

        expect(screen.queryByRole("button", {name: "Run search"})).not.toBeInTheDocument();

        await user.type(screen.getByRole("textbox"), "   ");

        expect(screen.queryByRole("button", {name: "Run search"})).not.toBeInTheDocument();
        expect(mockedTranslate).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("submits via the in-box icon and navigates to the search view with the mapped filters", async () => {
        mockedTranslate.mockResolvedValue(makeResponse());
        mockedGetIssue.mockReturnValue(null);
        const mappedState = {...createDefaultSearchFilterState(), seasons: [2024]};
        mockedToSearchState.mockResolvedValue(mappedState);

        const user = userEvent.setup();
        renderHome();
        await user.type(screen.getByRole("textbox"), "Champions League top scorers since 2010");
        await user.click(screen.getByRole("button", {name: "Run search"}));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
        expect(mockNavigate).toHaveBeenCalledWith({
            pathname: "/",
            search: expect.stringContaining("seasons=2024"),
        });
        expect(mockedToSearchState).toHaveBeenCalledWith(makeResponse().filters, expect.any(AbortSignal));
    }, 15000);

    it("shows actionable rejection guidance and keeps the draft on the landing page", async () => {
        const message = "Specify a ranking statistic, such as minutes per goal or minutes per assist.";
        mockedTranslate.mockRejectedValue(new Error(message));

        renderHome();
        const user = userEvent.setup();
        await user.click(screen.getByRole("textbox"));
        await user.paste("Most efficient Premier League players");
        await user.keyboard("{enter}");

        expect(await screen.findByRole("alert")).toHaveTextContent(message);
        expect(screen.getByRole("textbox")).toHaveValue("Most efficient Premier League players");
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("opens the filter drawer and applies the default sample search", async () => {
        const user = userEvent.setup();
        renderHome();

        await user.click(screen.getByRole("button", {name: "Open the filter and sort menu"}));
        expect(await screen.findByText("SEASONS")).toBeInTheDocument();

        await user.click(screen.getByText("APPLY"));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({
            pathname: "/",
            search: expect.stringContaining("seasons=2025&comps=GB1"),
        }));
    });

    it("exposes the filter drawer state on the sort-directly link", async () => {
        const user = userEvent.setup();
        renderHome();

        const linkButton = screen.getByRole("button", {
            name: "Open the filter and sort menu",
        });

        expect(linkButton).toHaveAttribute("aria-expanded", "false");

        await user.click(linkButton);

        expect(linkButton).toHaveAttribute("aria-expanded", "true");
    });
});

