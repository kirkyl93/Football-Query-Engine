import { describe, expect, it } from 'vitest';
import { createDefaultSearchFilterState } from './defaultSearchFilter';
import {
    constructSearchTitle,
    constructSearchTitleParts,
    minsTitle,
    seasonsTitle,
    sortByTitle,
    sortCriteriaTitle,
    subsTitle,
} from './searchTitleBuilders';
import {
    HomeOrAwayOptions,
    PenaltyOptions,
    SortOptions,
    StatScope,
} from '../../../types/SearchOptions';

describe('seasonsTitle', () => {
    it('reports all seasons when empty', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: []})).toBe('all seasons');
    });

    it('formats a single season', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: [2025]})).toBe('2025/26');
    });

    it('collapses consecutive seasons to a range', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: [2025, 2023, 2024]})).toBe(
            '2023/24–2025/26',
        );
    });

    it('lists non-consecutive seasons', () => {
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons: [2025, 2023]})).toBe(
            '2023/24, 2025/26',
        );
    });

    it('collapses ten or more non-consecutive seasons to a count', () => {
        const seasons = Array.from({length: 10}, (_, i) => 2000 + i * 2);
        expect(seasonsTitle({...createDefaultSearchFilterState(), seasons})).toBe('10 seasons');
    });

    it('does not mutate the input seasons array', () => {
        const seasons = [2025, 2023, 2024];
        seasonsTitle({...createDefaultSearchFilterState(), seasons});
        expect(seasons).toEqual([2025, 2023, 2024]);
    });
});

describe('sortByTitle', () => {
    it('defaults to top scorers', () => {
        expect(sortByTitle(createDefaultSearchFilterState())).toBe('Top scorers');
    });

    it('describes each sort option', () => {
        expect(sortByTitle({...createDefaultSearchFilterState(), sortBy: SortOptions.MINUTES_PER_GOAL})).toBe(
            'Fewest minutes per goal',
        );
        expect(sortByTitle({...createDefaultSearchFilterState(), sortBy: SortOptions.NUMBER_OF_GAMES_WITH})).toBe(
            'Most games with',
        );
    });
});

describe('sortCriteriaTitle', () => {
    const withSort = (sortBy: SortOptions, bounds: Partial<ReturnType<typeof createDefaultSearchFilterState>>) => ({
        ...createDefaultSearchFilterState(),
        sortBy,
        ...bounds,
    });

    it('reports the appearance floor for minute-based sorts', () => {
        expect(
            sortCriteriaTitle(withSort(SortOptions.MINUTES_PER_GOAL, {minimumAppearances: 5})),
        ).toBe('at least 5 appearances');
    });

    it('is empty for minute-based sorts with no floor', () => {
        expect(sortCriteriaTitle(withSort(SortOptions.MINUTES_PER_GOAL, {minimumAppearances: 0}))).toBe('');
    });

    it('combines goal, assist and goals+assist bounds with commas only when present', () => {
        expect(
            sortCriteriaTitle(
                withSort(SortOptions.NUMBER_OF_GAMES_WITH, {
                    minimumGoals: 3,
                    minimumAssists: 2,
                    maximumAssists: 2,
                    minimumGoalsAndAssists: 5,
                }),
            ),
        ).toBe('at least 3 goals, exactly 2 assists, at least 5 goals and assists');
    });

    it('does not leave a dangling conjunction when only goals are bounded', () => {
        expect(
            sortCriteriaTitle(withSort(SortOptions.NUMBER_OF_GAMES_WITH, {minimumGoals: 3})),
        ).toBe('at least 3 goals');
    });

    it('describes an exact goals+assists value', () => {
        expect(
            sortCriteriaTitle(
                withSort(SortOptions.NUMBER_OF_SEASONS_WITH, {minimumGoalsAndAssists: 2, maximumGoalsAndAssists: 2}),
            ),
        ).toBe('exactly 2 goals and assists');
    });

    it('describes a maximum goals+assists bound (regression: wrong variable was used)', () => {
        expect(
            sortCriteriaTitle(
                withSort(SortOptions.NUMBER_OF_SEASONS_WITH, {maximumGoalsAndAssists: 4}),
            ),
        ).toBe('at most 4 goals and assists');
    });

    it('describes a between range', () => {
        expect(
            sortCriteriaTitle(withSort(SortOptions.NUMBER_OF_GAMES_WITH, {minimumGoals: 1, maximumGoals: 3})),
        ).toBe('between 1 and 3 goals');
    });

    it('uses singular wording for a bound of one', () => {
        expect(
            sortCriteriaTitle(withSort(SortOptions.NUMBER_OF_GAMES_WITH, {minimumGoals: 1})),
        ).toBe('at least 1 goal');
    });
});

