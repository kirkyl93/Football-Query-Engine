import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlayerSearchBar from './PlayerSearchBar';
import type { Player } from '../types/Player';
import React from "react";

const player: Player = {
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

const renderSearchBar = (props?: Partial<React.ComponentProps<typeof PlayerSearchBar>>) =>
    render(
        <MemoryRouter>
            <PlayerSearchBar placeHolderText="Search for a player..." linkToPlayer={true} {...props} />
        </MemoryRouter>,
    );

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('PlayerSearchBar', () => {
    it('renders the input and fetches nothing for short queries', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue({json: async () => []});
        vi.stubGlobal('fetch', fetchMock);
        renderSearchBar();

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'K'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows suggestions with player links after debounce', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player]}));
        renderSearchBar();

        fireEvent.change(screen.getByPlaceholderText('Search for a player...'), {
            target: {value: 'Kane'},
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        expect(screen.getByText('Harry Kane')).toBeInTheDocument();
        expect(screen.getByText('Harry Kane').closest('li')).toBeInTheDocument();
    });

    it('calls onSelectPlayer with game data when not linking', async () => {
        vi.useFakeTimers();
        const games = [{game_number: 1}];
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({json: async () => [player]})
            .mockResolvedValueOnce({json: async () => games});
        vi.stubGlobal('fetch', fetchMock);
        const onSelectPlayer = vi.fn();
        renderSearchBar({linkToPlayer: false, onSelectPlayer});

        fireEvent.change(screen.getByPlaceholderText('Search for a player...'), {
            target: {value: 'Kane'},
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        fireEvent.click(screen.getByText('Harry Kane'));

        await act(async () => {});
        expect(onSelectPlayer).toHaveBeenCalledWith('Kane', games);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('navigates to the player page when clicking a suggestion', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player]}));
        const onDismiss = vi.fn();
        const LocationProbe = () => {
            const location = useLocation();
            return <div data-testid="loc">{location.pathname}</div>;
        };
        render(
            <MemoryRouter initialEntries={['/']}>
                <PlayerSearchBar
                    placeHolderText="Search for a player..."
                    linkToPlayer={true}
                    onDismiss={onDismiss}
                />
                <LocationProbe />
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByPlaceholderText('Search for a player...'), {
            target: {value: 'Kane'},
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        // Clicking anywhere on the row (not just the name) navigates.
        fireEvent.click(screen.getByText('Harry Kane').closest('li')!);

        expect(onDismiss).toHaveBeenCalled();
        expect(screen.getByTestId('loc').textContent).toBe('/player/7');
    });

    it('clears the dropdown on Escape', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player]}));
        renderSearchBar();

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'Kane'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        expect(screen.getByText('Harry Kane')).toBeInTheDocument();

        fireEvent.keyDown(document, {key: 'Escape'});

        expect(screen.queryByText('Harry Kane')).not.toBeInTheDocument();
        expect((input as HTMLInputElement).value).toBe('');
    });
});
