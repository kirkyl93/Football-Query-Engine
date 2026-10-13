import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from './AppRoutes';
import { getDefaultSearchPath } from '../pages/search/lib/defaultSearchFilter';

vi.mock('../pages/search/Search', () => ({
    default: () => <div>Mocked Search Page</div>,
}));

vi.mock('../pages/player/Player', () => ({
    default: () => <div>Mocked Player Page</div>,
}));

describe('AppRoutes', () => {
    const LocationDisplay = () => {
        const location = useLocation();
        return <div data-testid="location-display">{location.pathname}{location.search}</div>;
    };

    const renderAt = (initialEntry: string) => {
        render(
            <MemoryRouter initialEntries={[initialEntry]}>
                <AppRoutes />
                <LocationDisplay />
            </MemoryRouter>,
        );
    };

    it('redirects bare / to the default home page (Premier League top scorers 25/26)', () => {
        renderAt('/');

        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent(getDefaultSearchPath());
    });

    it('renders the search page directly when query params are present', () => {
        renderAt('/?seasons=2024&comps=GB1');

        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent('/?seasons=2024&comps=GB1');
    });

    it('stays on the default path without further redirect', () => {
        const defaultPath = getDefaultSearchPath();
        renderAt(defaultPath);

        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent(defaultPath);
    });

    it('uses Premier League top scorers 25/26 as the default home path', () => {
        expect(getDefaultSearchPath()).toBe('/?seasons=2025&comps=GB1&penalty=ip&home=e&sort=g&scope=o');
    });

    it('renders the player page at /player/:playerId', () => {
        render(
            <MemoryRouter initialEntries={['/player/123']}>
                <AppRoutes />
            </MemoryRouter>,
        );

        expect(screen.getByText('Mocked Player Page')).toBeInTheDocument();
    });
});
