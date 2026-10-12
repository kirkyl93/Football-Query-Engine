import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonBarChart from './ComparisonBarChart';
import ComparisonPieChart from './ComparisonPieChart';
import StreakTooltipContent from './StreakTooltipContent';
import { winDrawLossSlices } from '../../lib/pieChartData';

describe('compact tiles hide details until expanded', () => {
    it('always shows the legend when two players compare', () => {
        const props = {
            title: 'Per 90',
            playerName: 'Kane',
            comparisonPlayerName: 'Haaland',
            data: [{name: 'goals', player1: 0.9, player2: 0.8}],
            renderTooltipContent: () => null,
        };
        // The legend is the only colour-to-name mapping, so it stays at
        // every height once a comparison is on…
        const {unmount} = render(<ComparisonBarChart {...props} height={170} />);
        expect(screen.getByText('Kane')).toBeInTheDocument();
        expect(screen.getByText('Haaland')).toBeInTheDocument();
        unmount();

        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.getByText('Kane')).toBeInTheDocument();
    });

    it('hides the legend for a lone player at any height', () => {
        const props = {
            title: 'Per 90',
            playerName: 'Kane',
            comparisonPlayerName: '',
            data: [{name: 'goals', player1: 0.9, player2: 0}],
            renderTooltipContent: () => null,
        };
        const {unmount} = render(<ComparisonBarChart {...props} height={170} />);
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
        unmount();

        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
    });

    it('keeps only the title in minimal single-player previews', () => {
        const props = {
            title: 'Per 90',
            playerName: 'Kane',
            comparisonPlayerName: '',
            data: [{name: 'goals', player1: 0.9, player2: 0}],
            renderTooltipContent: () => null,
        };
        render(<ComparisonBarChart {...props} height={130} />);
        // Title stays; the legend (an HTML element, unlike SVG ticks) is gone.
        expect(screen.getByText('Per 90')).toBeInTheDocument();
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
    });

    it('explains solid vs striped when rows carry semantic colours', () => {
        const props = {
            title: 'Team streaks',
            playerName: 'Kane',
            comparisonPlayerName: 'Haaland',
            data: [{name: 'won', player1: 4, player2: 2, colour: '#22c55e'}],
            renderTooltipContent: () => null,
            layout: 'horizontal' as const,
        };
        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.getByText(/\(solid\)/)).toBeInTheDocument();
        expect(screen.getByText(/\(striped\)/)).toBeInTheDocument();
    });

    it('skips the legend for semantic single-player charts', () => {
        const props = {
            title: 'Team streaks',
            playerName: 'Kane',
            comparisonPlayerName: '',
            data: [{name: 'won', player1: 4, player2: 0, colour: '#22c55e'}],
            renderTooltipContent: () => null,
            layout: 'horizontal' as const,
        };
        render(<ComparisonBarChart {...props} height={480} />);
        expect(screen.getByText('Team streaks')).toBeInTheDocument();
        expect(screen.queryByText('Kane')).not.toBeInTheDocument();
    });

    it('names each player with matching solid/striped swatches in comparison tooltips', () => {
        const streak = (count: number) => ({count, startDate: '2025-08-01', endDate: '2025-09-01'});
        const {container} = render(
            <StreakTooltipContent
                playerName="Kane"
                playerStreak={streak(4)}
                comparisonStreak={streak(2)}
                comparisonPlayerName="Haaland"
                colour="#22c55e"
            />,
        );
        expect(screen.getByText(/Kane:/)).toBeInTheDocument();
        expect(screen.getByText(/Haaland:/)).toBeInTheDocument();
        const striped = container.querySelector('[class*="legend-striped"]');
        expect(striped?.getAttribute('style')).toContain('rgb(34, 197, 94)');
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
