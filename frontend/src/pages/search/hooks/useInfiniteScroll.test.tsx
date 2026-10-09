import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll, type FetchParams } from './useInfiniteScroll';

const wrapper = ({children}: {children: React.ReactNode}) => (
    <MemoryRouter initialEntries={['/?seasons=2025']}>{children}</MemoryRouter>
);

describe('useInfiniteScroll', () => {
    it('loads the first page and stops when the page is short', async () => {
        const seen: FetchParams[] = [];
        const fetchFn = vi.fn(async (params: FetchParams) => {
            seen.push(params);
            return [{id: 1}, {id: 2}];
        });
        const {result} = renderHook(() => useInfiniteScroll(fetchFn), {wrapper});

        await waitFor(() => expect(result.current.hasData).toBe(true));

        expect(result.current.data).toEqual([{id: 1}, {id: 2}]);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(seen[0].page).toBe(0);
        expect(seen[0].limit).toBe(50);
        expect(seen[0].searchParams.get('seasons')).toBe('2025');
        expect(seen[0].signal).toBeInstanceOf(AbortSignal);
    });

    it('reports fetch failures', async () => {
        const fetchFn = vi.fn(async () => {
            throw new Error('offline');
        });
        const {result} = renderHook(() => useInfiniteScroll(fetchFn), {wrapper});

        await waitFor(() => expect(result.current.error).not.toBeNull());

        expect(result.current.error).toBe('Failed to fetch data');
        expect(result.current.hasData).toBe(false);
    });
});