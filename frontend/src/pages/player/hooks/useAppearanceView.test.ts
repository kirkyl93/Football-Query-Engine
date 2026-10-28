import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

it('shares the minute-filtered games across the view and restores the loaded data without fetching', async () => {
    const loaded = [
        {...game(1), goals: 1, goal_minutes: [10]},
        {...game(2), played_from_minute: 60, minutes_played: [60, 90], goals: 1, goal_minutes: [75]},
        {...game(3), goals: 2, goal_minutes: [20, 80]},
    ];
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
        const {result} = renderHook(() => useAppearanceView(loaded));
        act(() => result.current.setPlayerFilterState({...result.current.playerFilterState, selectedMinuteFrom: 1, selectedMinuteTo: 45}));
        await waitFor(() => expect(result.current.zoomedData).toHaveLength(2));
        expect(result.current.totals.goals).toBe(2);
        expect(result.current.scatterData.filter(event => event.color === 'blue').map(event => event.minute)).toEqual([10, 20]);
        expect(result.current.filteredByGame.size).toBe(2);
        expect(result.current.yDomain).toEqual([0, 90]);
        act(() => result.current.setPlayerFilterState({...result.current.playerFilterState, selectedMinuteFrom: 100, selectedMinuteTo: 120}));
        await waitFor(() => expect(result.current.zoomedData).toEqual([]));
        expect(result.current.totals.goals).toBe(0);
        act(() => result.current.setPlayerFilterState({...result.current.playerFilterState, selectedMinuteFrom: undefined, selectedMinuteTo: undefined}));
        await waitFor(() => expect(result.current.zoomedData).toHaveLength(3));
        expect(result.current.totals.goals).toBe(4);
        expect(loaded[2].goal_minutes).toEqual([20, 80]);
        expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
        fetchSpy.mockRestore();
    }
});

it('uses each comparison player birth date locally when filtering by age', async () => {
    const loaded = [{...game(1), date: '2025-07-20'}, {...game(2), date: '2025-07-21'}];
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
        const {result} = renderHook(() => ({main: useAppearanceView(loaded, '2000-07-21'), comparison: useAppearanceView(loaded, '2001-07-21')}));
        act(() => {
            result.current.main.setPlayerFilterState({...result.current.main.playerFilterState, selectedMinimumAge: 25});
            result.current.comparison.setPlayerFilterState({...result.current.comparison.playerFilterState, selectedMinimumAge: 25});
        });
        await waitFor(() => expect(result.current.main.zoomedData).toHaveLength(1));
        expect(result.current.main.zoomedData[0].date).toBe('2025-07-21');
        expect(result.current.comparison.zoomedData).toEqual([]);
        expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
});
