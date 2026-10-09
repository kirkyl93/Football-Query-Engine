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
            'SEASONS', 'COMPETITIONS', 'CLUBS PLAYED FOR', 'CLUBS PLAYED AGAINST',
            'HOME OR AWAY', 'ONLY INCLUDE GAMES WHERE', 'EVENTS',
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
