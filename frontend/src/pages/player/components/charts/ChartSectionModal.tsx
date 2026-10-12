import React, {useEffect, useRef} from "react";
import styles from './ChartSections.module.css';
import playerStyles from '../../Player.module.css';

interface ChartSectionModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * Full-screen section modal (level 1 of the drill-down). Focus switches
 * between overview and single-chart happen inside the panel via layout,
 * so chart instances stay mounted and keep their state.
 */
const ChartSectionModal: React.FC<ChartSectionModalProps> = ({title, onClose, children}) => {
    const closeRef = useRef<HTMLButtonElement>(null);
    const titleId = React.useId();

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
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
                className={styles['modal-panel']}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className={styles['modal-header']}>
                    <h2 id={titleId} className={styles['modal-title']}>
                        {title}
                    </h2>
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
