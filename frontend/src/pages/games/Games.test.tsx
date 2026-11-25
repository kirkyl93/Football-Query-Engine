import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {afterEach, expect, it, vi} from "vitest";
import {DailyQuizPage, GamesPage, QuizArchive} from "./Games";
import styles from "./Games.module.css";

afterEach(() => vi.restoreAllMocks());

it("offers direct access to the quiz and archive, and marks the career game as coming soon", () => {
    render(<MemoryRouter><GamesPage/></MemoryRouter>);

    const quiz = screen.getByRole("region", {name: "Daily Quiz"});
    expect(within(quiz).getByRole("link", {name: "Play daily quiz"})).toHaveAttribute("href", "/games/daily-quiz");
    expect(within(quiz).getByRole("link", {name: "Past quizzes"})).toHaveAttribute("href", "/games/daily-quiz/archive");
    const career = screen.getByRole("region", {name: "Guess the Player"});
    expect(within(career).getByText("Coming soon")).toBeVisible();
    expect(within(career).queryByRole("link")).not.toBeInTheDocument();
});


it("links to each quiz separately when two quizzes share a date", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([
        ["2026-11-22", "First quiz", 14],
        ["2026-11-22", "Second quiz", 15],
    ]));

    render(<MemoryRouter><QuizArchive/></MemoryRouter>);

    expect(await screen.findByRole("link", {name: "First quiz"})).toHaveAttribute("href", "/games/daily-quiz/archive/14");
    expect(screen.getByRole("link", {name: "Second quiz"})).toHaveAttribute("href", "/games/daily-quiz/archive/15");
});

it("renders today's scheduled quiz and links back to the archive", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
        id: 14,
        date: "2026-11-23",
        question: "Which players reached five goals?",
        rows: [{player: null, points: null, stats: {total_goals: 5}}],
        total: 1,
        score: 0,
        found: 0,
        answers_revealed: false,
        finished: false,
        display_name: null,
    }));

    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    expect(await screen.findByRole("heading", {name: "Which players reached five goals?"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Past quizzes"})).toHaveAttribute("href", "/games/daily-quiz/archive");
    expect(screen.getByRole("region", {name: "Quiz clues"})).toBeInTheDocument();
    expect(screen.queryByRole("link", {name: "Leaderboard"})).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(expect.stringMatching(/\/leaderboard$/), expect.any(Object));
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/quiz\/today$/), expect.any(Object));
});

it("shows search-style badges and View games only for revealed answers", async () => {
    const request = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({
            id: 14, date: "2026-11-23", question: "Which players qualify?",
            rows: [
                {player: "Alex Example", points: 1, stats: {total_goals: 5, clubs: "31, 281"}, row_index: 0,
                    result: {player_id: 50, player_name: "Alex Example", clubs_played_for: "31, 281", total_appearances: 5, total_goals: 5,
                        total_assists: 0, total_minutes_played: 450, total_yellow_cards: 0, total_red_cards: 0,
                        qualifying_game_ids: [123]}},
                {player: null, points: null, stats: {total_goals: 5}},
            ],
            detail_context: "scope=o&sort=g",
            total: 2, score: 1, found: 1, answers_revealed: false, finished: false, display_name: null,
        }))
        .mockResolvedValueOnce(Response.json([]));
    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    const revealed = await screen.findByRole("row", {name: /Alex Example/});
    expect(within(revealed).getAllByRole("img")).toHaveLength(2);
    const hidden = screen.getByLabelText("Hidden player").closest("tr")!;
    expect(within(hidden).queryByRole("img")).not.toBeInTheDocument();
    expect(within(hidden).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").at(-1)).toHaveTextContent("Details");

    const user = userEvent.setup();
    await user.click(within(revealed).getByRole("button", {name: "View games for Alex Example"}));
    expect(await screen.findByText("No qualifying games available.")).toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/quiz\/14\/details\/50\/0$/), expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({Authorization: expect.stringMatching(/^Bearer /)}),
    }));
});


it("shows quiz progress and highlights the current player in the leaderboard", async () => {
    vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({
            id: 14, date: "2026-11-23", question: "Which players qualify?",
            rows: [], total: 10, found: 3, score: 12, answers_revealed: false,
            finished: true, display_name: "Taylor",
        }))
        .mockResolvedValueOnce(Response.json([
            {rank: 1, total: 2, display_name: "Morgan", score: 15, yours: false},
            {rank: 2, total: 2, display_name: "Taylor", score: 12, yours: true},
        ]));
    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    const progress = await screen.findByRole("progressbar", {name: "Players found"});
    expect(progress).toHaveAttribute("value", "3");
    expect(progress).toHaveAttribute("max", "10");
    expect(screen.getByRole("link", {name: "Leaderboard"})).toHaveAttribute("href", "#quiz-leaderboard");

    const standings = await screen.findByRole("table", {name: "Leaderboard"});
    expect(within(standings).getByRole("row", {name: "2 Taylor (you) 12"})).toBeInTheDocument();
    expect(screen.getByText("Your rank", {exact: false})).toHaveTextContent("Your rank #2 of 2");
});

