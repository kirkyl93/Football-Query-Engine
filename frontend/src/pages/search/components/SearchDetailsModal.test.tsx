import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {useState} from 'react';
import {SearchDetailsModal} from './SearchDetailsModal';
import {SearchOverallTable} from './SearchOverallTable';
import {createDefaultSearchFilterState} from '../lib/defaultSearchFilter';
import {clearSearchDetailsCache} from '../hooks/useSearchDetails';
import {DetailGame, fetchSearchDetails} from '../lib/searchDetails';
import {PlayerSearchResult} from '../../../types/Player';
import {HomeOrAwayOptions, SortOptions} from '../../../types/SearchOptions';

vi.mock('../lib/searchDetails', async importOriginal => ({...await importOriginal<typeof import('../lib/searchDetails')>(), fetchSearchDetails: vi.fn()}));
vi.mock('../hooks/useInfiniteScroll', () => ({useInfiniteScroll: () => ({data: [result], hasData: true, hasMore: false, loading: false, error: null, lastElementRef: vi.fn(), retry: vi.fn()})}));
vi.mock('./PlayerCell', () => ({PlayerCell: ({playerName}: {playerName: string}) => <span>{playerName}</span>}));
vi.mock('./ClubBadgesCell', () => ({ClubBadgesCell: () => <td>Club</td>}));
vi.mock('./SearchDetailsChart', () => ({SearchDetailsChart: ({games}: {games: DetailGame[]}) => <div data-testid="detail-chart">{games.map(game => game.game_id).join(',')}</div>}));
const result: PlayerSearchResult = {
    rank: 1, player_id: 1, player_name: 'Alex', country_code: 'gb-eng', sub_position: 'CF', image_url: '',
    total_appearances: 2, substitute_appearances: 0, total_goals: 1, total_assists: 0,
    total_yellow_cards: 0, total_red_cards: 0, total_minutes_played: 180, clubs_played_for: '101',
    mins_per_goal: 180, mins_per_assist: 0, mins_per_goal_or_assist: 180, mins_per_yellow: 0, mins_per_red: 0,
    season: 0, qualifying_game_ids: [1, 2],
};
const game = (id: number, season: number, qualifies: boolean): DetailGame => ({
    game_id: id, game_number: id, club_id: 101, home_club_id: 101, home_club_name: `Home ${id}`,
    away_club_id: 102, away_club_name: 'Away', competition_id: 'GB1', competition_name: 'Premier League',
    competition_type: 'domestic_league', date: `${season}-08-10`, season, goals: id === 1 ? 1 : 0,
    penalty_goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, played_from_minute: 0, subbed_off_minute: 90,
    home_club_goals: 1, away_club_goals: 0, goal_minutes: id === 1 ? [10] : [], penalty_goal_minutes: [],
    own_goal_minutes: [], assist_minutes: [], yellow_minutes: [], red_minutes: [], minutes_played: [0, 90], result: 'Win',
    qualifies, matches_filters: qualifies,
    stats: {appearances: 1, minutes: 90, goals: id === 1 ? 1 : 0, assists: 0, yellows: 0, reds: 0},
});
const filterState = {...createDefaultSearchFilterState(), seasons: [], homeOrAway: HomeOrAwayOptions.AWAY};
const games = [game(1, 2024, true), game(2, 2025, true), game(3, 2025, false)];
const props = {result, filterState, search: '?comps=GB1&home=a', onClose: vi.fn()};

