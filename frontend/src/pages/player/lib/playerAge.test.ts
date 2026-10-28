import {describe, expect, it} from 'vitest';
import {ageOnMatchDate} from './playerAge';

describe('age on the match date', () => {
    it.each([
        ['2000-07-21', '2025-07-20', 24],
        ['2000-07-21', '2025-07-21', 25],
        ['2000-07-21', '2025-07-22', 25],
        ['2004-02-29', '2025-02-28', 20],
        ['2004-02-29', '2025-03-01', 21],
    ])('calculates completed years for %s on %s', (birth, date, age) => {
        expect(ageOnMatchDate(birth, date)).toBe(age);
    });
    it('does not infer an age for missing or invalid dates', () => {
        expect(ageOnMatchDate(undefined, '2025-07-21')).toBeNull();
        expect(ageOnMatchDate('invalid', '2025-07-21')).toBeNull();
        expect(ageOnMatchDate('2000-07-21', 'invalid')).toBeNull();
        expect(ageOnMatchDate('2000-07-21', '1999-07-21')).toBeNull();
    });
});
