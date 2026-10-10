import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useClubAutocomplete} from './useClubAutocomplete';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('useClubAutocomplete (local)', () => {
    it('returns local suggestions after debounce for queries of 2+ characters', async () => {
        vi.useFakeTimers();
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.current.suggestions.map(s => s.name)).toContain('Arsenal FC');
        expect(result.current.isDropdownVisible).toBe(true);
    });

    it('does not suggest for short queries', async () => {
        vi.useFakeTimers();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('A');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        expect(result.current.suggestions).toEqual([]);
    });

    it('clears suggestions when the query is emptied', async () => {
        vi.useFakeTimers();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });
        expect(result.current.suggestions.length).toBeGreaterThan(0);

        act(() => {
            result.current.setQuery('   ');
        });

        expect(result.current.suggestions).toEqual([]);
        expect(result.current.isDropdownVisible).toBe(false);
    });

    it('clear() resets query, suggestions and visibility', async () => {
        vi.useFakeTimers();
        const {result} = renderHook(() => useClubAutocomplete());

        act(() => {
            result.current.setQuery('Ars');
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(150);
        });

        act(() => {
            result.current.clear();
        });

        expect(result.current.query).toBe('');
        expect(result.current.suggestions).toEqual([]);
        expect(result.current.isDropdownVisible).toBe(false);
    });
});