it("shows the maximum and updates the running score after correct and incorrect guesses", async () => {
    const quiz = {
        id: 14, date: "2026-11-23", question: "Which players qualify?",
        rows: [], total: 2, found: 0, score: 0, max_score: 33, answers_revealed: false,
        finished: false, display_name: null,
    };
    const request = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({...quiz, wrong_guess_count: 0}))
        .mockResolvedValueOnce(Response.json([{player_id: 50, first_name: "Alex", last_name: "Example"}]))
        .mockResolvedValueOnce(Response.json({...quiz, found: 1, score: 17}))
        .mockResolvedValueOnce(Response.json([{player_id: 51, first_name: "Jordan", last_name: "Example"}]))
        .mockResolvedValueOnce(Response.json({...quiz, found: 1, score: 7, wrong_guess_count: 1}))
        .mockResolvedValueOnce(Response.json([{player_id: 51, name: "Jordan Example", points: -10}]));
    const user = userEvent.setup();
    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    const picker = await screen.findByRole("combobox", {name: "Your guess"});
    const scoreboard = screen.getByLabelText("Quiz score");
    const score = within(scoreboard);
    const meter = scoreboard.querySelector('progress[aria-hidden="true"]')!;
    expect(score.getByText("0 out of 33 possible points")).toBeInTheDocument();
    expect(score.getByText(/Max 33/)).toBeVisible();
    expect(meter.closest("dd")).toHaveAttribute("data-band", "low");

    await user.type(picker, "Alex");
    await user.click(await screen.findByRole("option", {name: /Alex Example/}));
    expect(await screen.findByText("Correct. +17 points.")).toHaveAttribute("data-outcome", "correct");
    await waitFor(() => expect(meter).toHaveAttribute("value", "17"));
    expect(meter.closest("dd")).toHaveAttribute("data-band", "medium");
    expect(score.getByRole("progressbar", {name: "Players found"})).toHaveAttribute("value", "1");

    await user.type(picker, "Jordan");
    await user.click(await screen.findByRole("option", {name: /Jordan Example/}));
    expect(await screen.findByText("Incorrect. −10 points.")).toHaveAttribute("data-outcome", "incorrect");
    await waitFor(() => expect(meter).toHaveAttribute("value", "7"));
    expect(meter.closest("dd")).toHaveAttribute("data-band", "low");
    expect(score.getByRole("progressbar", {name: "Players found"})).toHaveAttribute("value", "1");
    expect(score.getByText("7 out of 33 possible points")).toBeInTheDocument();
    expect(screen.queryByRole("list", {name: "Wrong guesses"})).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(expect.stringMatching(/\/wrong-guesses$/), expect.any(Object));

    await user.click(screen.getByRole("button", {name: "Show wrong guesses (1)"}));
    const guesses = within(await screen.findByRole("list", {name: "Wrong guesses"}));
    expect(guesses.getByRole("listitem")).toHaveTextContent("Jordan Example−10 points");
    expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/quiz\/14\/wrong-guesses$/),
        expect.objectContaining({method: "GET", headers: expect.objectContaining({Authorization: expect.stringMatching(/^Bearer /)})}));

    await user.click(screen.getByRole("button", {name: "Hide wrong guesses (1)"}));
    expect(screen.queryByRole("list", {name: "Wrong guesses"})).not.toBeInTheDocument();
});

