import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchFilterBar from './SearchFilterBar';
import { createDefaultSearchFilterState } from '../lib/defaultSearchFilter';
import { SortOptions } from '../../../types/SearchOptions';

const renderFilterBar = (props?: Partial<React.ComponentProps<typeof SearchFilterBar>>) => render(
    <SearchFilterBar
        isOpen={true}
        filterState={createDefaultSearchFilterState()}
        onFilterChange={vi.fn()}
        onClose={vi.fn()}
        {...props}
    />,
);

afterEach(() => {
    vi.unstubAllGlobals();
});

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

    it('applies the default filters', async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        const onClose = vi.fn();
        renderFilterBar({onFilterChange, onClose});

        await user.click(screen.getByText('APPLY'));

        expect(onFilterChange).toHaveBeenCalledTimes(1);
        expect(onFilterChange.mock.calls[0][0].seasons).toEqual([2025]);
        expect(onFilterChange.mock.calls[0][0].competitions).toEqual(['GB1']);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('toggles a season off and restores it with reset', async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderFilterBar({onFilterChange});

        await user.click(screen.getByText('SEASONS'));
        await user.click(screen.getByText('2025/26'));
        await user.click(screen.getByText('Reset'));
        await user.click(screen.getByText('APPLY'));

        expect(onFilterChange).toHaveBeenCalledTimes(1);
        expect(onFilterChange.mock.calls[0][0].seasons).toEqual([2025]);
    });

    it('shows collapsed summaries for the default filters', () => {
        renderFilterBar();

        expect(screen.getByText('2025/26')).toBeInTheDocument();
        expect(screen.getByText('Premier League')).toBeInTheDocument();
        expect(screen.getByText('Goals · Overall')).toBeInTheDocument();
        expect(screen.getByText('Either')).toBeInTheDocument();
        expect(screen.getByText('Include penalties')).toBeInTheDocument();
    });

    it('shows an externally updated sort when reopened', async () => {
        const user = userEvent.setup();
        const defaultState = createDefaultSearchFilterState();
        const { rerender } = renderFilterBar({isOpen: false, filterState: defaultState});

        rerender(
            <SearchFilterBar
                isOpen={true}
                filterState={{...defaultState, sortBy: SortOptions.ASSISTS}}
                onFilterChange={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        await user.click(screen.getByText('SORT BY'));

        expect(screen.getByRole('radio', {name: 'Assists'})).toBeChecked();
        expect(screen.getByRole('radio', {name: 'Goals'})).not.toBeChecked();
    });

    it('blocks apply with an alert for an invalid age range', async () => {
        const user = userEvent.setup();
        const alertMock = vi.fn();
        vi.stubGlobal('alert', alertMock);
        const onFilterChange = vi.fn();
        renderFilterBar({onFilterChange});

        await user.click(screen.getByText('AGE'));
        const [minAge, maxAge] = screen.getAllByRole('combobox');
        fireEvent.change(minAge, {target: {value: '30'}});
        fireEvent.change(maxAge, {target: {value: '25'}});
        await user.click(screen.getByText('APPLY'));

        expect(alertMock).toHaveBeenCalledWith('Max age should be greater than or equal to Min age');
        expect(onFilterChange).not.toHaveBeenCalled();
    });
});
