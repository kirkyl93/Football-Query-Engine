import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {SortableTh} from './SortableTh';
import {SortOptions} from '../../../types/SearchOptions';

const renderTh = (props: Partial<React.ComponentProps<typeof SortableTh>> = {}) => {
    const onSort = vi.fn();
    render(<table><thead><tr><SortableTh label="Goals" columnSort={SortOptions.GOALS} activeSort={SortOptions.GOALS} onSort={onSort} {...props}/></tr></thead></table>);
    return onSort;
};

describe('SortableTh', () => {
    it('shows the active direction and describes the next click', () => {
        renderTh();
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
        expect(screen.getByRole('button')).toHaveTextContent('▼');
        expect(screen.getByRole('button')).toHaveAccessibleName(/click to show fewest first/i);
    });

    it('uses ascending by default for minutes-per-event headers', () => {
        renderTh({label: 'Mins per goal', columnSort: SortOptions.MINUTES_PER_GOAL, activeSort: SortOptions.MINUTES_PER_GOAL});
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
        expect(screen.getByRole('button')).toHaveTextContent('▲');
    });

    it('allows an active statistic to be selected again without changing the metric', async () => {
        const onSort = renderTh();
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).toHaveBeenCalledWith(SortOptions.GOALS);
    });

    it('selects another statistic without displaying an active arrow on it', async () => {
        const onSort = renderTh({activeSort: SortOptions.ASSISTS});
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none');
        expect(screen.getByRole('button')).not.toHaveTextContent('▼');
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).toHaveBeenCalledWith(SortOptions.GOALS);
    });

    it('keeps combined goals and assists separate from the goals column', () => {
        renderTh({activeSort: SortOptions.GOALS_AND_ASSISTS});
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none');
        expect(screen.getByRole('button')).not.toHaveTextContent('▼');
    });

    it('uses an explicit direction for its arrow and accessible sort state', () => {
        renderTh({direction: 'asc'});
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
        expect(screen.getByRole('button')).toHaveTextContent('▲');
    });

    it('keeps the active individual-game header most-first and avoids a redundant request', async () => {
        const onSort = renderTh({allowReverse: false, direction: 'asc'});
        expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
        await userEvent.click(screen.getByRole('button'));
        expect(onSort).not.toHaveBeenCalled();
    });
});
