import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SearchTitle from './SearchTitle';
import { createDefaultSearchFilterState } from '../lib/defaultSearchFilter';
import {PenaltyOptions, SortOptions} from '../../../types/SearchOptions';

describe('SearchTitle', () => {
    it('keeps club badge strips with the applied filters', () => {
        render(
            <SearchTitle
                filterState={{
                    ...createDefaultSearchFilterState(),
                    clubsPlayedFor: [1, 2],
                    clubsPlayedAgainst: [3],
                }}
            />,
        );

        expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Top scorers');
        const filters = screen.getByRole('list', {name: 'Applied filters'});
        expect(filters.textContent).toContain('playing for:');
        expect(filters.textContent).toContain('playing against:');
    });

    it('collapses more than ten club badges to a count', () => {
        render(
            <SearchTitle
                filterState={{
                    ...createDefaultSearchFilterState(),
                    clubsPlayedFor: Array.from({length: 11}, (_, i) => i + 1),
                }}
            />,
        );

        const filters = screen.getByRole('list', {name: 'Applied filters'});
        expect(filters.textContent).toContain('11 clubs selected');
        expect(filters.querySelectorAll('img')).toHaveLength(0);
    });

    it('separates the ranking from the complete filter description', () => {
        render(<SearchTitle filterState={{
            ...createDefaultSearchFilterState(), competitions: ['L1'], seasons: [],
            sortBy: SortOptions.MINUTES_PER_GOAL, minimumAppearances: 50,
            minuteTo: 45, penalties: PenaltyOptions.EXCLUDE_PENALTIES,
        }} />);
        expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(/^Fewest minutes per goal$/);
        const filters = screen.getByRole('list', {name: 'Applied filters'});
        for (const clause of ['Bundesliga', 'all seasons', 'until minute 45', 'excluding penalties', 'at least 50 appearances']) {
            expect(filters).toHaveTextContent(clause);
        }
    });
});
