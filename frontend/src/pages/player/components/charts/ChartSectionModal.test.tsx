import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChartSectionModal from './ChartSectionModal';

describe('ChartSectionModal', () => {
    it('closes via button, backdrop and Escape', () => {
        const onClose = vi.fn();
        render(
            <ChartSectionModal title="Appearances" onClose={onClose}>
                <div>body</div>
            </ChartSectionModal>,
        );

        expect(screen.getByRole('dialog', {name: 'Appearances'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Close Appearances'}));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, {key: 'Escape'});
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('closes when the backdrop is clicked', () => {
        const onClose = vi.fn();
        const {container} = render(
            <ChartSectionModal title="Stat charts" onClose={onClose}>
                <div>body</div>
            </ChartSectionModal>,
        );

        const backdrop = container.querySelector('[class*="modal-backdrop"]');
        expect(backdrop).not.toBeNull();
        fireEvent.click(backdrop!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

it('traps keyboard focus in the modal and restores it to the opener', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener); opener.focus();
    const {unmount} = render(<ChartSectionModal title="Details" onClose={vi.fn()}><button>Last control</button></ChartSectionModal>);
    expect(screen.getByRole('button', {name: 'Close Details'})).toHaveFocus();
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
    expect(screen.getByRole('button', {name: 'Last control'})).toHaveFocus();
    fireEvent.keyDown(document, {key: 'Tab'});
    expect(screen.getByRole('button', {name: 'Close Details'})).toHaveFocus();
    unmount(); expect(opener).toHaveFocus(); opener.remove();
});
