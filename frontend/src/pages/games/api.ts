import {API_BASE_URL} from "../../config";
import type {PlayerGameSearchResult} from "../../types/Player";
import type {DetailResult} from "../search/lib/searchDetails";

export const OWNER_SESSION = "football.quiz.owner";
const GUEST_SESSION = "football.quiz.guest";

export async function quizRequest<T>(path: string, token?: string, body?: object, signal?: AbortSignal): Promise<T> {
    const response = await fetch(API_BASE_URL + "/quiz" + path, {
        method: body ? "POST" : "GET",
        headers: {
            ...(token && {Authorization: "Bearer " + token}),
            ...(body && {"Content-Type": "application/json"}),
        },
        body: body && JSON.stringify(body),
        signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "The quiz service is unavailable.");
    return data as T;
}

export function guestToken() {
    const existing = localStorage.getItem(GUEST_SESSION);
    if (existing) return existing;
    const token = crypto.randomUUID().replaceAll("-", "");
    localStorage.setItem(GUEST_SESSION, token);
    return token;
}

export type QuizHint = "clubs" | "nationality" | "position";

export interface Clue {
    player: string | null;
    points: number | null;
    stats: Record<string, number | string | null>;
    result?: DetailResult | PlayerGameSearchResult;
    row_index?: number;
    found?: boolean;
    hints?: {clubs?: number[]; nationality?: {code: string; name: string}; position?: string};
    available_hints?: QuizHint[];
    purchased_hints?: QuizHint[];
}

export interface QuizView {
    id: number;
    date: string;
    question: string;
    rows: Clue[];
    detail_context?: string;
    total: number;
    score: number;
    max_score?: number;
    wrong_guess_penalty?: number;
    wrong_guess_count?: number;
    hint_cost?: number;
    found: number;
    answers_revealed: boolean;
    finished: boolean;
    display_name: string | null;
}