it("lets a guest play an archived quiz and reveal found and missed answers after finishing", async () => {
    const hidden = {player: null, points: null, stats: {total_goals: 5}};
    const found = {
        player: "Alex Example", points: 3, row_index: 0, stats: {total_goals: 5},
        result: {player_id: 50, player_name: "Alex Example", total_goals: 5, qualifying_game_ids: []},
    };
    const missed = {
        player: "Taylor Example", points: 4, row_index: 0, stats: {total_goals: 5},
        result: {player_id: 51, player_name: "Taylor Example", total_goals: 5, qualifying_game_ids: []},
    };
    const archived = {
        id: 14, date: "2026-11-20", question: "Which players qualified?",
        rows: [hidden, hidden], total: 2, found: 0, score: -1, max_score: 7, wrong_guess_count: 1, answers_revealed: false,
        finished: false, display_name: null,
    };
    const partial = {...archived, rows: [found, hidden], score: 2, found: 1};
    const finished = {...partial, finished: true};
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/archive/14")) return Response.json(archived);
        if (path.endsWith("/leaderboard")) return Response.json([]);
        if (path === "/players") return Response.json([{player_id: 50, first_name: "Alex", last_name: "Example"}]);
        if (path.endsWith("/guess")) return Response.json(partial);
        if (path.endsWith("/finish")) {
            const body = JSON.parse(String(init?.body));
            return Response.json({...finished, display_name: body.display_name ?? null});
        }
        if (path.endsWith("/answers")) return Response.json({
            ...finished, answers_revealed: true,
            rows: [{...found, found: true}, {...missed, found: false}],
        });
        if (path.endsWith("/details/51/0")) return Response.json([]);
        if (path.endsWith("/wrong-guesses")) return Response.json([{player_id: 52, name: "Jordan Example", points: -1}]);
        throw new Error("Unexpected request " + path);
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/games/daily-quiz/archive/14"]}>
        <Routes><Route path="/games/daily-quiz/archive/:quizKey" element={<DailyQuizPage/>}/></Routes>
    </MemoryRouter>);

    const picker = await screen.findByRole("combobox", {name: "Your guess"});
    expect(screen.queryByRole("button", {name: "Reveal answers"})).not.toBeInTheDocument();
    expect(screen.queryByRole("link", {name: "Leaderboard"})).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith(expect.stringMatching(/\/leaderboard$/), expect.any(Object));
    await user.type(picker, "Alex");
    await user.click(await screen.findByRole("option", {name: /Alex Example/}));
    expect(await screen.findByText("Correct. +3 points.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Finish quiz"}));
    const reveal = await screen.findByRole("button", {name: "Reveal answers"});
    expect(screen.getByRole("link", {name: "Leaderboard"})).toBeInTheDocument();
    expect(await screen.findByRole("region", {name: "Leaderboard"})).toHaveTextContent("No entries yet.");
    expect(screen.queryByText("Taylor Example")).not.toBeInTheDocument();
    expect(screen.getByRole("row", {name: /Alex Example/})).not.toHaveClass(styles.foundAnswer);
    expect(screen.queryByRole("combobox", {name: "Your guess"})).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Show wrong guesses (1)"}));
    expect(within(await screen.findByRole("list", {name: "Wrong guesses"})).getByRole("listitem"))
        .toHaveTextContent("Jordan Example−1 point");

    await user.click(reveal);
    const answers = within(await screen.findByRole("region", {name: "Quiz answers"}));
    const foundRow = answers.getByRole("row", {name: /Alex Example/});
    expect(foundRow).toHaveClass(styles.foundAnswer);
    expect(within(foundRow).getByText("3", {exact: true})).toBeVisible();
    const missedRow = answers.getByRole("row", {name: /Taylor Example/});
    expect(missedRow).toHaveClass(styles.missedAnswer);
    expect(within(missedRow).getByText("4", {exact: true})).toBeVisible();
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/quiz\/14\/answers$/),
        expect.objectContaining({method: "GET"}));

    await user.type(screen.getByLabelText("Public display name"), "Guest");
    await user.click(screen.getByRole("button", {name: "Join leaderboard"}));
    await waitFor(() => expect(screen.queryByRole("button", {name: "Join leaderboard"})).not.toBeInTheDocument());

    await user.click(within(missedRow).getByRole("button", {name: "View games for Taylor Example"}));
    expect(await screen.findByText("No qualifying games available.")).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/quiz\/14\/details\/51\/0\?review=true$/),
        expect.objectContaining({method: "GET"}));
});

it("explains how quiz points work on hover, tap or keyboard focus", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
        id: 14, date: "2026-11-23", question: "Which players qualify?", rows: [],
        total: 2, found: 0, score: 0, finished: false, display_name: null,
        wrong_guess_penalty: 10,
    }));
    const user = userEvent.setup();
    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    const help = await screen.findByRole("button", {name: "Points, how scoring works"});
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(help);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Each new wrong guess costs 10 points.");
    expect(tip).toHaveTextContent("difficulty rank to their search rank");
    expect(tip).toHaveTextContent("Repeat guesses don’t change your score.");
    await user.unhover(help);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.click(help);
    expect(help).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.tab({shift: true});
    await user.tab();
    expect(help).toHaveFocus();
    expect(screen.getByRole("tooltip")).toBeVisible();
});

