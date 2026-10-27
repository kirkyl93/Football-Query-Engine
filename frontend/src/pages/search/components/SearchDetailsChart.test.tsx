import {cloneElement, ReactElement} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {SearchDetailsChart} from './SearchDetailsChart';
import {DetailGame} from '../lib/searchDetails';
import {PenaltyOptions} from '../../../types/SearchOptions';

vi.mock('../../player/components/appearances/AppearancesMainChart', () => ({
    default: ({zoomedData, tooltip}: {zoomedData: DetailGame[]; tooltip: ReactElement}) =>
        <div>{cloneElement(tooltip, {active: true, payload: [{payload: zoomedData[0]}]} as object)}</div>,
}));
const game: DetailGame = {
    game_id: 1, game_number: 1, club_id: 101, home_club_id: 101, home_club_name: 'Home',
    away_club_id: 102, away_club_name: 'Away', competition_id: 'GB1', competition_name: 'Premier League',
    competition_type: 'domestic_league', date: '2024-08-10', season: 2024, goals: 2, penalty_goals: 1,
    assists: 1, yellow_cards: 1, red_cards: 0, played_from_minute: 0, subbed_off_minute: 90,
    home_club_goals: 2, away_club_goals: 0, goal_minutes: [46], penalty_goal_minutes: [],
    own_goal_minutes: [], assist_minutes: [45], yellow_minutes: [46], red_minutes: [], minutes_played: [45, 46], result: 'Win',
    qualifies: true, matches_filters: true,
    stats: {appearances: 1, minutes: 2, goals: 1, assists: 1, yellows: 1, reds: 1},
};

describe('search detail chart presentation', () => {
    it('reuses the player tooltip with authoritative filtered totals and restores the event key', () => {
        render(<SearchDetailsChart games={[game]} penalties={PenaltyOptions.EXCLUDE_PENALTIES}/>);
        expect(screen.getByText('Season: 2024/25')).toBeVisible();
        expect(screen.getByRole('img', {name: 'Home'})).toBeVisible();
        expect(screen.getByRole('img', {name: 'Away'})).toBeVisible();
        expect(screen.getByText('Minutes: 2')).toBeVisible();
        expect(screen.getByText('Goals: 1')).toBeVisible();
        expect(screen.getByText('Reds: 1')).toBeVisible();
        expect(screen.getByText('1 Goal')).toBeVisible();
        expect(screen.getByText('1 Assist')).toBeVisible();
        expect(screen.getByText('1 Red')).toBeVisible();
        expect(screen.queryByText(/\d+ Pens?/)).not.toBeInTheDocument();
        expect(screen.getByLabelText('Match result key')).toHaveTextContent('WinDrawLoss');
        expect(screen.getByRole('button', {name: 'Reset chart zoom'})).toBeDisabled();
    });
    it('keeps all supplied seasons visible and uses the penalty-only legend', () => {
        render(<SearchDetailsChart games={[game, {...game, game_id: 2, season: 2025, date: '2025-08-10'}]} penalties={PenaltyOptions.ONLY_PENALTIES}/>);
        expect(screen.getByText('2 Games')).toBeVisible();
        expect(screen.getByText('2 Pens')).toBeVisible();
        expect(screen.queryByText(/\d+ Goals?/)).not.toBeInTheDocument();
    });
});
