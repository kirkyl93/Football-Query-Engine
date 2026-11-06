import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import Search from './Search';

vi.mock('./components/SearchFilterBar', () => ({default: () => null}));
vi.mock('./hooks/useInfiniteScroll', () => ({useInfiniteScroll: () => ({data: [row], hasData: true, hasMore: false, loading: false, error: null, lastElementRef: vi.fn(), retry: vi.fn()})}));

const row = {
    player_id: 1, rank: 1, player_name: 'Example Player', country_code: 'gb-eng', image_url: '', sub_position: 'CF', season: 2025,
    clubs_played_for: '', total_appearances: 60, substitute_appearances: 0, total_minutes_played: 900,
    total_goals: 2, total_assists: 1, total_yellow_cards: 0, total_red_cards: 0,
    mins_per_goal: 450, mins_per_assist: 900, mins_per_goal_or_assist: 300, mins_per_yellow: null, mins_per_red: null,
    number_of_games: 10, number_of_seasons: 1, qualifying_game_ids: [], qualifying_seasons: [2025],
    club_id: 101, competition_name: 'Premier League', competition_country_code: 'gb-eng', competition_id: 'GB1',
    date: '2025-08-17', home_club_name: 'Home', away_club_name: 'Away', home_club_goals: 2, away_club_goals: 0,
    home_club_id: 101, away_club_id: 102, goals: 2, assists: 1, minutes_played: 90,
};

const Query = () => <output aria-label="Search query">{useLocation().search}</output>;
const params = () => new URLSearchParams(screen.getByLabelText('Search query').textContent ?? '');
const renderSearch = (query: string) => render(<MemoryRouter initialEntries={['/?comps=GB1&seasons=2025&' + query]}><Search/><Query/></MemoryRouter>);

describe('table sorting through the results-page URL', () => {
    it('flips an active metric in both directions and preserves qualification filters', async () => {
        const user = userEvent.setup();
        renderSearch('scope=o&sort=g&ma=50&maxap=100&maxr=0');
        await user.click(screen.getByRole('button', {name: /^Sorted by goals,/}));
        expect(params().get('sort')).toBe('g');
        expect(params().get('direction')).toBe('asc');
        expect(screen.getByRole('button', {name: /^Sorted by goals,/}).closest('th')).toHaveAttribute('aria-sort', 'ascending');
        expect(['ma', 'maxap', 'maxr'].map(key => params().get(key))).toEqual(['50', '100', '0']);
        await user.click(screen.getByRole('button', {name: /^Sorted by goals,/}));
        expect(params().get('direction')).toBe('desc');
        expect(screen.getByRole('button', {name: /^Sorted by goals,/})).toHaveTextContent('▼');
    });

    it('uses the new statistic default rather than retaining a reversed direction', async () => {
        const user = userEvent.setup();
        renderSearch('scope=s&sort=g&direction=asc');
        await user.click(screen.getByRole('button', {name: 'Sort by assists'}));
        expect(params().get('sort')).toBe('a');
        expect(params().has('direction')).toBe(false);
        expect(screen.getByRole('button', {name: /^Sorted by assists,/})).toHaveTextContent('▼');
    });

    it('reverses minutes-per-event rankings using their existing default', async () => {
        const user = userEvent.setup();
        renderSearch('scope=o&sort=mpg');
        await user.click(screen.getByRole('button', {name: /^Sorted by mins per goal,/}));
        expect(params().get('sort')).toBe('mpg');
        expect(params().get('direction')).toBe('desc');
        expect(screen.getByRole('button', {name: /^Sorted by mins per goal,/})).toHaveTextContent('▼');
    });

    it('offers combined goals and assists directly and keeps repeated clicks on that metric', async () => {
        const user = userEvent.setup();
        renderSearch('scope=o&sort=g');
        await user.click(screen.getByRole('button', {name: 'Sort by goals + assists'}));
        expect(params().get('sort')).toBe('ga');
        expect(screen.getByRole('button', {name: /^Sorted by goals \+ assists,/})).toHaveTextContent('▼');
        await user.click(screen.getByRole('button', {name: /^Sorted by goals \+ assists,/}));
        expect(params().get('sort')).toBe('ga');
        expect(params().get('direction')).toBe('asc');
    });

    it.each([['gw', 'Number of games'], ['sw', 'Number of seasons']])('reverses the %s count header', async (sort, label) => {
        const user = userEvent.setup();
        renderSearch('scope=o&sort=' + sort + '&miny=1');
        await user.click(screen.getByRole('button', {name: new RegExp('^Sorted by ' + label.toLowerCase() + ',')}));
        expect(params().get('sort')).toBe(sort);
        expect(params().get('direction')).toBe('asc');
        expect(params().get('miny')).toBe('1');
    });

    it('allows selecting each individual-game metric while keeping most-first ordering', async () => {
        const user = userEvent.setup();
        renderSearch('scope=g&sort=g&direction=desc');
        await user.click(screen.getByRole('button', {name: /^Sorted by goals,/}));
        expect(params().get('sort')).toBe('g');
        expect(params().get('direction')).toBe('desc');
        await user.click(screen.getByRole('button', {name: 'Sort by goals + assists'}));
        expect(params().get('sort')).toBe('ga');
        expect(params().get('direction')).toBe('desc');
        await user.click(screen.getByRole('button', {name: /^Sorted by goals \+ assists,/}));
        expect(params().get('direction')).toBe('desc');
        await user.click(screen.getByRole('button', {name: 'Sort by assists'}));
        expect(params().get('sort')).toBe('a');
        expect(params().get('direction')).toBe('desc');
    });
});
