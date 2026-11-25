import {fireEvent, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";
import {afterEach, expect, it, vi} from "vitest";
import {QuizAuthor, QuizOwnerPage} from "./QuizOwner";
import {OWNER_SESSION} from "./api";

afterEach(() => {
    sessionStorage.removeItem(OWNER_SESSION);
    vi.restoreAllMocks();
});

function search() {
    render(<MemoryRouter><QuizAuthor searchType="totals" query="?comps=GB1&ming=5&page=9"/></MemoryRouter>);
}

it("keeps authoring hidden for public visitors without a session request", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    search();
    expect(screen.queryByRole("button", {name: "Make daily quiz"})).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
});

it("verifies the owner session and scores only on the explicit step", async () => {
    sessionStorage.setItem(OWNER_SESSION, "owner-token");
    const initial = [
        {player_id: 20, name: "Alex Example", rank: 1, jev_rating: 3.125, override_rating: null, points: 2},
        {player_id: 31, name: "Jamie Example", rank: 1, jev_rating: 0.75, override_rating: null, points: 1},
    ];
    const request = vi.spyOn(globalThis, "fetch").mockImplementation((url, init) => {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer owner-token");
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        if (String(url).endsWith("/session")) return Promise.resolve(Response.json({}));
        if (String(url).endsWith("/preview")) {
            const filters = new URLSearchParams(body.query);
            expect(filters.get("comps")).toBe("GB1");
            expect(filters.get("ming")).toBe("5");
            expect(filters.has("page")).toBe(false);
            return Promise.resolve(Response.json({id:"draft", count:2, rows:[{
                player:"Alex Example", points:0, stats:{total_goals:8},
            }]}));
        }
        if (String(url).endsWith("/overrides")) {
            expect(body.id).toBe("draft");
            if (body.ratings["20"] === null) return Promise.resolve(Response.json(initial));
            expect(body.ratings).toEqual({"20":0.5});
            return Promise.resolve(Response.json([
                {...initial[0], override_rating: 0.5, points: 1},
                {...initial[1], points: 2},
            ]));
        }
        expect(body).toEqual(String(url).endsWith("/schedule") ? {id:"draft", wrong_guess_penalty: 7} : {id:"draft"});
        return Promise.resolve(Response.json(String(url).endsWith("/score") ? initial : {date:"2099-10-05"}));
    });
    search();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", {name:"Make daily quiz"}));
    await user.type(screen.getByLabelText("Question"), "Who reached five goals?");
    fireEvent.change(screen.getByLabelText("Publish date (UK)"), {target:{value:"2099-10-05"}});
    await user.click(screen.getByRole("button", {name:"Preview quiz"}));
    await screen.findByRole("region", {name:"Answer preview"});
    expect(request).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", {name:"Schedule quiz"})).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {name:"Score answers"}));
    const rating = await screen.findByRole("spinbutton", {name: "Override for Alex Example"});
    const points = (name: string) =>
        within(screen.getByRole("rowheader", {name}).closest("tr")!).getAllByRole("cell").at(-1);
    expect(points("Alex Example")).toHaveTextContent("2");
    expect(screen.getByRole("columnheader", {name: "Search rank"})).toBeInTheDocument();
    await user.type(rating, "0.5");
    expect(screen.getByRole("button", {name:"Schedule quiz"})).toBeDisabled();
    await user.click(screen.getByRole("button", {name:"Recalculate points"}));
    await screen.findByRole("button", {name:"Schedule quiz"});
    expect(points("Alex Example")).toHaveTextContent("1");
    expect(points("Jamie Example")).toHaveTextContent("2");
    expect(screen.getByText("3.125")).toBeInTheDocument();

    await user.clear(rating);
    await user.click(screen.getByRole("button", {name:"Recalculate points"}));
    expect(points("Alex Example")).toHaveTextContent("2");
    await user.type(screen.getByRole("spinbutton", {name:"Wrong guess penalty (points)"}), "7");
    await user.click(screen.getByRole("button", {name:"Schedule quiz"}));
    expect(await screen.findByText("Quiz scheduled for 2099-10-05 (UK).")).toBeInTheDocument();
    expect(request.mock.calls.map(([url]) => String(url).split("/").pop())).toEqual(["session", "preview", "score", "overrides", "overrides", "schedule"]);
});

it("lets a signed-in owner select a player and schedule the career quiz", async () => {
    sessionStorage.setItem(OWNER_SESSION, "owner-token");
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/session")) return Response.json({});
        if (path === "/players") return Response.json([{player_id: 42, first_name: "Alex", last_name: "Example"}]);
        if (path.endsWith("/career/schedule")) {
            expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer owner-token");
            expect(JSON.parse(String(init?.body))).toEqual({player_id: 42, date: "2099-10-05"});
            return Response.json({date: "2099-10-05", player: "Alex Example"});
        }
        throw new Error("Unexpected request " + path);
    });
    const user = userEvent.setup();
    render(<MemoryRouter><QuizOwnerPage/></MemoryRouter>);
    await user.click(await screen.findByRole("button", {name: "Set player"}));
    await user.type(screen.getByRole("combobox", {name: "Player"}), "Alex");
    await user.click(await screen.findByRole("option", {name: /Alex Example/}));
    expect(screen.getByText("Alex Example", {selector: "strong"})).toBeVisible();
    fireEvent.change(screen.getByLabelText("Publication date (6 am UK time)"), {target: {value: "2099-10-05"}});
    await user.click(screen.getByRole("button", {name: "Schedule player"}));
    expect(await screen.findByRole("status")).toHaveTextContent("Alex Example scheduled for 2099-10-05.");
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/quiz\/owner\/career\/schedule$/),
        expect.objectContaining({method: "POST"}));
});
