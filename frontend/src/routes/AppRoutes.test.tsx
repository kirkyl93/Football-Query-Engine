import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppRoutes from './AppRoutes';

vi.mock('../pages/search/Search', () => ({
    default: () => <div>Mocked Search Page</div>,
}));

vi.mock('../pages/player/Player', () => ({
    default: () => <div>Mocked Player Page</div>,
}));

describe('AppRoutes', () => {
    it('renders the search page at /', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <AppRoutes />
            </MemoryRouter>,
        );

        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
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
