import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useComparisonPlayer } from './useComparisonPlayer';

const games = [{game_number: 1}, {game_number: 2}];

const profile = {
    player_id: 7,
    first_name: 'Harry',
    last_name: 'Kane',
    current_club_id: 1,
    country_of_birth: 'England',
    country_of_citizenship: 'England',
    country_code: 'gb-eng',
    date_of_birth: '1993-07-28',
    age: 32,
    sub_position: 'CF',
    foot: 'right',
    height_in_cm: 188,
    image_url: 'http://example.com/kane.png',
};

const stubFetchOk = () =>
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.endsWith('/games')) {
            return {ok: true, json: async () => games};
        }
        return {ok: true, json: async () => [profile]};
    }));

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useComparisonPlayer', () => {
    it('loads games with a loading state on select', async () => {
        stubFetchOk();
        const {result} = renderHook(() => useComparisonPlayer('10'));

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });
        expect(result.current.comparisonLoading).toBe(true);

        await waitFor(() => expect(result.current.comparisonLoading).toBe(false));
        expect(result.current.comparisonPlayerName).toBe('Kane');
        expect(result.current.comparisonPlayer).toEqual(profile);
        expect(result.current.comparisonPlayerGameData).toEqual(games);
        expect(result.current.comparisonError).toBeNull();
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/players/7/games'));
        expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/players\/7$/));
    });

    it('reports a missing profile as a failure', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.endsWith('/games')) {
                return {ok: true, json: async () => games};
            }
            return {ok: true, json: async () => []};
        }));
        const {result} = renderHook(() => useComparisonPlayer('10'));

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });

        await waitFor(() => expect(result.current.comparisonLoading).toBe(false));
        expect(result.current.comparisonError).toBe('Failed to load comparison player data');
        expect(result.current.comparisonPlayer).toBeNull();
        expect(result.current.comparisonPlayerName).toBe('');
    });

    it('reports fetch failures without selecting', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        const {result} = renderHook(() => useComparisonPlayer('10'));

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });

        await waitFor(() => expect(result.current.comparisonLoading).toBe(false));
        expect(result.current.comparisonError).toBe('Failed to load comparison player data');
        expect(result.current.comparisonPlayerName).toBe('');
        expect(result.current.comparisonPlayerGameData).toEqual([]);
    });

    it('allows comparing a player with themselves for era-vs-era views', async () => {
        stubFetchOk();
        const {result} = renderHook(() => useComparisonPlayer('7'));

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });

        await waitFor(() => expect(result.current.comparisonLoading).toBe(false));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/players/7/games'));
        expect(result.current.comparisonError).toBeNull();
        expect(result.current.comparisonPlayerName).toBe('Kane');
        expect(result.current.comparisonPlayerGameData).toEqual(games);
    });

    it('clears comparison state', async () => {
        stubFetchOk();
        const {result} = renderHook(() => useComparisonPlayer('10'));

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });
        await waitFor(() => expect(result.current.comparisonPlayerName).toBe('Kane'));

        act(() => {
            result.current.clearComparison();
        });

        expect(result.current.comparisonPlayerName).toBe('');
        expect(result.current.comparisonPlayer).toBeNull();
        expect(result.current.comparisonPlayerGameData).toEqual([]);
        expect(result.current.comparisonError).toBeNull();
    });

    it('resets when the main player changes', async () => {
        stubFetchOk();
        const {result, rerender} = renderHook(
            ({id}: {id: string}) => useComparisonPlayer(id),
            {initialProps: {id: '10'}},
        );

        act(() => {
            result.current.selectComparisonPlayer(7, 'Kane');
        });
        await waitFor(() => expect(result.current.comparisonPlayerName).toBe('Kane'));

        rerender({id: '11'});

        expect(result.current.comparisonPlayerName).toBe('');
        expect(result.current.comparisonPlayer).toBeNull();
        expect(result.current.comparisonPlayerGameData).toEqual([]);
    });
});
