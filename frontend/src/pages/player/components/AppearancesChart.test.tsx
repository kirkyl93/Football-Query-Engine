import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppearancesChart } from './AppearancesChart';
import type { PlayerAppearance } from '../../../types/Player';

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

const data = [
    game({ date: '2025-09-01' }),
    game({ date: '2025-09-08', goals: 1, goal_minutes: [23] }),
];

describe('AppearancesChart', () => {
    it('renders games', async () => {
        render(<AppearancesChart playerName="" data={data} onZoomChange={vi.fn()} />);

        expect(screen.getByText('Between 01/09/2025 and 08/09/2025')).toBeInTheDocument();
    });

    it('closes the filter drawer on outside click', async () => {
        const user = userEvent.setup();
        const {container} = render(
            <AppearancesChart playerName="" data={data} onZoomChange={vi.fn()} />,
        );

        await user.click(screen.getByRole('button', {name: 'Filter'}));
        const drawer = container.querySelector('[class*="player-filter-drawer"]');
        expect(drawer?.className).toMatch(/open/);

        fireEvent.mouseDown(document.body);

        expect(drawer?.className).not.toMatch(/open/);
    });

    it('survives filtering out every game', async () => {
        const user = userEvent.setup();
        const onZoomChange = vi.fn();
        render(<AppearancesChart playerName="" data={data} onZoomChange={onZoomChange} />);

        await user.click(screen.getByRole('button', {name: 'Filter'}));
        await user.click(screen.getByText('HOME OR AWAY'));
        await user.click(screen.getByText('Away'));
        await user.click(screen.getByText('APPLY'));

        // Zoom propagation is debounced so rapid zoom gestures don't recompute
        // page-level stats at 60Hz; the settled (empty) window arrives shortly after.
        await waitFor(() => expect(onZoomChange).toHaveBeenLastCalledWith([]));
        expect(screen.getByText('SEASONS')).toBeInTheDocument();
    });
});
