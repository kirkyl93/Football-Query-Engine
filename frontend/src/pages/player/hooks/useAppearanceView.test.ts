import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlayerAppearance } from '../../../types/Player';
import { useAppearanceView } from './useAppearanceView';

const game = (n: number): PlayerAppearance => ({
    game_number: n,
    club_id: 5,
    home_club_id: 5,
    home_club_name: 'Home',
    away_club_id: 6,
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
});

const career = (count: number): PlayerAppearance[] =>
    Array.from({length: count}, (_, i) => game(i + 1));

// Stable reference: the view resets on identity change, so rebuilding per
// render would loop the data effect forever.
const data = career(10);

describe('useAppearanceView zoom filter', () => {
    it('is off at full range and on once a drag narrows the window', async () => {
        const {result} = renderHook(() => useAppearanceView(data));

        expect(result.current.hasZoomFilter).toBe(false);

        act(() => {
            result.current.handleMouseDown({activeLabel: 3});
        });
        act(() => {
            result.current.handleMouseMove({activeLabel: 7});
        });
        await waitFor(() => expect(result.current.refAreaRight).toBe(7));
        act(() => {
            result.current.handleMouseUp();
        });

        expect(result.current.zoomedData.map((g) => g.game_number)).toEqual([3, 4, 5, 6, 7]);
        expect(result.current.hasZoomFilter).toBe(true);
    });

    it('clears when zooming back out to the full range', async () => {
        const {result} = renderHook(() => useAppearanceView(data));

        act(() => {
            result.current.handleMouseDown({activeLabel: 3});
        });
        act(() => {
            result.current.handleMouseMove({activeLabel: 7});
        });
        await waitFor(() => expect(result.current.refAreaRight).toBe(7));
        act(() => {
            result.current.handleMouseUp();
        });
        expect(result.current.hasZoomFilter).toBe(true);

        act(() => {
            result.current.handleZoomOut();
        });
        expect(result.current.hasZoomFilter).toBe(false);
    });
});
