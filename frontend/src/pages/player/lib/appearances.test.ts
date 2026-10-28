import {calculatePlayerAndTeamStats} from './playerStatsCalculator';
import {calculatePlayerStreaks} from './playerStreakCalculator';
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

describe('player minute windows', () => {
    const window = (from?: number, to?: number) => ({...createDefaultPlayerFilterState(), selectedMinuteFrom: from, selectedMinuteTo: to});

    it('excludes non-overlapping games from player totals, team stats and streaks', () => {
        const games = [
            game({game_id: 1, date: '2025-08-01', goals: 1, goal_minutes: [10], home_club_goals: 2}),
            game({game_id: 2, date: '2025-08-08', played_from_minute: 60, minutes_played: [60, 90], result: 'Loss', home_club_goals: 0, away_club_goals: 3}),
            game({game_id: 3, date: '2025-08-15', goals: 1, goal_minutes: [45], home_club_goals: 3}),
        ];
        const filtered = filterAppearances(games, window(1, 45));
        expect(filtered.map(g => [g.game_id, g.game_number])).toEqual([[1, 1], [3, 2]]);
        const stats = calculatePlayerAndTeamStats(filtered);
        expect([stats.totalGames, stats.totalMinutes, stats.totalWins, stats.totalLosses, stats.totalTeamGoals, stats.totalTeamGoalsConceded]).toEqual([2, 90, 2, 0, 5, 0]);
        const streaks = calculatePlayerStreaks(filtered);
        expect(streaks.longestWinningStreak.count).toBe(2);
        expect(streaks.longestGoalStreak.count).toBe(2);
        expect(stats.gamesStartedAndFinished).toBe(2);
    });

    it('counts every repeated event inclusively and leaves the source response intact', () => {
        const original = game({goals: 4, penalty_goals: 1, assists: 3, yellow_cards: 1, red_cards: 1,
            goal_minutes: [45, 90, 90], penalty_goal_minutes: [90], assist_minutes: [45, 90, 90],
            own_goal_minutes: [45, 90, 90], yellow_minutes: [90], red_minutes: [90]});
        const before = structuredClone(original);
        const [filtered] = filterAppearances([original], window(90, 90));
        expect(filtered).toMatchObject({minutes_played: [89, 90], goals: 3, penalty_goals: 1, assists: 2,
            yellow_cards: 1, red_cards: 1, goal_minutes: [90, 90], penalty_goal_minutes: [90],
            assist_minutes: [90, 90], own_goal_minutes: [90, 90], yellow_minutes: [90], red_minutes: [90]});
        const totals = calculateAppearancesTotals([filtered]);
        expect(totals).toMatchObject({goals: 2, penalties: 1, assists: 2, ownGoals: 2, yellows: 1, reds: 1});
        expect(calculatePlayerAndTeamStats([filtered]).totalMinutes).toBe(1);
        expect(original).toEqual(before);
        expect(filterAppearances([original], window())[0]).toEqual({...original, game_number: 1});
    });

    it.each<[number, number, number, number[], number[] | null]>([
        [1, 45, 60, [60, 90], null],
        [60, 60, 60, [60, 90], [59, 60]],
        [60, 90, 60, [60, 90], [60, 90]],
        [46, 90, 46, [46, 90], [45, 90]],
        [1, 45, 46, [46, 90], null],
        [90, 90, 90, [89, 90], [89, 90]],
        [89, 89, 90, [89, 90], null],
        [91, 120, 0, [0, 120], [90, 120]],
        [91, 120, 0, [0, 90], null],
        [0, 45, 0, [0, 90], [0, 45]],
    ])('handles %i–%i for an entrant at %i', (from, to, entry, interval, expected) => {
        const result = filterAppearances([game({played_from_minute: entry, minutes_played: interval as number[]})], window(from as number, to as number));
        expect(result[0]?.minutes_played ?? null).toEqual(expected);
    });

    it('keeps minimum appearance duration separate from the match-minute window', () => {
        const filtered = filterAppearances([game({goal_minutes: [10], goals: 1})], {...window(10, 10), selectedMinimumMinutesPlayed: 80});
        expect(filtered).toHaveLength(1);
        expect(calculatePlayerAndTeamStats(filtered).totalMinutes).toBe(1);
    });

    it('counts a second-yellow dismissal even when the first booking is outside the window', () => {
        const original = game({yellow_cards: 2, yellow_minutes: [30, 70], minutes_played: [0, 70]});
        const [early] = filterAppearances([original], window(1, 45));
        const [late] = filterAppearances([original], window(46, 90));
        expect(calculatePlayerAndTeamStats([early]).totalReds).toBe(0);
        expect(calculatePlayerAndTeamStats([late]).totalReds).toBe(1);
        expect(calculateAppearancesTotals([late])).toMatchObject({yellows: 1, reds: 1});
        expect(calculatePlayerStreaks([late]).longestRedStreak.count).toBe(1);
        const events = mapAppearanceEvents([late], {...createDefaultPlayerFilterState().selectedEvents, Reds: true}, false);
        expect(events).toContainEqual({game_number: 1, minute: 70, size: 5, color: 'red', shape: 'rectangle'});
        expect(events.some(e => e.minute === 30)).toBe(false);
        const [all] = filterAppearances([original], window(1, 90));
        expect(calculatePlayerAndTeamStats([all]).totalReds).toBe(1);
    });

    it('keeps original starter and substitute classifications when clipping the playing interval', () => {
        const filtered = filterAppearances([game(), game({played_from_minute: 60, minutes_played: [60, 90]})], window(75, 90));
        const stats = calculatePlayerAndTeamStats(filtered);
        expect(stats.gamesStartedAndFinished).toBe(1);
        expect(stats.gamesSubbedOnAndFinished).toBe(1);
        expect(stats.totalMinutes).toBe(32);
    });
});

