import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchFilterBar from './SearchFilterBar';
import { createDefaultSearchFilterState } from '../lib/defaultSearchFilter';
import { SortOptions } from '../../../types/SearchOptions';
import { filterStateToSearchParams } from '../lib/searchParamsSerializer';
import { UrlFilters } from '../../../types/UrlFilters';

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
    it.each([SortOptions.NUMBER_OF_GAMES_WITH, SortOptions.NUMBER_OF_SEASONS_WITH])(
        'applies zero maximums and can clear them back to Any for %s', async sortBy => {
            const user = userEvent.setup();
            const onFilterChange = vi.fn();
            renderFilterBar({
                filterState: {...createDefaultSearchFilterState(), sortBy},
                onFilterChange,
            });
            await user.click(screen.getByText('SORT BY'));
            const selects = screen.getAllByRole('combobox');
            for (const select of [selects[0], selects[2], selects[4]]) {
                expect(within(select).queryByRole('option', {name: '0'})).not.toBeInTheDocument();
                expect(within(select).getByRole('option', {name: '1'})).toBeInTheDocument();
            }
            const maximums = [selects[1], selects[3], selects[5]];
            for (const select of maximums) {
                await user.selectOptions(select, '0');
                expect(select).toHaveValue('0');
            }
            await user.click(screen.getByText('APPLY'));
            const applied = onFilterChange.mock.calls[0][0];
            expect(applied).toMatchObject({
                maximumGoals: 0, maximumAssists: 0, maximumGoalsAndAssists: 0,
            });
            const params = filterStateToSearchParams(applied);
            for (const key of [UrlFilters.MAXIMUM_GOALS, UrlFilters.MAXIMUM_ASSISTS, UrlFilters.MAXIMUM_GOALS_AND_ASSISTS]) {
                expect(params.get(key)).toBe('0');
            }
            for (const select of maximums) {
                await user.selectOptions(select, '');
            }
            await user.click(screen.getByText('APPLY'));
            const cleared = onFilterChange.mock.calls[1][0];
            expect(cleared.maximumGoals).toBeUndefined();
            expect(cleared.maximumAssists).toBeUndefined();
            expect(cleared.maximumGoalsAndAssists).toBeUndefined();
            const clearedParams = filterStateToSearchParams(cleared);
            for (const key of [UrlFilters.MAXIMUM_GOALS, UrlFilters.MAXIMUM_ASSISTS, UrlFilters.MAXIMUM_GOALS_AND_ASSISTS]) {
                expect(clearedParams.has(key)).toBe(false);
            }
        },
    );

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
        expect(screen.getByText(/Age on the match date, not current age/)).toBeInTheDocument();
        const [minAge, maxAge] = screen.getAllByRole('combobox');
        fireEvent.change(minAge, {target: {value: '30'}});
        fireEvent.change(maxAge, {target: {value: '25'}});
        await user.click(screen.getByText('APPLY'));

        expect(alertMock).toHaveBeenCalledWith('Max age should be greater than or equal to Min age');
        expect(onFilterChange).not.toHaveBeenCalled();
    });
});
