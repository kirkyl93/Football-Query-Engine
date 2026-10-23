import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./pages/home/HomePage', () => ({
    default: () => <div>Mocked Home Page</div>,
}));

vi.mock('./pages/search/Search', () => ({
    default: () => <div>Mocked Search Page</div>,
}));

vi.mock('./pages/player/Player', () => ({
    default: () => <div>Mocked Player Page</div>,
}));

describe('App', () => {
    it('renders the header search and the home route', async () => {
        // App creates its own BrowserRouter, so no wrapper is needed here.
        // jsdom starts at /, which maps to the mocked landing page.
        render(<App />);

        expect(screen.getByText('Mocked Home Page')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Search for a player...')).not.toBeInTheDocument();

        await userEvent.setup().click(screen.getByRole('button', {name: 'Search for a player'}));

        expect(screen.getByPlaceholderText('Search for a player...')).toBeInTheDocument();
    });
});
