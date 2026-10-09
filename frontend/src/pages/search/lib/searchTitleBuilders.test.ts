import { describe, expect, it } from 'vitest';
import { createDefaultSearchFilterState } from './defaultSearchFilter';
import { constructSearchTitle, seasonsTitle, sortByTitle } from './searchTitleBuilders';

describe('seasonsTitle', () => {
    it('reports all seasons when empty', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: []})).toBe('ALL SEASONS');
    });

    it('formats a single season', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: [2025]})).toBe('2025/26');
    });

    it('collapses consecutive seasons to a range', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: [2025, 2023, 2024]})).toBe(
            '2023/24-2025/26',
        );
    });

    it('does not mutate the input seasons array', () => {
        const seasons = [2025, 2023, 2024];
        seasonsTitle({...createDefaultSearchFilterState(), seasons});
        expect(seasons).toEqual([2025, 2023, 2024]);
    });
});

describe('sortByTitle', () => {
    it('defaults to top scorers', () => {
        expect(sortByTitle(createDefaultSearchFilterState()).startsWith('TOP SCORERS')).toBe(true);
    });
});

describe('constructSearchTitle', () => {
    it('combines sort, competitions and seasons', () => {
        const title = constructSearchTitle(createDefaultSearchFilterState());
        expect(title).toContain('TOP SCORERS');
        expect(title).toContain('2025/26');
    });
});
