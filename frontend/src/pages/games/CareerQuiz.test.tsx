import {act, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {afterEach, expect, it, vi} from "vitest";
import {CareerQuizPage} from "./CareerQuiz";
import {CAREER_ARCHIVE, QuizArchive} from "./Games";
import userEvent from "@testing-library/user-event";

vi.mock("../search/components/SearchDetailsChart", () => ({
    SearchDetailsChart: () => <div>Season chart</div>,
}));

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it("reveals scheduled clues and keeps the clock going while viewing a season", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"]});
    const unstarted = {
        id: 4, date: "2026-11-24", elapsed_ms: null, finished: false, next_reveal_ms: null,
        date_of_birth: null, height_cm: null, nationality: null, position: null, seasons: [], answer: null,
        display_name: null, correct: null,
    };
    const stats = {appearances: 1, minutes: 90, goals: 1, assists: 0, yellows: 0, reds: 0};
    const season = {season: 2021, clubs: [31], stats};
    const started = {...unstarted, elapsed_ms: 0, next_reveal_ms: 10_000, date_of_birth: "1994-01-12", height_cm: 182,
        seasons: [null, season, null]};
    const personal = {...started, elapsed_ms: 10_000, next_reveal_ms: 20_000, position: "Centre-Forward",
        seasons: [{...season, season: 2023}, season, null]};
    const revealed = {...personal, elapsed_ms: 20_000, next_reveal_ms: null, nationality: {code: "gb-eng", name: "England"},
        seasons: [{...season, season: 2023}, season, {...season, season: 2019}]};
    const complete = {...revealed, elapsed_ms: 21_450, finished: true, answer: "Alex Example", correct: true, next_reveal_ms: null};
    let refreshes = 0;
    let joined = false;
    const requests = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/career/today")) return Response.json(unstarted);
        if (path.endsWith("/career/4/start")) return Response.json(started);
        if (path.endsWith("/career/4")) return Response.json(refreshes++ === 0 ? personal : revealed);
        if (path.endsWith("/career/4/seasons/2021")) return Response.json([{
            game_id: 1, date: "2021-08-01", season: 2021, competition_name: "Premier League",
            home_club_id: 31, home_club_name: "Home", away_club_id: 37, away_club_name: "Away",
            home_club_goals: 1, away_club_goals: 0, club_id: 31, qualifies: true, matches_filters: true, stats,
        }]);
        if (path === "/players") return Response.json([{player_id: 10, first_name: "Alex", last_name: "Example"}]);
        if (path.endsWith("/career/4/guess")) {
            expect(JSON.parse(String(init?.body))).toEqual({player_id: 10});
            return Response.json(complete);
        }
        if (path.endsWith("/career/4/leaderboard")) {
            if (init?.method === "POST") {
                expect(JSON.parse(String(init.body))).toEqual({display_name: "Taylor"});
                joined = true;
                return Response.json({...complete, display_name: "Taylor", correct: null});
            }
            return Response.json(joined ? [{rank: 1, display_name: "Taylor", elapsed_ms: 21_450, yours: true}] : []);
        }
        throw new Error("Unexpected request " + path);
    });
    const advance = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    render(<MemoryRouter><CareerQuizPage/></MemoryRouter>);
    await advance();
    expect(screen.queryByText("Date of birth")).not.toBeInTheDocument();
    const seasonScope = "Season stats cover European domestic leagues and UEFA club competitions only. Qualifying rounds are excluded.";
    expect(screen.getByText(seasonScope)).toBeVisible();
    expect(screen.queryByRole("region", {name: "Leaderboard"})).not.toBeInTheDocument();
    expect(screen.queryByRole("link", {name: "Leaderboard"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Start quiz"}));
    await advance();
    expect(screen.getByText("12 January 1994").closest("dd")).toHaveTextContent("12 January 1994 (32)");
    expect(screen.getByText("182 cm")).toBeVisible();
    expect(screen.queryByRole("img", {name: "England"})).not.toBeInTheDocument();
    expect(screen.queryByText("Position")).not.toBeInTheDocument();
    const career = within(screen.getByRole("region", {name: "Career seasons"}));
    expect(career.getByRole("table", {name: seasonScope})).toBeVisible();
    const seasonLabels = () => career.getAllByRole("row").slice(1)
        .map(row => within(row).getAllByRole("cell")[0].textContent);
    expect(seasonLabels()).toEqual(["—Season hidden", "2021/22", "—Season hidden"]);
    expect(career.getAllByRole("button", {name: /View games/})).toHaveLength(1);
    expect(career.queryByText("2019/20")).not.toBeInTheDocument();
    await advance(10_000);
    expect(seasonLabels()).toEqual(["2023/24", "2021/22", "—Season hidden"]);
    expect(screen.getByText("Centre-Forward")).toBeVisible();
    expect(screen.queryByRole("img", {name: "England"})).not.toBeInTheDocument();
    await advance(10_000);
    expect(seasonLabels()).toEqual(["2023/24", "2021/22", "2019/20"]);
    expect(screen.getByRole("img", {name: "England"})).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "View games for 2021/22"}));
    await advance();
    const modal = within(screen.getByRole("dialog", {name: "2021/22 · Games"}));
    expect(modal.getByText("Premier League")).toBeVisible();
    fireEvent.click(modal.getByRole("button", {name: "Chart"}));
    expect(modal.getByText("Season chart")).toBeVisible();
    await advance(1_000);
    expect(modal.getByText("Time 00:21.0")).toBeVisible();
    fireEvent.click(modal.getByRole("button", {name: /Close/}));
    expect(screen.getByRole("timer")).toHaveTextContent("00:21.0");

    fireEvent.change(screen.getByRole("combobox", {name: "Your guess"}), {target: {value: "Alex"}});
    await advance(300);
    fireEvent.click(screen.getByRole("option", {name: /Alex Example/}));
    await advance();
    expect(screen.getByRole("heading", {name: "Alex Example"})).toBeVisible();
    const leaderboardLink = screen.getByRole("link", {name: "Leaderboard"});
    const leaderboard = screen.getByRole("region", {name: "Leaderboard"});
    expect(leaderboardLink).toHaveAttribute("href", "#career-leaderboard");
    expect(leaderboard).toHaveAttribute("id", "career-leaderboard");
    const scrollIntoView = vi.fn();
    Object.assign(leaderboard, {scrollIntoView});
    fireEvent.click(leaderboardLink);
    expect(leaderboard).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({block: "start"});
    expect(screen.getByRole("timer")).toHaveTextContent("00:21.450");
    expect(screen.queryByRole("combobox", {name: "Your guess"})).not.toBeInTheDocument();
    await advance(2_000);
    expect(screen.getByRole("timer")).toHaveTextContent("00:21.450");
    const nameInput = screen.getByLabelText("Public display name");
    const form = nameInput.closest("form")!;
    const seasonTable = screen.getByRole("region", {name: "Career seasons"});
    expect(form.compareDocumentPosition(seasonTable) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(leaderboard).not.toContainElement(form);
    fireEvent.change(nameInput, {target: {value: "Taylor"}});
    fireEvent.click(screen.getByRole("button", {name: "Join leaderboard"}));
    await advance();
    expect(within(screen.getByRole("table", {name: "Leaderboard"})).getByRole("row", {name: "1 Taylor (you) 00:21.450"})).toBeVisible();
    expect(requests).toHaveBeenCalledWith(expect.stringMatching(/\/career\/4\/seasons\/2021$/),
        expect.objectContaining({headers: expect.objectContaining({Authorization: expect.stringMatching(/^Bearer /)})}));
});

