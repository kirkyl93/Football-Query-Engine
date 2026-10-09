import { describe, expect, it } from 'vitest';
import { parseOptionalNumber, toggleArrayValue } from './searchFilterUpdaters';

describe('toggleArrayValue', () => {
    it('adds a missing value', () => {
        expect(toggleArrayValue([2024, 2025], 2023)).toEqual([2024, 2025, 2023]);
    });

    it('removes a present value', () => {
        expect(toggleArrayValue([2024, 2025], 2024)).toEqual([2025]);
    });

    it('works for strings', () => {
        expect(toggleArrayValue(['GK', 'CB'], 'CB')).toEqual(['GK']);
    });
});

describe('parseOptionalNumber', () => {
    it('parses a number', () => {
        expect(parseOptionalNumber('80')).toBe(80);
    });

    it('returns undefined for an empty select', () => {
        expect(parseOptionalNumber('')).toBeUndefined();
    });
});
