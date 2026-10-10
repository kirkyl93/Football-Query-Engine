import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlayerAppearance } from '../../../types/Player';
import { useChartZoom } from './useChartZoom';

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

describe('useChartZoom', () => {
    it('initializes the window to the full range', () => {
        const data = career(10);
        const {result} = renderHook(() => useChartZoom(data));

        expect(result.current.startGame).toBe(1);
        expect(result.current.endGame).toBe(10);
        expect(result.current.zoomedData).toHaveLength(10);
    });

    it('drag-select commits an integer window and clears the gesture', async () => {
        const data = career(300);
        const {result} = renderHook(() => useChartZoom(data));

        act(() => {
            result.current.handleMouseDown({activeLabel: 3.4});
        });

        act(() => {
            result.current.handleMouseMove({activeLabel: 7.6});
        });
        await waitFor(() => expect(result.current.refAreaRight).toBe(8));

        act(() => {
            result.current.handleMouseUp();
        });

        expect(result.current.startGame).toBe(3);
        expect(result.current.endGame).toBe(8);
        expect(result.current.refAreaLeft).toBeNull();
        expect(result.current.refAreaRight).toBeNull();
    });

    it('zoom-out restores the full range after a drag', async () => {
        const data = career(300);
        const {result} = renderHook(() => useChartZoom(data));

        act(() => {
            result.current.handleMouseDown({activeLabel: 50});
        });
        act(() => {
            result.current.handleMouseMove({activeLabel: 60});
        });
        await waitFor(() => expect(result.current.refAreaRight).toBe(60));
        act(() => {
            result.current.handleMouseUp();
        });
        expect(result.current.zoomedData).toHaveLength(11);

        act(() => {
            result.current.handleZoomOut();
        });
        expect(result.current.startGame).toBe(1);
        expect(result.current.endGame).toBe(300);
        expect(result.current.zoomedData).toHaveLength(300);
    });
});