beforeEach(() => { vi.clearAllMocks(); clearSearchDetailsCache(); vi.mocked(fetchSearchDetails).mockResolvedValue(games); });
describe('search result details', () => {
    it('fetches only on opening, includes scoreless contributing games, and caches reopening', async () => {
        function Harness() {
            const [open, setOpen] = useState(false);
            return <><SearchOverallTable filterState={filterState} onSortChange={vi.fn()} onViewDetails={() => setOpen(true)}/>
                {open && <SearchDetailsModal {...props} onClose={() => setOpen(false)}/>}</>;
        }
        render(<Harness/>);
        expect(fetchSearchDetails).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', {name: 'View games for Alex'}));
        expect(await screen.findByText('Home 1 1–0 Away')).toBeVisible();
        expect(screen.getByText('Home 2 1–0 Away')).toBeVisible();
        expect(screen.queryByText('Home 3 1–0 Away')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Original search result')).toHaveTextContent('180 mins');
        fireEvent.click(screen.getByRole('button', {name: 'Close Alex · Games'}));
        fireEvent.click(screen.getByRole('button', {name: 'View games for Alex'}));
        await screen.findByText('Home 1 1–0 Away');
        expect(fetchSearchDetails).toHaveBeenCalledTimes(1);
    });

    it('switches qualifying/all and table/chart locally and retains both seasons', async () => {
        render(<SearchDetailsModal {...props}/>);
        await screen.findByText('Home 1 1–0 Away');
        fireEvent.click(screen.getByRole('button', {name: 'Chart'}));
        expect(screen.getByTestId('detail-chart')).toHaveTextContent('1,2');
        fireEvent.click(screen.getByRole('checkbox', {name: 'Qualifying only'}));
        expect(screen.getByTestId('detail-chart')).toHaveTextContent('1,2,3');
        fireEvent.click(screen.getByRole('button', {name: 'Table'}));
        const other = screen.getByText('Home 3 1–0 Away').closest('tr')!;
        expect(within(other).getByText('Other game')).toBeInTheDocument();
        expect(fetchSearchDetails).toHaveBeenCalledTimes(1);
    });

    it('shows filtered season statistics and reveals nonqualifying seasons', async () => {
        const seasonResult = {...result, number_of_seasons: 1, number_of_games: 0, qualifying_game_ids: [], qualifying_seasons: [2024]};
        // matches_filters is independent of whether the season passes its threshold.
        vi.mocked(fetchSearchDetails).mockResolvedValue(games.map(game => ({...game, matches_filters: true, qualifies: game.season === 2024})));
        render(<SearchDetailsModal {...props} result={seasonResult} filterState={{...filterState, sortBy: SortOptions.NUMBER_OF_SEASONS_WITH}}/>);
        expect(await screen.findByText('2024/25')).toBeVisible();
        expect(screen.queryByText('2025/26')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Chart'})).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Qualifying only'}));
        const row = screen.getByText('2025/26').closest('tr')!;
        expect(within(row).getByText('180')).toBeVisible();
        expect(within(row).getByText('Other season')).toBeInTheDocument();
    });

    it('offers retry after failure and aborts the request on close', async () => {
        vi.mocked(fetchSearchDetails).mockRejectedValueOnce(new Error('Failed'));
        const {unmount} = render(<SearchDetailsModal {...props}/>);
        expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load details');
        fireEvent.click(screen.getByRole('button', {name: 'Retry details'}));
        await screen.findByText('Home 1 1–0 Away');
        const signal = vi.mocked(fetchSearchDetails).mock.calls[1][2];
        unmount(); expect(signal.aborted).toBe(true);
    });

    it('paginates tables without truncating the chart dataset', async () => {
        const many = Array.from({length: 55}, (_, i) => game(i + 1, 2025, true));
        vi.mocked(fetchSearchDetails).mockResolvedValue(many);
        render(<SearchDetailsModal {...props}/>);
        await screen.findByText('Home 1 1–0 Away');
        expect(screen.queryByText('Home 55 1–0 Away')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Next'}));
        expect(screen.getByText('Home 55 1–0 Away')).toBeVisible();
        fireEvent.click(screen.getByRole('button', {name: 'Chart'}));
        expect(screen.getByTestId('detail-chart').textContent?.split(',')).toHaveLength(55);
    });
    it('hides qualification controls for player-only filters but keeps them for age', async () => {
        const playerFilters = {...filterState, homeOrAway: HomeOrAwayOptions.EITHER,
            minHeight: 180, playerCountries: [{code: 'gb-eng', name: 'England'}]};
        const {rerender} = render(<SearchDetailsModal {...props} filterState={playerFilters}/>);
        await screen.findByText('Home 1 1–0 Away');
        expect(screen.queryByRole('checkbox', {name: 'Qualifying only'})).not.toBeInTheDocument();
        rerender(<SearchDetailsModal {...props} filterState={{...playerFilters, maxAge: 21}}/>);
        expect(screen.getByRole('checkbox', {name: 'Qualifying only'})).toBeChecked();
        fireEvent.click(screen.getByRole('checkbox', {name: 'Qualifying only'}));
        expect(screen.getByText('Home 3 1–0 Away')).toBeVisible();
        rerender(<SearchDetailsModal {...props} filterState={playerFilters}/>);
        expect(screen.queryByRole('checkbox', {name: 'Qualifying only'})).not.toBeInTheDocument();
        expect(screen.queryByText('Home 3 1–0 Away')).not.toBeInTheDocument();
        expect(screen.queryByText('3 total games')).not.toBeInTheDocument();
    });

});
