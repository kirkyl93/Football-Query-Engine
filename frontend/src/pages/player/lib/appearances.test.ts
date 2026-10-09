import { describe, expect, it } from 'vitest';
import { EventType, PlayerAppearance } from '../../../types/Player';
import { AppearanceTypeOptions, HomeOrAwayOptions } from '../../../types/SearchOptions';
import { filterAppearances } from './appearancesFilter';
import { extractAppearancesMetadata } from './appearancesMetadata';
import { areNoEventsSelected, mapAppearanceEvents } from './appearancesEventMapper';
import { calculateBarChartOpacity, calculateSize } from './chartSizing';
import { calculateAppearancesTotals } from './appearancesTotals';
import { createDefaultPlayerFilterState } from '../hooks/useAppearancesFilter';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 0,
    club_id: 1,
    home_club_id: 1,
    home_club_name: 'Home',
    away_club_id: 2,
    away_club_name: 'Away',
    competition_id: 'GB1',
    competition_name: 'Premier League',
    competition_type: 'League',
    date: '2025-08-01',
    season: 2025,
    goals: 0,
    penalty_goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 1,
    away_club_goals: 0,
    goal_minutes: [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: 'Win',
    ...overrides,
});

describe('filterAppearances', () => {
    it('assigns sequential game numbers', () => {
        const result = filterAppearances(
            [game({date: '2025-08-01'}), game({date: '2025-08-08'})],
            createDefaultPlayerFilterState(),
        );
        expect(result.map(g => g.game_number)).toEqual([1, 2]);
    });

    it('filters by season', () => {
        const result = filterAppearances(
            [game({season: 2024}), game({season: 2025})],
            {...createDefaultPlayerFilterState(), selectedSeasons: [2025]},
        );
        expect(result).toHaveLength(1);
        expect(result[0].season).toBe(2025);
    });

    it('filters starters vs subbed-on appearances', () => {
        const data = [game({played_from_minute: 0}), game({played_from_minute: 60, minutes_played: [60, 90]})];
        const started = filterAppearances(
            data,
            {...createDefaultPlayerFilterState(), selectedAppearanceType: AppearanceTypeOptions.STARTED},
        );
        expect(started).toHaveLength(1);
        const subbed = filterAppearances(
            data,
            {...createDefaultPlayerFilterState(), selectedAppearanceType: AppearanceTypeOptions.SUBBED_ON},
        );
        expect(subbed).toHaveLength(1);
    });

    it('filters home vs away', () => {
        const data = [game({}), game({club_id: 2, home_club_id: 1})];
        const home = filterAppearances(
            data,
            {...createDefaultPlayerFilterState(), selectedHomeOrAway: HomeOrAwayOptions.HOME},
        );
        expect(home).toHaveLength(1);
        expect(home[0].club_id).toBe(1);
    });
});

describe('extractAppearancesMetadata', () => {
    it('derives seasons, competitions and clubs', () => {
        const metadata = extractAppearancesMetadata([
            game({season: 2024}),
            game({season: 2025, competition_name: 'Champions League', competition_type: 'Europe'}),
        ]);

        expect(metadata.finalSeason).toBe(2025);
        expect(metadata.seasons).toEqual([2024, 2025]);
        expect(metadata.leagueCompetitions).toEqual(['Premier League']);
        expect(metadata.europeanCompetitions).toEqual(['Champions League']);
        expect(metadata.clubsPlayedFor).toEqual([[1, 'Home']]);
        expect(metadata.clubsPlayedAgainst).toEqual([[2, 'Away']]);
    });
});

describe('areNoEventsSelected', () => {
    it('detects empty and non-empty selections', () => {
        const empty = createDefaultPlayerFilterState().selectedEvents;
        expect(areNoEventsSelected(empty)).toBe(true);
        expect(areNoEventsSelected({...empty, [EventType.Goals]: true})).toBe(false);
    });
});

describe('mapAppearanceEvents', () => {
    it('maps goals, cards and result dots when nothing is filtered', () => {
        const events = mapAppearanceEvents(
            [game({game_number: 1, goals: 1, goal_minutes: [23], yellow_minutes: [50]})],
            createDefaultPlayerFilterState().selectedEvents,
            true,
        );

        expect(events).toContainEqual({game_number: 1, minute: 23, size: 5, color: 'blue', shape: 'rectangle'});
        expect(events).toContainEqual({game_number: 1, minute: 50, size: 5, color: 'yellow', shape: 'rectangle'});
        expect(events).toContainEqual({game_number: 1, minute: -10, size: 5, color: 'green', shape: 'rectangle'});
    });

    it('only maps selected events when filtered', () => {
        const selected = {...createDefaultPlayerFilterState().selectedEvents, [EventType.Goals]: true};
        const events = mapAppearanceEvents(
            [game({game_number: 1, goals: 1, goal_minutes: [23], yellow_minutes: [50]})],
            selected,
            false,
        );

        expect(events.some(e => e.minute === 23)).toBe(true);
        expect(events.some(e => e.minute === 50)).toBe(false);
    });
});

describe('chart sizing', () => {
    it('returns max value at/below the minimum length', () => {
        expect(calculateSize(10, 1, 20)).toBe(20);
        expect(calculateBarChartOpacity(10, 0.25, 3)).toBe(0.25);
    });

    it('returns min/max extremes at/above the maximum length', () => {
        expect(calculateSize(700, 1, 20)).toBe(1);
        expect(calculateBarChartOpacity(700, 0.25, 3)).toBe(3);
    });
});

describe('calculateAppearancesTotals', () => {
    it('totals goals, assists and clean sheets', () => {
        const totals = calculateAppearancesTotals([
            game({goals: 1, goal_minutes: [10], assist_minutes: [20]}),
            game({home_club_goals: 0, result: 'Draw'}),
        ]);

        expect(totals.goals).toBe(1);
        expect(totals.assists).toBe(1);
        expect(totals.cleanSheets).toBe(2);
    });
});
