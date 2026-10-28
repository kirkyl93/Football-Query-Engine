import { describe, expect, it } from 'vitest';
import { AppearanceTypeOptions, HomeOrAwayOptions } from '../../../types/SearchOptions';
import { createDefaultPlayerFilterState } from '../hooks/useAppearancesFilter';
import {
    appearancesCompetitionsTitle,
    appearancesIncludeOnlyTitle,
    appearancesSeasonsTitle,
    constructAppearancesTitle,
} from './appearancesTitleBuilders';

describe('appearancesSeasonsTitle', () => {
    it('reports all seasons when empty', () => {
        expect(appearancesSeasonsTitle({...createDefaultPlayerFilterState(), selectedSeasons: []})).toBe(
            'all seasons',
        );
    });

    it('collapses consecutive seasons to a range', () => {
        expect(
            appearancesSeasonsTitle({
                ...createDefaultPlayerFilterState(),
                selectedSeasons: [2025, 2023, 2024],
            }),
        ).toBe('2023/24–2025/26');
    });

    it('does not mutate the input seasons array', () => {
        const selectedSeasons = [2025, 2023, 2024];
        appearancesSeasonsTitle({...createDefaultPlayerFilterState(), selectedSeasons});
        expect(selectedSeasons).toEqual([2025, 2023, 2024]);
    });
});

describe('appearancesCompetitionsTitle', () => {
    it('reports all comps when empty', () => {
        expect(appearancesCompetitionsTitle(createDefaultPlayerFilterState())).toBe('all comps');
    });

    it('resolves known competition names and keeps unknown ones verbatim', () => {
        expect(
            appearancesCompetitionsTitle({
                ...createDefaultPlayerFilterState(),
                selectedCompetitions: ['Premier League', 'Champions League', 'Made Up Cup'],
            }),
        ).toBe('Premier League + Champions League + Made Up Cup');
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
        ).toBe('starts, 60+ minutes');
    });

    it('describes a minute window for sub appearances', () => {
        expect(
            appearancesIncludeOnlyTitle({
                ...createDefaultPlayerFilterState(),
                selectedAppearanceType: AppearanceTypeOptions.SUBBED_ON,
                selectedMinimumMinutesPlayed: 60,
                selectedMaximumMinutesPlayed: 90,
            }),
        ).toBe('sub appearances, 60–90 minutes');
    });

    it('is empty by default', () => {
        expect(appearancesIncludeOnlyTitle(createDefaultPlayerFilterState())).toBe('');
    });
});

describe('constructAppearancesTitle', () => {
    it('starts with the player name and default clauses', () => {
        expect(constructAppearancesTitle('Smith', createDefaultPlayerFilterState())).toBe(
            'Smith: all comps, all seasons',
        );
    });

    it('renders home matches and appearance clauses', () => {
        const title = constructAppearancesTitle('Mohamed Salah', {
            ...createDefaultPlayerFilterState(),
            selectedCompetitions: ['Premier League'],
            selectedSeasons: [2025],
            selectedHomeOrAway: HomeOrAwayOptions.HOME,
            selectedAppearanceType: AppearanceTypeOptions.STARTED,
        });
        expect(title).toBe('Mohamed Salah: Premier League, 2025/26, home matches, starts');
    });

    it('capitalizes the first clause when the player name is blank', () => {
        expect(constructAppearancesTitle('', createDefaultPlayerFilterState())).toBe(
            'All comps, all seasons',
        );
    });
});

it('distinguishes a match-minute window from minimum appearance duration', () => {
    expect(constructAppearancesTitle('Alex', {...createDefaultPlayerFilterState(), selectedMinuteFrom: 1, selectedMinuteTo: 45, selectedMinimumMinutesPlayed: 60}))
        .toContain('60+ minutes, minutes 1–45');
});

it('includes the age range and the match-minute window in the title', () => {
    expect(constructAppearancesTitle('Alex', {...createDefaultPlayerFilterState(), selectedMinimumAge: 24, selectedMaximumAge: 25, selectedMinuteFrom: 1, selectedMinuteTo: 45}))
        .toContain('24–25 years old, minutes 1–45');
});
