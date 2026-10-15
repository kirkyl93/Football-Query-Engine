import React from "react";
import styles from './LoadingBar.module.css';
import shared from '../styles/shared.module.css';

interface LoadingProps {
    loading: boolean;
    hasData: boolean;
    hasMore: boolean;
    error: string | null;
    onRetry?: () => void;
}

export const LoadingBar: React.FC<LoadingProps> = (
    {
        loading,
        hasData,
        hasMore,
        error,
        onRetry
    }) => {
    return (
        <div>
            {loading && !hasData && error == null && <div className={styles['loader-container']}>
                <div className={styles['bouncing-dots']}>
                    <div className={styles['dot']}></div>
                    <div className={styles['dot']}></div>
                    <div className={styles['dot']}></div>
                </div>
            </div>}
            {loading && hasData && hasMore && <div className={styles['loading']}>Loading more players...</div>}
            {error && (
                <div className={styles['error']}>
                    <span>{error}</span>
                    {onRetry && (
                        <button type="button" className={`${shared['apply-button']} ${styles['retry-button']}`} onClick={onRetry}>
                            Retry
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}