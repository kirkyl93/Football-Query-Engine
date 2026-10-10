import { describe, expect, it } from 'vitest';
import {
    clubsSummary,
    competitionSummary,
    countriesSummary,
    minMaxSummary,
    namesSummary,
    positionSummary,
    radioSummary,
    seasonSummary,
    sortSummary,
    subsSummary,
} from './filterSummaries';
import { HomeOrAwayOptions, PenaltyOptions, SortOptions, StatScope } from '../../../types/SearchOptions';

describe('seasonSummary', () => {
    it('is blank when empty', () => {
        expect(seasonSummary([])).toBe('');
    });

    it('formats a single season', () => {
        expect(seasonSummary([2025])).toBe('2025/26');
    });

    it('collapses consecutive seasons to a range', () => {
        expect(seasonSummary([2025, 2023, 2024])).toBe('2023/24-2025/26');
    });

    it('lists two non-consecutive seasons', () => {
        expect(seasonSummary([2025, 2023])).toBe('2023/24 · 2025/26');
    });

    it('counts three or more non-consecutive seasons', () => {
        expect(seasonSummary([2025, 2023, 2021])).toBe('3 seasons');
    });

    it('counts large selections', () => {
        expect(seasonSummary([2012, 2013, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022])).toBe(
            '10 seasons',
        );
    });
});

describe('competitionSummary', () => {
    it('is blank when empty', () => {
        expect(competitionSummary([])).toBe('');
    });

    it('names a single competition', () => {
        expect(competitionSummary(['GB1'])).toBe('Premier League');
    });

    it('counts multiple competitions', () => {
        expect(competitionSummary(['GB1', 'CL'])).toBe('2 comps');
    });
});

describe('positionSummary', () => {
    it('is empty when nothing selected', () => {
        expect(positionSummary([])).toBe('');
    });

    it('joins up to five positions', () => {
        expect(positionSummary(['CF', 'RW'])).toBe('CF · RW');
    });

    it('counts larger selections', () => {
        expect(positionSummary(['GK', 'LB', 'RB', 'CB', 'CDM', 'CM'])).toBe('6 positions');
    });
});

describe('minMaxSummary', () => {
    it('is empty when unset', () => {
        expect(minMaxSummary(undefined, undefined, '')).toBe('');
    });

    it('formats ranges and open ends', () => {
        expect(minMaxSummary(60, 75, "'")).toBe("60'–75'");
        expect(minMaxSummary(18, undefined, '')).toBe('From 18');
        expect(minMaxSummary(undefined, 35, '')).toBe('Up to 35');
        expect(minMaxSummary(180, 190, 'cm')).toBe('180cm–190cm');
    });
});

describe('namesSummary and countriesSummary', () => {
    it('is empty when unset', () => {
        expect(namesSummary([])).toBe('');
        expect(countriesSummary([])).toBe('');
    });

    it('lists up to two names', () => {
        expect(namesSummary(['Haaland', 'Mbappe'])).toBe('Haaland + Mbappe');
    });

    it('lists up to three countries', () => {
        expect(
            countriesSummary([
                { code: 'no', name: 'Norway' },
                { code: 'fr', name: 'France' },
                { code: 'de', name: 'Germany' },
            ]),
        ).toBe('Norway + France + Germany');
    });

    it('counts larger selections', () => {
        expect(namesSummary(['a', 'b', 'c'])).toBe('3 names');
        expect(
            countriesSummary([
                { code: 'no', name: 'Norway' },
                { code: 'fr', name: 'France' },
                { code: 'de', name: 'Germany' },
                { code: 'es', name: 'Spain' },
            ]),
        ).toBe('4 countries');
    });
});

describe('clubsSummary', () => {
    it('is empty when nothing selected', () => {
        expect(clubsSummary([], [])).toBe('');
    });

    it('counts each side', () => {
        expect(clubsSummary([1, 2], [3])).toBe('For: 2 · Against: 1');
        expect(clubsSummary([1], [])).toBe('For: 1');
    });
});

describe('subsSummary', () => {
    it('is empty unless subs only', () => {
        expect(subsSummary(false, undefined, undefined)).toBe('');
    });

    it('includes the time window when set', () => {
        expect(subsSummary(true, undefined, undefined)).toBe('Subs only');
        expect(subsSummary(true, 60, 75)).toBe("Subs only from 60' to 75'");
    });
});

describe('radioSummary', () => {
    const options = [
        { name: 'Either', id: 'e' },
        { name: 'Home', id: 'h' },
    ];

    it('is empty for the default', () => {
        expect(radioSummary('e', options, 'e')).toBe('');
    });

    it('names the non-default selection', () => {
        expect(radioSummary('h', options, 'e')).toBe('Home');
    });
});

describe('sortSummary', () => {
    it('always names the sort and scope', () => {
        expect(sortSummary(SortOptions.GOALS, StatScope.OVERALL)).toBe('Goals · Overall');
        expect(sortSummary(SortOptions.MINUTES_PER_GOAL, StatScope.SEASON)).toBe(
            'Mins/goal · Season',
        );
    });

    it('abbreviates the longest sorts', () => {
        expect(sortSummary(SortOptions.MINUTES_PER_GOAL_OR_ASSIST, StatScope.OVERALL)).toBe(
            'Mins/G+A · Overall',
        );
        expect(sortSummary(SortOptions.NUMBER_OF_GAMES_WITH, StatScope.SEASON)).toBe(
            'Games with · Season',
        );
    });

    it('respects externally applied sorts', () => {
        expect(sortSummary(SortOptions.ASSISTS, StatScope.OVERALL)).toBe('Assists · Overall');
    });
});

describe('penalty and home/away defaults', () => {
    it('hides the defaults', () => {
        expect(
            radioSummary(PenaltyOptions.INCLUDE_PENALTIES, [{ name: 'x', id: PenaltyOptions.INCLUDE_PENALTIES }], PenaltyOptions.INCLUDE_PENALTIES),
        ).toBe('');
        expect(
            radioSummary(HomeOrAwayOptions.HOME, [{ name: 'Home', id: HomeOrAwayOptions.HOME }], HomeOrAwayOptions.EITHER),
        ).toBe('Home');
    });
});
