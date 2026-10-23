import React from "react";
import styles from './LoadingBar.module.css';

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
                <div className={styles['error']} role="alert">
                    <div className={styles['error-content']}>
                        <p className={styles['error-title']}>{hasData ? "Unable to load more results" : "Unable to load results"}</p>
                        <p className={styles['error-message']}>{error}</p>
                    </div>
                    {onRetry && (
                        <button type="button" className={styles['retry-button']} onClick={onRetry} disabled={loading}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 7v5h-5" />
                                <path d="M20 12a8 8 0 1 0-2 5" />
                            </svg>
                            {loading ? "Retrying…" : "Retry"}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
