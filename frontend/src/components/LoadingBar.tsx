import React from "react";
import styles from './LoadingBar.module.css';

interface LoadingProps {
    loading: boolean;
    hasData: boolean;
    hasMore: boolean;
    error: string | null;
}

export const LoadingBar: React.FC<LoadingProps> = (
    {
        loading,
        hasData,
        hasMore,
        error
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
            {error && <div className={styles['error']}>{error}</div>}
        </div>
    )
}