import { describe, expect, it } from 'vitest';
import { getBarOutlineColour } from './barOutlineColour';
import { calculateBarChartOpacity, calculateSize } from './chartSizing';
import type { PlayerAppearance } from '../../../types/Player';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 1,
    club_id: 1,
    home_club_id: 1,
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
    home_club_goals: 1,
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

describe('getBarOutlineColour', () => {
    it('outlines league games in black', () => {
        expect(getBarOutlineColour(game())).toBe('black');
    });

    it('outlines European competitions by name', () => {
        expect(getBarOutlineColour(game({competition_type: 'Europe', competition_name: 'Champions League'}))).toBe('#FFBF00');
        expect(getBarOutlineColour(game({competition_type: 'Europe', competition_name: 'Europa League'}))).toBe('silver');
        expect(getBarOutlineColour(game({competition_type: 'Europe', competition_name: 'Europa Conference League'}))).toBe('bronze');
    });

    it('outlines domestic cups in red and defaults to black', () => {
        expect(getBarOutlineColour(game({competition_type: 'Domestic Cup'}))).toBe('red');
        expect(getBarOutlineColour(game({competition_type: 'Friendly'}))).toBe('black');
    });
});

describe('calculateSize mid-range', () => {
    it('interpolates cubically between extremes', () => {
        const mid = calculateSize(310, 0, 100);
        expect(mid).toBeGreaterThan(0);
        expect(mid).toBeLessThan(100);
        const opacity = calculateBarChartOpacity(310, 0, 100);
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThan(100);
    });
});
