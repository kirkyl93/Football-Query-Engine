import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from './AppRoutes';

vi.mock('../pages/search/Search', () => ({
    default: () => <div>Mocked Search Page</div>,
}));

vi.mock('../pages/home/HomePage', () => ({
    default: () => <div>Mocked Home Page</div>,
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

    it('renders the landing page on bare / (no query params)', () => {
        renderAt('/');

        expect(screen.getByText('Mocked Home Page')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent('/');
    });

    it('renders the search page directly when query params are present', () => {
        renderAt('/?seasons=2024&comps=GB1');

        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
        expect(screen.getByTestId('location-display')).toHaveTextContent('/?seasons=2024&comps=GB1');
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
