import { describe, expect, it } from 'vitest';
import {
    describeAge,
    describeCompetitions,
    describeRange,
    describeSeasons,
    describeSpan,
    findCompetitionNameById,
    findCompetitionNameByName,
    joinClauses,
    joinList,
} from './titleUtils';

describe('joinClauses', () => {
    it('joins non-empty clauses with commas and drops empty ones', () => {
        expect(joinClauses('a', '', null, 'b', undefined)).toBe('a, b');
    });

    it('is empty when nothing is present', () => {
        expect(joinClauses('', null)).toBe('');
    });
});

describe('joinList', () => {
    it('uses the conjunction before the final item', () => {
        expect(joinList(['A', 'B', 'C'])).toBe('A, B or C');
    });

    it('handles single and empty lists', () => {
        expect(joinList(['A'])).toBe('A');
        expect(joinList([])).toBe('');
    });
});

describe('describeSeasons', () => {
    it('uses an en dash for consecutive ranges', () => {
        expect(describeSeasons([2020, 2021, 2022])).toBe('2020/21–2022/23');
    });

    it('counts long non-consecutive sets', () => {
        const seasons = Array.from({length: 10}, (_, i) => 2000 + i * 2);
        expect(describeSeasons(seasons)).toBe('10 seasons');
    });
});

describe('describeCompetitions', () => {
    it('collapses ten or more entries to a count', () => {
        expect(describeCompetitions(Array.from({length: 10}, (_, i) => `c${i}`))).toBe('10 comps');
    });
});

describe('competition lookup', () => {
    it('resolves ids across leagues and European competitions', () => {
        expect(findCompetitionNameById('GB1')).toBe('Premier League');
        expect(findCompetitionNameById('CL')).toBe('Champions League');
        expect(findCompetitionNameById('ZZ')).toBe('ZZ');
    });

    it('resolves names and falls back verbatim', () => {
        expect(findCompetitionNameByName('La Liga')).toBe('La Liga');
        expect(findCompetitionNameByName('Ghost League')).toBe('Ghost League');
    });
});

describe('describeRange', () => {
    it('distinguishes zero bounds from missing bounds', () => {
        expect(describeRange(undefined, 0, 'goal')).toBe('at most 0 goals');
        expect(describeRange(0, 0, 'assist')).toBe('exactly 0 assists');
        expect(describeRange(0, 3, 'goal')).toBe('between 0 and 3 goals');
        expect(describeRange(0, undefined, 'assist')).toBe('at least 0 assists');
    });

    it('describes exact, between, minimum and maximum bounds', () => {
        expect(describeRange(2, 2, 'goal')).toBe('exactly 2 goals');
        expect(describeRange(1, 3, 'goal')).toBe('between 1 and 3 goals');
        expect(describeRange(3, undefined, 'goal')).toBe('at least 3 goals');
        expect(describeRange(undefined, 3, 'goal')).toBe('at most 3 goals');
    });

    it('pluralizes a bound of one correctly', () => {
        expect(describeRange(1, 1, 'goal')).toBe('exactly 1 goal');
        expect(describeRange(undefined, 1, 'assist')).toBe('at most 1 assist');
    });

    it('accepts a custom plural', () => {
        expect(describeRange(2, undefined, 'goal and assist', 'goals and assists')).toBe(
            'at least 2 goals and assists',
        );
    });

    it('is empty with no bounds', () => {
        expect(describeRange(undefined, undefined, 'goal')).toBe('');
    });
});

describe('describeSpan', () => {
    it('describes combined, open-ended and single values', () => {
        expect(describeSpan(170, 185, 'cm')).toBe('170–185 cm');
        expect(describeSpan(170, undefined, 'cm')).toBe('170+ cm');
        expect(describeSpan(undefined, 185, 'cm')).toBe('up to 185 cm');
        expect(describeSpan(180, 180, 'cm')).toBe('180 cm');
        expect(describeSpan(undefined, undefined, 'cm')).toBe('');
    });
});

describe('describeAge', () => {
    it('wraps the span in an age phrase', () => {
        expect(describeAge(20, 30)).toBe('aged 20–30');
        expect(describeAge(20, undefined)).toBe('aged 20+');
        expect(describeAge(undefined, 25)).toBe('aged up to 25')
        expect(describeAge(undefined, undefined)).toBe('');
    });
});
