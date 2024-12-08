import React from "react";
import './LoadingBar.css';

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
            {loading && !hasData && error == null && <div className="loader-container">
                <div className="bouncing-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            </div>}
            {loading && hasData && hasMore && <div className="loading">Loading more players...</div>}
            {error && <div className="error">{error}</div>}
        </div>
    )
}