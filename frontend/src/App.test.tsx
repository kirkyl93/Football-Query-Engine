import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./pages/search/Search', () => ({
    default: () => <div>Mocked Search Page</div>,
}));

vi.mock('./pages/player/Player', () => ({
    default: () => <div>Mocked Player Page</div>,
}));

describe('App', () => {
    it('renders the header search and the search route', () => {
        // App creates its own BrowserRouter, so no wrapper is needed here.
        // jsdom starts at /, which maps to the mocked Search page.
        render(<App />);

        expect(screen.getByPlaceholderText('Search for a player...')).toBeInTheDocument();
        expect(screen.getByText('Mocked Search Page')).toBeInTheDocument();
    });
});
