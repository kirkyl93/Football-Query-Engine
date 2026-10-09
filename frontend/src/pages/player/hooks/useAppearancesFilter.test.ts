import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlayerAppearance } from '../../../types/Player';
import { createDefaultPlayerFilterState, useAppearancesFilter } from './useAppearancesFilter';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 0,
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

describe('useAppearancesFilter', () => {
    const twoSeasons = [
        game({season: 2024, date: '2024-08-01'}),
        game({season: 2025, date: '2025-08-01'}),
    ];

    it('derives metadata and defaults to the final season', () => {
        const {result} = renderHook(() => useAppearancesFilter(twoSeasons));

        expect(result.current.metadata.seasons).toEqual([2024, 2025]);
        expect(result.current.metadata.leagueCompetitions).toEqual(['Premier League']);
        expect(result.current.playerFilterState.selectedSeasons).toEqual([2025]);
        expect(result.current.filteredData.map(g => g.game_number)).toEqual([1]);
    });

    it('starts empty without data', () => {
        const {result} = renderHook(() => useAppearancesFilter(undefined));

        expect(result.current.filteredData).toEqual([]);
        expect(result.current.metadata.seasons).toEqual([]);
    });

    it('exposes the default filter state creator', () => {
        const state = createDefaultPlayerFilterState();
        expect(state.selectedSeasons).toEqual([]);
        expect(state.selectedEvents.Goals).toBe(false);
    });

    it('refilters when the filter state changes', () => {
        const {result} = renderHook(() => useAppearancesFilter(twoSeasons));

        act(() => {
            result.current.setPlayerFilterState({
                ...result.current.playerFilterState,
                selectedSeasons: [2024],
            });
        });

        expect(result.current.filteredData.map(g => g.season)).toEqual([2024]);
        expect(result.current.filteredData.map(g => g.game_number)).toEqual([1]);
    });
});
