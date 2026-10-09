import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClubAutocomplete } from './useClubAutocomplete';

const clubs = [{club_id: 1, name: 'Arsenal'}];

const mockFetch = (data: unknown = clubs) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => data}));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('useClubAutocomplete', () => {
    it('fetches suggestions after debounce for queries of 3+ characters', async () => {
        vi.useFakeTimers();
        mockFetch();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('search_name=Ars'));
        expect(result.current.suggestions).toEqual(clubs);
        expect(result.current.isDropdownVisible).toBe(true);
    });

    it('does not fetch for short queries', async () => {
        vi.useFakeTimers();
        mockFetch();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ar');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(fetch).not.toHaveBeenCalled();
        expect(result.current.suggestions).toEqual([]);
    });

    it('clears suggestions when the query is emptied', async () => {
        vi.useFakeTimers();
        mockFetch();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        expect(result.current.suggestions).toEqual(clubs);

        act(() => {
            result.current.setQuery('   ');
        });

        expect(result.current.suggestions).toEqual([]);
        expect(result.current.isDropdownVisible).toBe(false);
    });

    it('clear() resets query, suggestions and visibility', async () => {
        vi.useFakeTimers();
        mockFetch();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        act(() => {
            result.current.clear();
        });

        expect(result.current.query).toBe('');
        expect(result.current.suggestions).toEqual([]);
        expect(result.current.isDropdownVisible).toBe(false);
    });

    it('hides fetch errors without throwing', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(result.current.suggestions).toEqual([]);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
