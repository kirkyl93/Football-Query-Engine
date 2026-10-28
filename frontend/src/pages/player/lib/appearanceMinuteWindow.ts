import {PlayerAppearance} from '../../../types/Player';

export function minuteWindow(from?: number, to?: number): [number, number] {
    const lower = Math.max(0, Math.min(120, from ?? 1));
    const upper = Math.max(0, Math.min(120, to ?? 120));
    return [Math.min(lower, upper), Math.max(lower, upper)];
}

/** Capture the dismissal before filtering yellows, so the first can be outside the window. */
export function secondYellowMinute(appearance: PlayerAppearance): number | null {
    if (appearance.second_yellow_red_minute !== undefined) return appearance.second_yellow_red_minute;
    return [...appearance.yellow_minutes].sort((a, b) => a - b)[1] ?? null;
}

/** The response keeps the source's minute-46 half-time boundary. */
export function appearanceDuration(appearance: PlayerAppearance): number {
    const [start, end] = appearance.full_match_minutes_played ?? appearance.minutes_played;
    return start === 46 && end === 90 ? 45 : end - start;
}

/** Inclusive event bounds and capped playing-time overlap, matching search conventions. */
export function appearanceInMinuteWindow(appearance: PlayerAppearance, from?: number, to?: number): PlayerAppearance | null {
    if (from === undefined && to === undefined) return appearance;
    const [lower, upper] = minuteWindow(from, to);
    const [, end] = appearance.minutes_played;
    const overlapStart = Math.max(1, appearance.played_from_minute, lower);
    const overlapEnd = Math.min(end, appearance.subbed_off_minute || end, upper);
    const duration = appearanceDuration(appearance);
    const minutes = Math.max(0, Math.min(duration, upper - Math.max(1, lower) + 1, overlapEnd - overlapStart + 1));
    if (minutes === 0) return null;
    const inWindow = (minute: number) => minute >= lower && minute <= upper;
    const goal_minutes = appearance.goal_minutes.filter(inWindow);
    const penalty_goal_minutes = appearance.penalty_goal_minutes.filter(inWindow);
    const assist_minutes = appearance.assist_minutes.filter(inWindow);
    const yellow_minutes = appearance.yellow_minutes.filter(inWindow);
    const red_minutes = appearance.red_minutes.filter(inWindow);
    const secondYellow = secondYellowMinute(appearance);
    return {
        ...appearance,
        full_match_minutes_played: appearance.minutes_played,
        // A continuous bar ending at the last included minute represents the capped duration.
        minutes_played: [overlapEnd - minutes, overlapEnd],
        goal_minutes, penalty_goal_minutes, assist_minutes, yellow_minutes, red_minutes,
        own_goal_minutes: appearance.own_goal_minutes.filter(inWindow),
        goals: goal_minutes.length + penalty_goal_minutes.length,
        penalty_goals: penalty_goal_minutes.length,
        assists: assist_minutes.length,
        yellow_cards: yellow_minutes.length,
        red_cards: red_minutes.length,
        second_yellow_red_minute: secondYellow !== null && inWindow(secondYellow) ? secondYellow : null,
    };
}
