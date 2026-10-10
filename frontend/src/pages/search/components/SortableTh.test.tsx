import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortableTh } from './SortableTh';
import { SortOptions } from '../../../types/SearchOptions';

const renderTh = (activeSort: SortOptions, onSort = vi.fn(), columnSort = SortOptions.GOALS) => {
    render(
        <table>
            <thead>
                <tr>
                    <SortableTh
                        label="Goals"
                        columnSort={columnSort}
                        activeSort={activeSort}
                        onSort={onSort}
                    />
                </tr>
            </thead>
        </table>,
    );
    return onSort;
};

describe('SortableTh', () => {
    it('shows a down arrow on the active sort column', () => {
        renderTh(SortOptions.GOALS);
        expect(screen.getByRole('button', { name: /sorted by goals/i })).toHaveTextContent('▼');
    });

    it('shows an up arrow for ascending sorts', () => {
        renderTh(SortOptions.MINUTES_PER_GOAL, vi.fn(), SortOptions.MINUTES_PER_GOAL);
        expect(screen.getByRole('button')).toHaveTextContent('▲');
    });

    it('shows no arrow on inactive columns', () => {
        renderTh(SortOptions.ASSISTS);
        expect(screen.getByRole('button', { name: /sort by goals/i })).not.toHaveTextContent('▼');
    });

    it('keeps the arrow on Goals when Goals+Assists is active', () => {
        renderTh(SortOptions.GOALS_AND_ASSISTS);
        expect(screen.getByRole('button', { name: /goals and assists/i })).toHaveTextContent('▼');
    });

    it('navigates to the column sort on click', async () => {
        const onSort = renderTh(SortOptions.ASSISTS);
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).toHaveBeenCalledWith(SortOptions.GOALS);
    });

    it('toggles Goals to Goals+Assists on second click', async () => {
        const onSort = renderTh(SortOptions.GOALS);
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).toHaveBeenCalledWith(SortOptions.GOALS_AND_ASSISTS);
    });

    it('does not refetch when clicking the already-active sort', async () => {
        const onSort = renderTh(SortOptions.ASSISTS, vi.fn(), SortOptions.ASSISTS);
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).not.toHaveBeenCalled();
    });
});
