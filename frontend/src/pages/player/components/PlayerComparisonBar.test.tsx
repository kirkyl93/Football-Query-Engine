import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import PlayerComparisonBar from './PlayerComparisonBar';

const player = {
    player_id: 7,
    first_name: 'Harry',
    last_name: 'Kane',
    current_club_id: 1,
    country_of_birth: 'England',
    country_of_citizenship: 'England',
    country_code: 'gb-eng',
    date_of_birth: '1993-07-28',
    age: 32,
    sub_position: 'CF',
    foot: 'right',
    height_in_cm: 188,
    image_url: 'http://example.com/kane.png',
};

const renderBar = (props?: Partial<React.ComponentProps<typeof PlayerComparisonBar>>) =>
    render(
        <MemoryRouter>
            <PlayerComparisonBar
                comparisonPlayerName=""
                comparisonPlayer={null}
                comparisonLoading={false}
                comparisonError={null}
                onSelectPlayerId={vi.fn()}
                {...props}
            />
        </MemoryRouter>,
    );

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('PlayerComparisonBar', () => {
    it('labels the search control when nothing is selected', () => {
        renderBar();

        expect(screen.getByText('Compare against')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search for a player...')).toBeInTheDocument();
    });

    it('renders the selected player info mirrored without its own clear button', () => {
        const {container} = renderBar({comparisonPlayerName: 'Kane', comparisonPlayer: player});

        // Photos removed: no player picture, info only.
        expect(screen.queryByAltText('Harry Kane')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', {name: 'Harry Kane'})).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Search for a player...')).not.toBeInTheDocument();
        // Mirrored layout: header carries the mirror class (right-aligned
        // details, no photo).
        expect(container.querySelector('[class*="player-header-mirror"]')).toBeInTheDocument();
        // Clearing lives on the bio-row button, not in the mirror block.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('disables search and shows progress while loading', () => {
        renderBar({comparisonLoading: true});

        expect(screen.getByPlaceholderText('Search for a player...')).toBeDisabled();
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('announces comparison errors', () => {
        renderBar({comparisonError: 'Failed to load comparison player data'});

        expect(screen.getByRole('alert')).toHaveTextContent('Failed to load comparison player data');
    });

    it('selects a player by id without fetching games itself', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player]}));
        const onSelectPlayerId = vi.fn();
        renderBar({onSelectPlayerId});

        fireEvent.change(screen.getByPlaceholderText('Search for a player...'), {
            target: {value: 'Kane'},
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        fireEvent.click(screen.getByText('Harry Kane'));

        expect(onSelectPlayerId).toHaveBeenCalledWith(7, 'Kane');
        // Suggestions fetch only; the games fetch belongs to the hook.
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
