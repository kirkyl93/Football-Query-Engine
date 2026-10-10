import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AppearancesChartFilterBar from './AppearancesChartFilterBar';
import { createDefaultPlayerFilterState } from '../hooks/useAppearancesFilter';
import { createDefaultMetadata } from '../lib/appearancesMetadata';
import React from "react";

const renderFilterBar = (props?: Partial<React.ComponentProps<typeof AppearancesChartFilterBar>>) => render(
    <AppearancesChartFilterBar
        isOpen={true}
        playerSeasonsCompetitionsAndClubs={createDefaultMetadata()}
        playerFilterState={createDefaultPlayerFilterState()}
        onFilterChange={vi.fn()}
        onClose={vi.fn()}
        {...props}
    />,
);

describe('AppearancesChartFilterBar', () => {
    it('renders all section titles and the apply button', () => {
        renderFilterBar();

        expect(screen.getByText('Filter')).toBeInTheDocument();
        for (const title of [
            'SEASONS', 'COMPETITIONS', 'CLUBS PLAYED FOR', 'OPPONENTS',
            'HOME OR AWAY', 'APPEARANCES', 'EVENTS',
        ]) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
        expect(screen.getByText('APPLY')).toBeInTheDocument();
    });

    it('expands the events section on click', async () => {
        const user = userEvent.setup();
        renderFilterBar();

        await user.click(screen.getByText('EVENTS'));

        expect(screen.getByText('Goals')).toBeInTheDocument();
        expect(screen.getByText('Clean sheets')).toBeInTheDocument();
    });

    it('applies after touching every section without crashing', async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderFilterBar({
            onFilterChange,
            playerSeasonsCompetitionsAndClubs: {
                seasons: [2024, 2025],
                leagueCompetitions: ['Premier League'],
                europeanCompetitions: ['Champions League'],
                clubsPlayedFor: [[1, 'Arsenal']],
                clubsPlayedAgainst: [[2, 'Chelsea']],
            },
            playerFilterState: {
                ...createDefaultPlayerFilterState(),
                selectedSeasons: [2025],
                selectedClubsPlayedAgainst: [2],
            },
        });

        await user.click(screen.getByText('SEASONS'));
        await user.click(screen.getByText('2025/26'));

        await user.click(screen.getByText('COMPETITIONS'));
        await user.click(screen.getByText('DOMESTIC'));
        await user.click(screen.getByText('Premier League'));

        await user.click(screen.getByText('CLUBS PLAYED FOR'));
        await user.click(screen.getByText('Arsenal'));

        await user.click(screen.getByText('HOME OR AWAY'));
        await user.click(screen.getByText('Home'));

        await user.click(screen.getByText('APPEARANCES'));
        await user.click(screen.getByText('Started'));

        await user.click(screen.getByText('EVENTS'));
        await user.click(screen.getByText('Goals'));

        await user.click(screen.getByText('APPLY'));

        expect(onFilterChange).toHaveBeenCalledTimes(1);
        const applied = onFilterChange.mock.calls[0][0];
        expect(applied.selectedSeasons).toEqual([]);
        expect(applied.selectedCompetitions).toEqual(['Premier League']);
        expect(applied.selectedClubsPlayedFor).toEqual([1]);
        expect(applied.selectedHomeOrAway).toBe('h');
        expect(applied.selectedAppearanceType).toBe('st');
        expect(applied.selectedEvents.Goals).toBe(true);
    });

    it('applies the current filters and closes', async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        const onClose = vi.fn();
        renderFilterBar({onFilterChange, onClose});

        await user.click(screen.getByText('APPLY'));

        expect(onFilterChange).toHaveBeenCalledTimes(1);
        expect(onFilterChange.mock.calls[0][0].selectedSeasons).toEqual([]);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
