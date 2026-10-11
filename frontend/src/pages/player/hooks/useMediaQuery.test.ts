import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPARE_MIN_WIDTH_PX, useMediaQuery } from './useMediaQuery';

const stubMatchMedia = (matches: boolean) => {
    const listeners = new Set<(e: { matches: boolean }) => void>();
    const mql = {
        matches,
        addEventListener: vi.fn((_: string, listener: (e: { matches: boolean }) => void) => {
            listeners.add(listener);
        }),
        removeEventListener: vi.fn((_: string, listener: (e: { matches: boolean }) => void) => {
            listeners.delete(listener);
        }),
        __emit: (next: boolean) => {
            listeners.forEach((listener) => listener({matches: next}));
        },
    };
    vi.stubGlobal('matchMedia', vi.fn(() => mql));
    return mql;
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
    it('reflects the initial match state', () => {
        stubMatchMedia(true);
        const {result} = renderHook(() => useMediaQuery(`(min-width: ${COMPARE_MIN_WIDTH_PX}px)`));
        expect(result.current).toBe(true);
    });

    it('is disabled below the compare breakpoint', () => {
        stubMatchMedia(false);
        const {result} = renderHook(() => useMediaQuery(`(min-width: ${COMPARE_MIN_WIDTH_PX}px)`));
        expect(result.current).toBe(false);
    });

    it('follows viewport changes and unsubscribes on unmount', () => {
        const mql = stubMatchMedia(false);
        const {result, unmount} = renderHook(() => useMediaQuery('(min-width: 900px)'));

        act(() => {
            mql.__emit(true);
        });
        expect(result.current).toBe(true);

        unmount();
        expect(mql.removeEventListener).toHaveBeenCalled();
    });
});
