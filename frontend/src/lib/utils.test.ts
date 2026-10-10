import { describe, expect, it } from 'vitest';
import { colourDistance, getColour, hexToRGB } from './ColourUtils';
import { convertDateStringToDate, dateFormatter, formatSeason } from './DateUtils';

describe('formatSeason', () => {
    it('formats a season across a century boundary', () => {
        expect(formatSeason(1999)).toBe('1999/00');
    });

    it('formats a regular season', () => {
        expect(formatSeason(2025)).toBe('2025/26');
    });
});

describe('convertDateStringToDate', () => {
    it('parses a date string as UTC midnight', () => {
        expect(convertDateStringToDate('2025-08-01').toISOString()).toBe('2025-08-01T00:00:00.000Z');
    });

    it('falls back to now for an empty string', () => {
        const before = Date.now();
        const result = convertDateStringToDate('').getTime();
        expect(result).toBeGreaterThanOrEqual(before);
        expect(result).toBeLessThanOrEqual(Date.now());
    });
});

describe('dateFormatter', () => {
    it('formats in en-GB day/month/year order', () => {
        expect(dateFormatter.format(new Date('2025-08-01T00:00:00Z'))).toBe('01/08/2025');
    });
});

describe('getColour', () => {
    it('is deterministic per club', () => {
        expect(getColour(1)).toBe(getColour(1));
        expect(getColour(1)).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('differs between clubs', () => {
        expect(getColour(1)).not.toBe(getColour(2));
    });
});

describe('hexToRGB', () => {
    it('converts hex with hash to rgba', () => {
        expect(hexToRGB('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('converts hex without hash', () => {
        expect(hexToRGB('00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
    });
});

describe('colourDistance', () => {
    it('is zero for identical colours', () => {
        expect(colourDistance('#ef0107', '#ef0107')).toBe(0);
    });

    it('is maximal for black vs white', () => {
        expect(colourDistance('#000000', '#ffffff')).toBeCloseTo(Math.sqrt(3 * 255 ** 2), 5);
    });

    it('rates similar reds as close and red vs white as far', () => {
        expect(colourDistance('#ef0107', '#c8102e')).toBeLessThan(80);
        expect(colourDistance('#ef0107', '#ffffff')).toBeGreaterThan(200);
    });
});