it('retains a half-time entrant with a 45-minute appearance minimum and counts all bookings', () => {
    const original = game({played_from_minute: 46, minutes_played: [46, 90], yellow_cards: 2, yellow_minutes: [50, 90]});
    const result = filterAppearances([original], {...createDefaultPlayerFilterState(), selectedMinimumMinutesPlayed: 45, selectedMinuteFrom: 46, selectedMinuteTo: 90});
    expect(result).toHaveLength(1);
    expect(calculatePlayerAndTeamStats(result).totalMinutes).toBe(45);
    expect(calculateAppearancesTotals(result)).toMatchObject({yellows: 2, reds: 1});
    expect(calculateAppearancesTotals([original])).toMatchObject({yellows: 2, reds: 1});
});

it('filters inclusively by match-date age alongside the minute window and other filters', () => {
    const games = [game({game_id: 1, date: '2025-07-20', goals: 1, goal_minutes: [10]}),
        game({game_id: 2, date: '2025-07-21', goals: 1, goal_minutes: [10]}),
        game({game_id: 3, date: '2025-07-22', played_from_minute: 60, minutes_played: [60, 90]})];
    const state = {...createDefaultPlayerFilterState(), selectedMinimumAge: 25, selectedMaximumAge: 25,
        selectedMinuteFrom: 1, selectedMinuteTo: 45, selectedSeasons: [2025], selectedCompetitions: ['Premier League']};
    const filtered = filterAppearances(games, state, '2000-07-21');
    expect(filtered.map(g => [g.game_id, g.game_number])).toEqual([[2, 1]]);
    expect(calculatePlayerAndTeamStats(filtered)).toMatchObject({totalGames: 1, totalMinutes: 45, totalWins: 1});
    expect(calculatePlayerStreaks(filtered).longestGoalStreak.count).toBe(1);
    expect(filterAppearances(games, {...state, selectedMinimumAge: undefined}, '2000-07-21')).toHaveLength(2);
    expect(filterAppearances(games, {...state, selectedMinimumAge: undefined, selectedMaximumAge: undefined}, '2000-07-21')).toHaveLength(2);
    expect(filterAppearances(games, state)).toEqual([]);
});
