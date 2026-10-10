import {describe, expect, it} from 'vitest';
import {
    getClubColours,
    getClubName,
    getClubPrimary,
    searchClubs,
} from './ClubDirectory';
import {CLUBS, CLUBS_COUNT} from '../data/Clubs';
import {getColour as getHashColour} from './ColourUtils';

describe('ClubDirectory', () => {
    it('covers the full ingested club set', () => {
        expect(CLUBS_COUNT).toBe(984);
        expect(Object.keys(CLUBS)).toHaveLength(984);
    });

    it('resolves known club names', () => {
        expect(getClubName(11)).toBe('Arsenal FC');
        expect(getClubName('31')).toBe('Liverpool FC');
    });

    it('falls back to a generic label for unknown ids', () => {
        expect(getClubName(999999)).toBe('Club 999999');
    });

    it('returns curated colours for famous clubs', () => {
        // Arsenal: red and white (override), not the hash colour.
        expect(getClubColours(11)).toEqual(['#ef0107', '#ffffff']);
        expect(getClubPrimary(11)).toBe('#ef0107');
    });

    it('falls back to the legacy hash colour when no colours are stored', () => {
        const idWithoutColours = Number(
            Object.keys(CLUBS).find(id => CLUBS[Number(id)].colours.length === 0) ?? 999999,
        );
        expect(getClubColours(idWithoutColours)).toEqual([getHashColour(idWithoutColours)]);
    });

    it('searches locally with prefix matches first', () => {
        const results = searchClubs('Ars');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Arsenal FC');
        expect(results.length).toBeLessThanOrEqual(10);
    });

    it('matches names regardless of diacritics', () => {
        const results = searchClubs('koln');
        expect(results.map(r => r.name)).toContain('1.FC Köln');
    });

    it('returns nothing for blank queries', () => {
        expect(searchClubs('   ')).toEqual([]);
    });
});
