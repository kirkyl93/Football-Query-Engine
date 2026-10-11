import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonBarChart from './ComparisonBarChart';
import ComparisonPieChart from './ComparisonPieChart';
import { winDrawLossSlices } from '../../lib/pieChartData';

describe('compact tiles hide details until expanded', () => {
    it('hides the bar legend in compact tiles', () => {
        const props = {
            title: 'Per 90',
            playerName: 'Kane',
            comparisonPlayerName: 'Haaland',
            data: [{name: 'goals', player1: '0.90', player2: '0.80'}],
            renderTooltipContent: () => null,
        };
        const {unmount} = render(<ComparisonBarChart {...props} height={170} />);
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
        unmount();

        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.getByText('Kane')).toBeInTheDocument();
    });

    it('keeps only the title in minimal previews', () => {
        const props = {
            title: 'Per 90',
            playerName: 'Kane',
            comparisonPlayerName: 'Haaland',
            data: [{name: 'goals', player1: '0.90', player2: '0.80'}],
            renderTooltipContent: () => null,
        };
        const {unmount} = render(<ComparisonBarChart {...props} height={130} />);
        // Title stays; the legend (an HTML element, unlike SVG ticks) is gone.
        expect(screen.getByText('Per 90')).toBeInTheDocument();
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
        unmount();

        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.getByText('Kane')).toBeInTheDocument();
    });

    it('hides pie slice legends in compact tiles', () => {
        const props = {
            title: 'Win percentage',
            playerName: 'Kane',
            playerSlices: winDrawLossSlices(10, 5, 3),
            comparisonPlayerName: '',
            comparisonSlices: winDrawLossSlices(0, 0, 0),
        };
        const {unmount} = render(<ComparisonPieChart {...props} height={150} />);
        expect(screen.queryByText('Win', {exact: true})).not.toBeInTheDocument();
        unmount();

        render(<ComparisonPieChart {...props} height={340} />);
        expect(screen.getByText('Win', {exact: true})).toBeInTheDocument();
    });
});
