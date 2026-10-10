import { describe, expect, it } from 'vitest';
import {
    appearanceTypeSummary,
    eventsSummary,
    playerClubsForSummary,
    playerCompetitionSummary,
} from './playerFilterSummaries';
import { AppearanceTypeOptions } from '../../../types/SearchOptions';
import { EventType } from '../../../types/Player';
import type { EventSelection } from './appearancesEventMapper';

const noEvents: EventSelection = {
    [EventType.Goals]: false,
    [EventType.Penalties]: false,
    [EventType.OwnGoals]: false,
    [EventType.Assists]: false,
    [EventType.CleanSheets]: false,
    [EventType.Yellows]: false,
    [EventType.Reds]: false,
};

describe('playerCompetitionSummary', () => {
    it('is blank when empty', () => {
        expect(playerCompetitionSummary([])).toBe('');
    });

    it('names a single competition and counts more', () => {
        expect(playerCompetitionSummary(['Premier League'])).toBe('Premier League');
        expect(playerCompetitionSummary(['Premier League', 'Champions League'])).toBe('2 comps');
    });
});

describe('playerClubsForSummary', () => {
    const clubs: [number, string][] = [[1, 'Arsenal'], [2, 'Chelsea'], [3, 'Liverpool']];

    it('is blank when empty', () => {
        expect(playerClubsForSummary([], clubs)).toBe('');
    });

    it('names a single club and counts more', () => {
        expect(playerClubsForSummary([1], clubs)).toBe('Arsenal');
        expect(playerClubsForSummary([1, 2], clubs)).toBe('2 clubs');
        expect(playerClubsForSummary([1, 2, 3], clubs)).toBe('3 clubs');
    });
});

describe('appearanceTypeSummary', () => {
    it('is blank for the defaults', () => {
        expect(appearanceTypeSummary(AppearanceTypeOptions.EITHER, undefined, undefined)).toBe('');
    });

    it('combines the type with the minutes window', () => {
        expect(
            appearanceTypeSummary(AppearanceTypeOptions.STARTED, undefined, undefined),
        ).toBe('Started');
        expect(appearanceTypeSummary(AppearanceTypeOptions.EITHER, 60, 75)).toBe("60'–75'");
        expect(
            appearanceTypeSummary(AppearanceTypeOptions.SUBBED_ON, 60, undefined),
        ).toBe("Subbed on · From 60'");
    });
});

describe('eventsSummary', () => {
    it('is blank when nothing is selected', () => {
        expect(eventsSummary(noEvents)).toBe('');
    });

    it('lists up to three events and counts more', () => {
        expect(eventsSummary({ ...noEvents, [EventType.Goals]: true })).toBe('Goals');
        expect(
            eventsSummary({
                ...noEvents,
                [EventType.Goals]: true,
                [EventType.Assists]: true,
                [EventType.Yellows]: true,
                [EventType.Reds]: true,
            }),
        ).toBe('4 events');
    });
});
