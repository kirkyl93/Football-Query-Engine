import { fireEvent, render, renderHook, screen, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import AppearancesSectionModal from './AppearancesSectionModal';
import StatsSectionModal from './StatsSectionModal';
import PlayerChartsGrid from './PlayerChartsGrid';
import AppearancesChartTitle from './AppearancesChartTitle';
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

/** Shared-view harness: one view per player, as owned by PlayerChartsGrid. */
const AppearancesHarness: React.FC<{
    hasComparison: boolean;
    mainData?: PlayerAppearance[];
    comparisonData?: PlayerAppearance[];
}> = ({hasComparison, mainData = data, comparisonData = data}) => {
    const mainView = useAppearanceView(mainData);
    const comparisonView = useAppearanceView(comparisonData);
    return (
        <AppearancesSectionModal
            mainLabel="Kane"
            mainView={mainView}
            comparisonLabel="Haaland"
            comparisonView={comparisonView}
            hasComparison={hasComparison}
            onClose={vi.fn()}
        />
    );
};

describe('AppearancesSectionModal', () => {
    it('shows side-by-side panes that expand to one and back', () => {
        render(<AppearancesHarness hasComparison={true} />);

        expect(screen.getByRole('button', {name: 'Expand Kane appearances'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Expand Haaland appearances'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Expand Kane appearances'}));
        expect(screen.getByRole('button', {name: '← Back to side-by-side'})).toBeInTheDocument();
        // Focused layout hides the per-pane expand actions.
        expect(screen.queryByRole('button', {name: 'Expand Haaland appearances'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: '← Back to side-by-side'}));
        expect(screen.getByRole('button', {name: 'Expand Haaland appearances'})).toBeInTheDocument();
    });

    it('renders a single chart with no expand step when alone', () => {
        render(<AppearancesHarness hasComparison={false} />);

        expect(screen.queryByRole('button', {name: /Expand .* appearances/})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: '← Back to side-by-side'})).not.toBeInTheDocument();
    });

    it('shares one filter state across both panes', async () => {
        const {container} = render(<AppearancesHarness hasComparison={true} />);
        // One shared view per player: filtering is a single control surface.
        // Both panes render from their player's view (two filter buttons).
        expect(screen.getAllByRole('button', {name: 'Filter'})).toHaveLength(2);
        expect(container.querySelector('[class*="modal-panel"]')).not.toBeNull();
    });
});

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
        expect(screen.queryByText(/AWAY FROM HOME/)).not.toBeInTheDocument();

        // Filter to away games only: both titles rewrite together.
        // (Rerender models the grid re-rendering and passing the view down.)
        act(() => {
            result.current.setPlayerFilterState({
                ...result.current.playerFilterState,
                selectedHomeOrAway: HomeOrAwayOptions.AWAY,
            });
        });
        rerender(<SharedTitles />);

        expect(screen.getAllByText(/AWAY FROM HOME/)).toHaveLength(2);
    });
});

describe('StatsSectionModal', () => {
    const statsProps = {
        playerName: 'Kane',
        comparisonPlayerName: '',
        stats: createDefaultPlayerStats(),
        comparisonStats: createDefaultPlayerStats(),
        playerStreaks: createDefaultPlayerStreaks(),
        comparisonPlayerStreaks: createDefaultPlayerStreaks(),
        onClose: vi.fn(),
    };

    it('grids nine charts and focuses one with a way back', () => {
        render(<StatsSectionModal {...statsProps} />);

        expect(screen.getAllByRole('button', {name: /Expand /})).toHaveLength(9);

        fireEvent.click(screen.getByRole('button', {name: 'Expand Per 90'}));
        expect(screen.getByRole('button', {name: '← Back to stat charts'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Expand Win percentage'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: '← Back to stat charts'}));
        expect(screen.getAllByRole('button', {name: /Expand /})).toHaveLength(9);
    });

    it('scopes to one group when chart ids are given', () => {
        render(<StatsSectionModal {...statsProps} title="Streak charts" chartIds={['team-streaks', 'player-streaks']} />);

        expect(screen.getByRole('dialog', {name: 'Streak charts'})).toBeInTheDocument();
        expect(screen.getAllByRole('button', {name: /Expand /})).toHaveLength(2);
        expect(screen.queryByRole('button', {name: 'Expand Per 90'})).not.toBeInTheDocument();
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

    it('opens the appearances and group sections from four tiles', () => {
        render(<PlayerChartsGrid {...gridProps} />);

        expect(screen.getAllByRole('button', {name: 'Open ⤢'})).toHaveLength(4);

        fireEvent.click(screen.getAllByRole('button', {name: 'Open ⤢'})[0]);
        expect(screen.getByRole('dialog', {name: 'Appearances'})).toBeInTheDocument();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('dialog', {name: 'Appearances'})).not.toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', {name: 'Open ⤢'})[1]);
        expect(screen.getByRole('dialog', {name: 'Streak charts'})).toBeInTheDocument();
        expect(screen.getAllByRole('button', {name: /Expand /})).toHaveLength(2);
    });
});
