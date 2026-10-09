import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchFilterBar from './SearchFilterBar';
import { createDefaultSearchFilterState } from '../lib/defaultSearchFilter';

const renderFilterBar = () => render(
    <SearchFilterBar
        isOpen={true}
        filterState={createDefaultSearchFilterState()}
        onFilterChange={vi.fn()}
        onClose={vi.fn()}
    />,
);

describe('SearchFilterBar', () => {
    it('renders the header, all section titles and the apply button', () => {
        renderFilterBar();

        expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
        for (const title of [
            'SEASONS', 'COMPETITIONS', 'POSITIONS', 'MINUTES', 'AGE', 'HEIGHT',
            'PLAYER NAMES', 'PLAYER COUNTRIES', 'CLUBS', 'SUBSTITUTES',
            'PENALTIES', 'HOME OR AWAY', 'SORT BY',
        ]) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
        expect(screen.getByText('APPLY')).toBeInTheDocument();
    });

    it('expands the seasons section on click', async () => {
        const user = userEvent.setup();
        renderFilterBar();

        await user.click(screen.getByText('SEASONS'));

        expect(screen.getByText('2025/26')).toBeInTheDocument();
    });

    it('expands the sort section and shows scope options', async () => {
        const user = userEvent.setup();
        renderFilterBar();

        await user.click(screen.getByText('SORT BY'));

        expect(screen.getByText('Overall')).toBeInTheDocument();
        expect(screen.getByText('Minutes played')).toBeInTheDocument();
    });
});
