import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {LoadingBar} from './LoadingBar';

describe('LoadingBar error recovery', () => {
    it('shows the failure message and retries when requested', async () => {
        const retry = vi.fn();
        render(<LoadingBar loading={false} hasData={false} hasMore={true} error="Failed to fetch data" onRetry={retry} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Unable to load results');
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch data');
        await userEvent.setup().click(screen.getByRole('button', {name: 'Retry'}));
        expect(retry).toHaveBeenCalledTimes(1);
    });

    it('distinguishes a later-page failure and disables duplicate retries while loading', async () => {
        const retry = vi.fn();
        render(<LoadingBar loading={true} hasData={true} hasMore={true} error="Failed to fetch data" onRetry={retry} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Unable to load more results');
        const button = screen.getByRole('button', {name: 'Retrying…'});
        expect(button).toBeDisabled();
        await userEvent.setup().click(button);
        expect(retry).not.toHaveBeenCalled();
    });
});
