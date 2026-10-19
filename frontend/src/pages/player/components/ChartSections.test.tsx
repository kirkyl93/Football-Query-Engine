import { fireEvent, render, renderHook, screen, act, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import PlayerChartsGrid from './PlayerChartsGrid';
import AppearancesChartTitle from './AppearancesChartTitle';
import {buildStatDefs, STAT_GROUPS} from './statCharts';
import {useAppearanceView} from '../hooks/useAppearanceView';
import {HomeOrAwayOptions} from '../../../types/SearchOptions';
import {
    createDefaultPlayerStats,
    createDefaultPlayerStreaks,
    type PlayerAppearance,
} from '../../../types/Player';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 0,
    club_id: 1,
    home_club_id: 1,
    home_club_name: 'Home',
    away_club_id: 2,
    away_club_name: 'Away',
    competition_id: 'CL',
    competition_name: 'Champions League',
    competition_type: 'Europe',
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

const data = [game({date: '2025-09-01'}), game({date: '2025-09-08'})];

describe('shared appearance view', () => {
    it('one shared view updates every consumer when filters change', () => {
        const {result} = renderHook(() => useAppearanceView(data));
        const SharedTitles: React.FC = () => {
            const view = result.current;
            return (
                <>
                    <AppearancesChartTitle playerName="" filterState={view.playerFilterState} />
                    <AppearancesChartTitle playerName="Haaland" filterState={view.playerFilterState} />
                </>
            );
        };
        const {rerender} = render(<SharedTitles />);
        expect(screen.queryByText(/away matches/)).not.toBeInTheDocument();

        // Filter to away games only: both titles rewrite together.
        // (Rerender models the grid re-rendering and passing the view down.)
        act(() => {
            result.current.setPlayerFilterState({
                ...result.current.playerFilterState,
                selectedHomeOrAway: HomeOrAwayOptions.AWAY,
            });
        });
        rerender(<SharedTitles />);

        expect(screen.getAllByText(/away matches/)).toHaveLength(2);
    });
});

describe('stat chart registry', () => {
    it('covers every group id with a titled chart exactly once', () => {
        const defs = buildStatDefs({
            playerName: 'Kane',
            comparisonPlayerName: '',
            stats: createDefaultPlayerStats(),
            comparisonStats: createDefaultPlayerStats(),
            playerStreaks: createDefaultPlayerStreaks(),
            comparisonPlayerStreaks: createDefaultPlayerStreaks(),
        });
        const byId = new Map(defs.map((def) => [def.id, def]));
        const grouped = STAT_GROUPS.flatMap((group) => group.chartIds);
        expect(grouped).toHaveLength(9);
        expect(new Set(grouped).size).toBe(9);
        for (const id of grouped) {
            expect(byId.get(id)?.title).toBeTruthy();
        }
    });
});

describe('PlayerChartsGrid sections', () => {
    const gridProps = {
        playerLastName: 'Kane',
        playerGameData: data,
        comparisonPlayerName: '',
        comparisonPlayerGameData: [],
        stats: createDefaultPlayerStats(),
        comparisonStats: createDefaultPlayerStats(),
        playerStreaks: createDefaultPlayerStreaks(),
        comparisonPlayerStreaks: createDefaultPlayerStreaks(),
        onZoomChange: vi.fn(),
        onComparisonZoomChange: vi.fn(),
        comparisonEnabled: true,
    };

    it('renders four tiles with per-chart fullscreen expand', () => {
        render(<PlayerChartsGrid {...gridProps} />);

        // Nine minis plus the main appearances chart each expand alone.
        expect(screen.getAllByRole('button', {name: /Expand /})).toHaveLength(10);

        fireEvent.click(screen.getByRole('button', {name: 'Expand Per 90'}));
        const dialog = screen.getByRole('dialog', {name: 'Per 90'});
        // Fullscreen single chart: no collection chrome, no back step.
        expect(within(dialog).queryByRole('button', {name: /Back to/})).not.toBeInTheDocument();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('dialog', {name: 'Per 90'})).not.toBeInTheDocument();
    });

    it('names each appearances chart while comparing', () => {
        render(
            <PlayerChartsGrid
                {...gridProps}
                comparisonPlayerName="Haaland"
                comparisonPlayerGameData={data}
            />,
        );

        const titles = screen.getAllByRole('heading', {level: 4}).map((heading) => heading.textContent);
        expect(titles.some((title) => title?.startsWith('Kane: '))).toBe(true);
        expect(titles.some((title) => title?.startsWith('Haaland: '))).toBe(true);
        expect(screen.getByText('Kane vs Haaland')).toBeInTheDocument();
    });

    it('omits the player name when viewing a single player', () => {
        render(<PlayerChartsGrid {...gridProps} />);

        const titles = screen.getAllByRole('heading', {level: 4}).map((heading) => heading.textContent);
        expect(titles.some((title) => title?.startsWith('Kane: '))).toBe(false);
    });

    it('expands an individual appearances chart fullscreen from level 0', () => {
        render(<PlayerChartsGrid {...gridProps} />);

        fireEvent.click(screen.getByRole('button', {name: 'Expand Kane full screen'}));
        expect(screen.getByRole('dialog', {name: 'Appearances — Kane'})).toBeInTheDocument();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('dialog', {name: 'Appearances — Kane'})).not.toBeInTheDocument();
    });
});