it("reveals paid hints in the matching table cells while leaving the player masked", async () => {
    const row = {player: null, points: null, stats: {total_goals: 5}, available_hints: ["nationality", "clubs", "position"]};
    const quiz = {
        id: 14, date: "2026-11-23", question: "Which players qualify?", rows: [row],
        total: 2, found: 0, score: 0, max_score: 33, hint_cost: 5, finished: false,
        answers_revealed: false, display_name: null,
    };
    const request = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json(quiz))
        .mockResolvedValueOnce(Response.json({...quiz, score: -5,
            rows: [{...row, hints: {nationality: {code: "gb-eng", name: "England"}}, available_hints: ["clubs", "position"]}]}))
        .mockResolvedValueOnce(Response.json({...quiz, score: -10,
            rows: [{...row, hints: {nationality: {code: "gb-eng", name: "England"}, clubs: [31]}, available_hints: ["position"]}]}))
        .mockResolvedValueOnce(Response.json({...quiz, score: -15,
            rows: [{...row, hints: {nationality: {code: "gb-eng", name: "England"}, clubs: [31], position: "Centre-Forward"}, available_hints: []}]}))
        .mockResolvedValueOnce(Response.json([{player_id: 50, first_name: "Alex", last_name: "Example"}]))
        .mockResolvedValueOnce(Response.json({...quiz, score: 1, found: 1, rows: [{
            ...row, player: "Alex Example", points: 16, purchased_hints: ["clubs", "nationality", "position"],
            result: {player_id: 50, player_name: "Alex Example", country_code: "gb-eng", clubs_played_for: "31",
                sub_position: "Centre-Forward", total_goals: 5},
        }]}));
    const user = userEvent.setup();
    render(<MemoryRouter><DailyQuizPage/></MemoryRouter>);

    const clues = within(await screen.findByRole("region", {name: "Quiz clues"}));
    const headers = clues.getAllByRole("columnheader");
    const cells = within(clues.getAllByRole("row")[1]).getAllByRole("cell");
    const cell = (label: string) => within(cells[headers.findIndex(header => header.textContent === label)]);
    const player = cell("Player");
    const clubs = cell("Clubs");
    const position = cell("Position");

    const nationalityButton = player.getByRole("button", {name: "Reveal nationality for row 1, 5 points"});
    expect(nationalityButton).toHaveTextContent(/^−5$/);
    expect(nationalityButton).toHaveAttribute("title", "Reveal nationality for 5 points");
    await user.click(nationalityButton);
    expect(await player.findByRole("img", {name: "England"}))
        .toHaveAttribute("src", "https://flagicons.lipis.dev/flags/4x3/gb-eng.svg");
    expect(player.queryByText("England")).not.toBeInTheDocument();
    expect(player.queryByRole("button", {name: /Reveal clubs|Reveal position/})).not.toBeInTheDocument();
    expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/quiz\/14\/hint$/),
        expect.objectContaining({body: '{"row":0,"kind":"nationality"}'}));

    const clubsButton = clubs.getByRole("button", {name: "Reveal clubs for row 1, 5 points"});
    expect(clubsButton).toHaveTextContent(/^−5$/);
    expect(clubsButton).toHaveAttribute("title", "Reveal clubs for 5 points");
    await user.click(clubsButton);
    expect(await clubs.findByRole("img")).toHaveAttribute("src", expect.stringContaining("/31.png"));
    expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/quiz\/14\/hint$/),
        expect.objectContaining({body: '{"row":0,"kind":"clubs"}'}));

    const positionButton = position.getByRole("button", {name: "Reveal position for row 1, 5 points"});
    expect(positionButton).toHaveTextContent(/^−5$/);
    expect(positionButton).toHaveAttribute("title", "Reveal position for 5 points");
    await user.click(positionButton);
    expect(await position.findByText("Centre-Forward")).toBeVisible();
    expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/quiz\/14\/hint$/),
        expect.objectContaining({body: '{"row":0,"kind":"position"}'}));

    expect(clues.queryByRole("button", {name: /Reveal/})).not.toBeInTheDocument();
    expect(player.getByLabelText("Hidden player")).toBeInTheDocument();
    expect(cell("Details").queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("-15 out of 33 possible points")).toBeInTheDocument();
    expect(player.getByTitle("Nationality clue used")).toContainElement(player.getByRole("img", {name: "England"}));
    expect(clubs.getByTitle("Clubs clue used")).toContainElement(clubs.getByRole("img"));
    expect(position.getByTitle("Position clue used")).toContainElement(position.getByText("Centre-Forward"));

    await user.type(screen.getByRole("combobox", {name: "Your guess"}), "Alex");
    await user.click(await screen.findByRole("option", {name: /Alex Example/}));
    const revealed = within(await clues.findByRole("row", {name: /Alex Example/}));
    expect(revealed.getByTitle("Nationality clue used")).toContainElement(revealed.getByRole("img", {name: "gb-eng"}));
    expect(revealed.getByTitle("Clubs clue used")).toContainElement(revealed.getAllByRole("img")[1]);
    expect(revealed.getByTitle("Position clue used")).toContainElement(revealed.getByText("Centre-Forward"));
});
