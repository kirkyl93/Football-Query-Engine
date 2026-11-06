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
            const selects = ['Minimum Goals:', 'Maximum Goals:', 'Minimum Assists:', 'Maximum Assists:', 'Minimum Goals and Assists:', 'Maximum Goals and Assists:'].map(label => screen.getByLabelText(label));
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

        expect(screen.getByRole('button', {name: 'Assists'})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: 'Goals'})).toHaveAttribute('aria-pressed', 'false');
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

it('offers card bounds for season and game counts and preserves zero', async () => {
    const user = userEvent.setup(); const onFilterChange=vi.fn();
    const {unmount}=renderFilterBar({filterState:{...createDefaultSearchFilterState(),sortBy:SortOptions.NUMBER_OF_SEASONS_WITH},onFilterChange});
    await user.click(screen.getByText('SORT BY'));
    await user.selectOptions(screen.getByLabelText('Minimum Yellow Cards:'),'10');
    await user.selectOptions(screen.getByLabelText('Maximum Red Cards:'),'0');
    await user.click(screen.getByText('APPLY'));
    expect(onFilterChange.mock.calls[0][0]).toMatchObject({minimumYellowCards:10,maximumRedCards:0});
    await user.selectOptions(screen.getByLabelText('Minimum Yellow Cards:'),'');
    await user.selectOptions(screen.getByLabelText('Maximum Red Cards:'),'');
    await user.click(screen.getByText('APPLY'));
    expect(onFilterChange.mock.calls[1][0].minimumYellowCards).toBeUndefined();
    expect(onFilterChange.mock.calls[1][0].maximumRedCards).toBeUndefined();
    unmount();
    renderFilterBar({filterState:{...createDefaultSearchFilterState(),sortBy:SortOptions.NUMBER_OF_GAMES_WITH}});
    await user.click(screen.getByText('SORT BY'));
    expect(screen.getByLabelText('Minimum Yellow Cards:')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Red Cards:')).toBeInTheDocument();
});


it('applies ranking direction and appearance bounds alongside a zero total goal bound', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilterBar({onFilterChange});
    await user.click(screen.getByText('SORT BY'));
    await user.click(screen.getByRole('button', {name: 'Goals'}));
    await user.selectOptions(screen.getByLabelText('Minimum Appearances:'), '2');
    await user.selectOptions(screen.getByLabelText('Maximum Appearances:'), '5');
    await user.selectOptions(screen.getByLabelText('Maximum Goals:'), '0');
    await user.click(screen.getByText('APPLY'));
    const applied = onFilterChange.mock.calls[0][0];
    expect(applied).toMatchObject({sortBy: SortOptions.GOALS, sortDirection: 'asc', minimumAppearances: 2, maximumAppearances: 5, maximumGoals: 0});
    const params = filterStateToSearchParams(applied);
    expect(['direction', 'ma', 'maxap', 'maxg'].map(key => params.get(key))).toEqual(['asc', '2', '5', '0']);
});

it('flips the selected ranking and resets to the next statistic default', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilterBar({onFilterChange});
    await user.click(screen.getByText('SORT BY'));
    const goals = screen.getByRole('button', {name: 'Goals'});
    expect(goals).toHaveTextContent('▼');
    await user.click(goals);
    expect(goals).toHaveTextContent('▲');
    await user.click(screen.getByRole('button', {name: 'Assists'}));
    expect(screen.getByRole('button', {name: 'Assists'})).toHaveTextContent('▼');
    await user.click(screen.getByRole('button', {name: 'Minutes per goal'}));
    expect(screen.getByRole('button', {name: 'Minutes per goal'})).toHaveTextContent('▲');
    expect(screen.queryByLabelText('Ranking order:')).not.toBeInTheDocument();
    await user.click(screen.getByText('APPLY'));
    expect(onFilterChange.mock.calls[0][0]).toMatchObject({sortBy: SortOptions.MINUTES_PER_GOAL, sortDirection: undefined});
});

it('removes appearance bounds from game counts and names season appearance bounds explicitly', async () => {
    const user = userEvent.setup();
    renderFilterBar();
    await user.click(screen.getByText('SORT BY'));
    await user.click(screen.getByRole('button', {name: 'Number of games with'}));
    expect(screen.queryByLabelText(/Minimum Appearances/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Appearance limits apply/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Yellow Cards:')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Number of seasons with'}));
    expect(screen.getByLabelText('Minimum Appearances:')).toHaveProperty('tagName', 'SELECT');
    expect(screen.getByLabelText('Maximum Appearances:')).toHaveProperty('tagName', 'SELECT');
    await user.click(screen.getByRole('radio', {name: 'Season'}));
    expect(screen.getByRole('button', {name: 'Goals'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Minimum Appearances:')).toBeInTheDocument();
});

it('offers only most-first goal and assist rankings for individual games', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilterBar({onFilterChange});
    await user.click(screen.getByText('SORT BY'));
    await user.click(screen.getByRole('button', {name: 'Goals'}));
    await user.click(screen.getByRole('radio', {name: 'Game'}));
    const group = screen.getByRole('group', {name: 'Ranking statistic'});
    expect(within(group).getAllByRole('button').map(button => button.textContent?.replace('▼', ''))).toEqual(['Most goals', 'Most assists', 'Most goals and assists']);
    const goals = within(group).getByRole('button', {name: 'Most goals'});
    await user.click(goals);
    expect(goals).toHaveTextContent('▼');
    expect(screen.queryByRole('region', {name: 'Qualification filters'})).not.toBeInTheDocument();
    await user.click(screen.getByText('APPLY'));
    expect(onFilterChange.mock.calls[0][0]).toMatchObject({statScope: 'g', sortBy: SortOptions.GOALS, sortDirection: 'desc'});
});

it('keeps game qualification per game when counting qualifying games per season', async () => {
    const user = userEvent.setup();
    renderFilterBar({filterState: {...createDefaultSearchFilterState(), sortBy: SortOptions.NUMBER_OF_GAMES_WITH, statScope: 's' as import('../../../types/SearchOptions').StatScope}});
    await user.click(screen.getByText('SORT BY'));
    expect(screen.getByRole('heading', {name: 'Qualification filters (per game)'})).toBeInTheDocument();
    expect(screen.queryByLabelText(/^(Minimum|Maximum) Appearances/)).not.toBeInTheDocument();
});
