import React, {useEffect, useRef} from "react";
import styles from './ChartSections.module.css';
import playerStyles from '../../Player.module.css';

interface ChartSectionModalProps {
    title: string;
    subtitle?: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * Full-screen section modal (level 1 of the drill-down). Focus switches
 * between overview and single-chart happen inside the panel via layout,
 * so chart instances stay mounted and keep their state.
 */
const ChartSectionModal: React.FC<ChartSectionModalProps> = ({title, subtitle, onClose, children}) => {
    const closeRef = useRef<HTMLButtonElement>(null);
    const titleId = React.useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]');
                const focusable = Array.from(nodes ?? []).filter(node => !node.closest('[hidden]') && !node.closest('details:not([open]) > :not(summary)'));
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
                    event.preventDefault(); last?.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
                    event.preventDefault(); first?.focus();
                }
            }
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [onClose]);

    return (
        <>
            <div
                className={styles['modal-backdrop']}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                className={styles['modal-panel']}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className={styles['modal-header']}>
                    <div className={styles['modal-heading']}>
                    <h2 id={titleId} className={styles['modal-title']}>
                        {title}
                    </h2>
                    {subtitle && <div className={styles['modal-subtitle']}>{subtitle}</div>}
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label={`Close ${title}`}
                        className={playerStyles['filter-button-player']}
                    >
                        ✕ Close
                    </button>
                </div>
                <div className={styles['modal-body']}>
                    {children}
                </div>
            </div>
        </>
    );
};

export default ChartSectionModal;
