import { describe, expect, it } from 'vitest';
import { AppearanceTypeOptions } from '../../../types/SearchOptions';
import { createDefaultPlayerFilterState } from '../hooks/useAppearancesFilter';
import {
    appearancesIncludeOnlyTitle,
    appearancesSeasonsTitle,
    constructAppearancesTitle,
} from './appearancesTitleBuilders';

describe('appearancesSeasonsTitle', () => {
    it('reports all seasons when empty', () => {
        expect(appearancesSeasonsTitle({...createDefaultPlayerFilterState(), selectedSeasons: []})).toBe(
            'ALL SEASONS',
        );
    });

    it('does not mutate the input seasons array', () => {
        const selectedSeasons = [2025, 2023, 2024];
        appearancesSeasonsTitle({...createDefaultPlayerFilterState(), selectedSeasons});
        expect(selectedSeasons).toEqual([2025, 2023, 2024]);
    });
});

describe('appearancesIncludeOnlyTitle', () => {
    it('describes started games with a minute floor', () => {
        expect(
            appearancesIncludeOnlyTitle({
                ...createDefaultPlayerFilterState(),
                selectedAppearanceType: AppearanceTypeOptions.STARTED,
                selectedMinimumMinutesPlayed: 60,
            }),
        ).toBe(' · GAMES STARTED · AT LEAST 60 MINS');
    });

    it('is empty by default', () => {
        expect(appearancesIncludeOnlyTitle(createDefaultPlayerFilterState())).toBe('');
    });
});

describe('constructAppearancesTitle', () => {
    it('starts with the upper-cased player name', () => {
        const title = constructAppearancesTitle('Smith', createDefaultPlayerFilterState());
        expect(title.startsWith('SMITH')).toBe(true);
        expect(title).toContain('ALL COMPS');
    });
});
