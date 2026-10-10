import {describe, expect, it} from 'vitest';
import type {PlayerAppearance} from '../../../types/Player';
import {getClubColours} from '../../../lib/ClubDirectory';
import {BAR_FILL_CLASH_THRESHOLD, resolveBarFills} from './barFillColours';
import {colourDistance} from '../../../lib/ColourUtils';

// Arsenal (11): red/white. Liverpool (31): near-identical red/white.
// Sheffield Wednesday (1035): single blue.
const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 1,
    club_id: 11,
    home_club_id: 11,
    home_club_name: 'Home',
    away_club_id: 2,
    away_club_name: 'Away',
    competition_id: 'GB1',
    competition_name: 'Premier League',
    competition_type: 'League',
    date: '2025-08-01',
    season: 2025,
    goals: 0,
    penalty_goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 2,
    away_club_goals: 0,
    goal_minutes: [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: 'Win',
    ...overrides,
});

describe('resolveBarFills', () => {
    it('returns one fill per appearance', () => {
        expect(resolveBarFills([])).toEqual([]);
        expect(resolveBarFills([game(), game()])).toHaveLength(2);
    });

    it('starts on the dominant club colour', () => {
        expect(resolveBarFills([game({club_id: 11})])).toEqual([getClubColours(11)[0]]);
    });

    it('keeps a stable fill across consecutive games for the same club', () => {
        expect(resolveBarFills([
            game({game_number: 1, club_id: 11}),
            game({game_number: 2, club_id: 11}),
            game({game_number: 3, club_id: 11}),
        ])).toEqual([getClubColours(11)[0], getClubColours(11)[0], getClubColours(11)[0]]);
    });

    it('switches to the secondary colour when primaries clash', () => {
        const arsenalRed = getClubColours(11)[0];
        const liverpool = getClubColours(31);
        // Precondition: the two primaries really are similar reds.
        expect(colourDistance(arsenalRed, liverpool[0])).toBeLessThan(BAR_FILL_CLASH_THRESHOLD);

        const fills = resolveBarFills([
            game({game_number: 1, club_id: 11}),
            game({game_number: 2, club_id: 31}),
        ]);

        expect(fills[0]).toBe(arsenalRed);
        expect(fills[1]).toBe(liverpool[1]);
        expect(colourDistance(fills[0], fills[1])).toBeGreaterThanOrEqual(BAR_FILL_CLASH_THRESHOLD);
    });

    it('keeps the primary when the new club colour is distinct', () => {
        const fills = resolveBarFills([
            game({game_number: 1, club_id: 11}),
            game({game_number: 2, club_id: 1035}),
        ]);
        expect(fills[1]).toBe(getClubColours(1035)[0]);
    });

    it('picks the most-distant colour when every option clashes', () => {
        // Saarbrücken (1) plays in yellow; Al-Orobah (39536) only has yellows,
        // both within the clash threshold of Saarbrücken's yellow.
        const saarbrucken = getClubColours(1)[0];
        const alOrobah = getClubColours(39536);
        expect(alOrobah.length).toBeGreaterThan(1);
        for (const colour of alOrobah) {
            expect(colourDistance(colour, saarbrucken)).toBeLessThan(BAR_FILL_CLASH_THRESHOLD);
        }

        const fills = resolveBarFills([
            game({game_number: 1, club_id: 1}),
            game({game_number: 2, club_id: 39536}),
        ]);

        const expected = alOrobah.reduce((best, colour) =>
            colourDistance(colour, saarbrucken) > colourDistance(best, saarbrucken) ? colour : best,
        );
        expect(fills[0]).toBe(saarbrucken);
        expect(fills[1]).toBe(expected);
    });
});
