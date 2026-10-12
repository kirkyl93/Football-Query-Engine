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

    it('moves highlight with ArrowDown/ArrowUp and clamps at the ends', async () => {
        const haaland: Player = {...player, player_id: 9, first_name: 'Erling', last_name: 'Haaland'};
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player, haaland]}));
        renderSearchBar();

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'Ha'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        // First result preselected on open.
        expect(screen.getByRole('option', {selected: true})).toHaveTextContent('Harry Kane');

        fireEvent.keyDown(input, {key: 'ArrowDown'});
        expect(screen.getByRole('option', {selected: true})).toHaveTextContent('Erling Haaland');

        // Clamps at the last option instead of wrapping.
        fireEvent.keyDown(input, {key: 'ArrowDown'});
        expect(screen.getByRole('option', {selected: true})).toHaveTextContent('Erling Haaland');

        fireEvent.keyDown(input, {key: 'ArrowUp'});
        expect(screen.getByRole('option', {selected: true})).toHaveTextContent('Harry Kane');

        // Clamps at the first option too.
        fireEvent.keyDown(input, {key: 'ArrowUp'});
        expect(screen.getByRole('option', {selected: true})).toHaveTextContent('Harry Kane');

        expect(input.getAttribute('aria-activedescendant')).toContain('option-7');
    });

    it('selects the highlighted suggestion with Enter', async () => {
        const haaland: Player = {...player, player_id: 9, first_name: 'Erling', last_name: 'Haaland'};
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player, haaland]}));
        const onSelectPlayerId = vi.fn();
        renderSearchBar({linkToPlayer: false, onSelectPlayerId});

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'Ha'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        fireEvent.keyDown(input, {key: 'ArrowDown'});
        fireEvent.keyDown(input, {key: 'Enter'});

        expect(onSelectPlayerId).toHaveBeenCalledWith(9, 'Haaland');
        expect((input as HTMLInputElement).value).toBe('');
    });

    it('does nothing on Enter with no suggestions', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => []}));
        const onSelectPlayerId = vi.fn();
        render(
            <MemoryRouter initialEntries={['/']}>
                <PlayerSearchBar
                    placeHolderText="Search for a player..."
                    linkToPlayer={false}
                    onSelectPlayerId={onSelectPlayerId}
                />
            </MemoryRouter>,
        );

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'K'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
        });
        fireEvent.keyDown(input, {key: 'Enter' });

        expect(onSelectPlayerId).not.toHaveBeenCalled();
        expect((input as HTMLInputElement).value).toBe('K');
    });

    it('swallows Enter instead of submitting the form (no reload, no "?")', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => [player]}));
        const onSelectPlayer = vi.fn();
        const LocationProbe = () => {
            const location = useLocation();
            return <div data-testid="loc">{location.pathname}{location.search}</div>;
        };
        render(
            <MemoryRouter initialEntries={['/']}>
                <PlayerSearchBar
                    placeHolderText="Search for a player..."
                    linkToPlayer={false}
                    onSelectPlayer={onSelectPlayer}
                />
                <LocationProbe />
            </MemoryRouter>,
        );

        const input = screen.getByPlaceholderText('Search for a player...');
        fireEvent.change(input, {target: {value: 'Kane'}});
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });

        // fireEvent.submit returns false only when default is prevented.
        const form = input.closest('form')!;
        expect(fireEvent.submit(form)).toBe(false);

        expect(screen.getByTestId('loc').textContent).toBe('/');
        expect((input as HTMLInputElement).value).toBe('Kane');
        expect(onSelectPlayer).not.toHaveBeenCalled();
    });
});
