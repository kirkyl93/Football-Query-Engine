import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlayerAppearance } from '../../../../types/Player';
import AppearancesTooltip from './AppearancesTooltip';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 1,
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
    home_club_goals: 2,
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

describe('AppearancesTooltip', () => {
    it('renders nothing when inactive', () => {
        const {container} = render(
            <AppearancesTooltip active={false} payload={[{payload: game()}]} filteredData={[game()]}/>,
        );

        expect(container.firstChild).toBeNull();
    });

    it('resolves the appearance by game number when filters leave gaps', () => {
        // Filtered to two non-contiguous games: index math (game_number - 1)
        // would look up the wrong row or crash here.
        const first = game({game_number: 5, date: '2024-08-01', season: 2024});
        const second = game({game_number: 400, date: '2025-05-01', season: 2025, goals: 2});
        const filteredData = [first, second];
        const filteredByGame = new Map(filteredData.map((a) => [a.game_number, a]));

        render(
            <AppearancesTooltip
                active
                payload={[{payload: {game_number: 400}}]}
                filteredData={filteredData}
                filteredByGame={filteredByGame}
            />,
        );

        expect(screen.getByText('Season: 2025/26')).toBeInTheDocument();
        expect(screen.getByText('Goals: 2')).toBeInTheDocument();
    });

    it('uses the resolved bar fill for the club swatch', () => {
        const appearance = game({game_number: 7});
        render(
            <AppearancesTooltip
                active
                payload={[{payload: {game_number: 7}}]}
                filteredData={[appearance]}
                filteredByGame={new Map([[7, appearance]])}
                barFillsByGame={new Map([[7, 'rgb(1, 2, 3)']])}
            />,
        );

        expect(screen.getByTitle('1.FC Saarbrücken').style.background).toBe('rgb(1, 2, 3)');
    });
});