it("opens past rounds by ID and starts that round without looking up today's quiz", async () => {
    const unstarted = {
        id: 42, date: "2026-11-20", elapsed_ms: null, finished: false, next_reveal_ms: null,
        date_of_birth: null, height_cm: null, nationality: null, position: null, seasons: [],
        answer: null, display_name: null, correct: null,
    };
    const requests = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/career/archive")) return Response.json([["2026-11-20", 42, 1, false], ["2026-11-20", 43, 2, true]]);
        if (path.endsWith("/career/42")) return Response.json(unstarted);
        if (path.endsWith("/career/42/start")) return Response.json({
            ...unstarted, elapsed_ms: 0, date_of_birth: "1994-12-12", height_cm: 182,
        });
        throw new Error("Unexpected request " + path);
    });

    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={[CAREER_ARCHIVE]}>
        <Routes>
            <Route path={CAREER_ARCHIVE} element={<QuizArchive game="career"/>}/>
            <Route path={CAREER_ARCHIVE + "/:quizKey"} element={<CareerQuizPage/>}/>
        </Routes>
    </MemoryRouter>);
    const completed = await screen.findByRole("link", {name: "Review quiz 2 · 20 Nov 2026 · Completed"});
    expect(completed).toHaveAttribute("href", CAREER_ARCHIVE + "/43");
    expect(within(completed).getByText("Completed")).toBeVisible();
    expect(requests).toHaveBeenCalledWith(expect.stringMatching(/\/career\/archive$/),
        expect.objectContaining({method: "GET", headers: expect.objectContaining({Authorization: expect.stringMatching(/^Bearer /)})}));
    await user.click(screen.getByRole("link", {name: "Play quiz · 20 Nov 2026"}));
    await user.click(await screen.findByRole("button", {name: "Start quiz"}));
    expect(await screen.findByText("182 cm")).toBeVisible();
    expect(screen.getByText("12 December 1994").closest("dd")).toHaveTextContent("12 December 1994 (31)");
    expect(screen.getByRole("link", {name: "Past quizzes"})).toHaveAttribute("href", CAREER_ARCHIVE);
    expect(requests).toHaveBeenCalledWith(expect.stringMatching(/\/career\/42\/start$/),
        expect.objectContaining({method: "POST", headers: expect.objectContaining({Authorization: expect.stringMatching(/^Bearer /)})}));
    expect(requests).not.toHaveBeenCalledWith(expect.stringMatching(/\/career\/today$/), expect.anything());
});