describe('subsTitle', () => {
    it('is empty unless subs-only is on', () => {
        expect(subsTitle({...createDefaultSearchFilterState(), latestSubOnTime: 75})).toBe('');
    });

    it('reports subs only with no timing bounds', () => {
        expect(subsTitle({...createDefaultSearchFilterState(), subsOnly: true})).toBe('subs only');
    });

    it('reports the latest sub-on time without stray syntax (regression)', () => {
        expect(
            subsTitle({...createDefaultSearchFilterState(), subsOnly: true, latestSubOnTime: 75}),
        ).toBe('came on by minute 75');
    });

    it('reports an earliest sub-on time', () => {
        expect(
            subsTitle({...createDefaultSearchFilterState(), subsOnly: true, earliestSubOnTime: 60}),
        ).toBe('came on from minute 60 onwards');
    });

    it('reports a sub-on window', () => {
        expect(
            subsTitle({
                ...createDefaultSearchFilterState(),
                subsOnly: true,
                earliestSubOnTime: 60,
                latestSubOnTime: 75,
            }),
        ).toBe('came on between minutes 60 and 75');
    });

    it('reports an exact sub-on minute', () => {
        expect(
            subsTitle({
                ...createDefaultSearchFilterState(),
                subsOnly: true,
                earliestSubOnTime: 75,
                latestSubOnTime: 75,
            }),
        ).toBe('came on in minute 75');
    });
});

describe('minsTitle', () => {
    it('combines a minute window', () => {
        expect(minsTitle({...createDefaultSearchFilterState(), minuteFrom: 60, minuteTo: 75})).toBe(
            'minutes 60–75',
        );
    });

    it('handles a single bound', () => {
        expect(minsTitle({...createDefaultSearchFilterState(), minuteFrom: 60})).toBe('from minute 60');
        expect(minsTitle({...createDefaultSearchFilterState(), minuteTo: 75})).toBe('until minute 75');
    });
});

describe('constructSearchTitleParts', () => {
    it('keeps qualifying thresholds in the count-ranking headline', () => {
        const parts = constructSearchTitleParts({
            ...createDefaultSearchFilterState(),
            sortBy: SortOptions.NUMBER_OF_SEASONS_WITH,
            minimumGoals: 20,
            minimumAssists: 10,
        });
        expect(parts.headline).toBe('Most seasons with at least 20 goals, at least 10 assists');
        expect(parts.filters).toEqual(['Premier League', '2025/26']);
    });

    it('uses a complete count headline when no thresholds are selected', () => {
        const parts = constructSearchTitleParts({
            ...createDefaultSearchFilterState(),
            sortBy: SortOptions.NUMBER_OF_GAMES_WITH,
        });
        expect(parts.headline).toBe('Most qualifying games');
    });
});

describe('constructSearchTitle', () => {
    it('combines sort, competitions and seasons', () => {
        expect(constructSearchTitle(createDefaultSearchFilterState())).toBe(
            'Top scorers: Premier League, 2025/26',
        );
    });

    it('renders a full clause chain in order', () => {
        const title = constructSearchTitle({
            ...createDefaultSearchFilterState(),
            competitions: ['GB1', 'CL'],
            seasons: [2023, 2024, 2025],
            positions: ['Forward', 'Winger'],
            minAge: 20,
            maxHeight: 185,
            playerNames: ['Kylian Mbappé', 'Erling Haaland'],
            homeOrAway: HomeOrAwayOptions.AWAY,
            penalties: PenaltyOptions.EXCLUDE_PENALTIES,
            statScope: StatScope.GAME,
        });
        expect(title).toBe(
            'Top scorers: per-game stats, Premier League + Champions League, 2023/24–2025/26, ' +
            'Forward or Winger, aged 20+, up to 185 cm, Kylian Mbappé or Erling Haaland, ' +
            'excluding penalties, away matches',
        );
    });

    it('renders empty competitions and seasons as all comps, all seasons', () => {
        const title = constructSearchTitle({
            ...createDefaultSearchFilterState(),
            seasons: [],
            competitions: [],
        });
        expect(title).toBe('Top scorers: all comps, all seasons');
    });
});
