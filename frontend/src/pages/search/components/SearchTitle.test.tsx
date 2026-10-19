import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SearchTitle from './SearchTitle';
import { createDefaultSearchFilterState } from '../lib/defaultSearchFilter';

describe('SearchTitle', () => {
    it('separates club badge strips with commas', () => {
        render(
            <SearchTitle
                filterState={{
                    ...createDefaultSearchFilterState(),
                    clubsPlayedFor: [1, 2],
                    clubsPlayedAgainst: [3],
                }}
            />,
        );

        const heading = screen.getByRole('heading', {level: 4});
        expect(heading.textContent).toContain(', playing for:');
        expect(heading.textContent).toContain(', playing against:');
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

        const heading = screen.getByRole('heading', {level: 4});
        expect(heading.textContent).toContain('11 clubs selected');
        expect(heading.querySelectorAll('img')).toHaveLength(0);
    });
});
