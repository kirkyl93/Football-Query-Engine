import React, {type RefObject} from "react";
import {SearchFilterState} from "../../../types/SearchFilterState";
import SearchTitle from "./SearchTitle";
import shared from "../../../styles/shared.module.css";
import styles from '../Search.module.css';

interface SearchHeaderProps {
    filterState: SearchFilterState;
    onOpenFilters: () => void;
    isQuestionOpen: boolean;
    onToggleQuestion: () => void;
    questionButtonRef: RefObject<HTMLButtonElement | null>;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({filterState, onOpenFilters, isQuestionOpen, onToggleQuestion, questionButtonRef}) => {
    return (
        <div className={`${shared['header-container']} ${styles['search-header']}`}>
            <SearchTitle
                filterState={filterState}
            />
            <div className={styles['search-actions']}>
                <button type="button" ref={questionButtonRef} className={styles['question-toggle']}
                    onClick={onToggleQuestion} aria-expanded={isQuestionOpen} aria-controls="natural-language-search-panel"
                    aria-label={isQuestionOpen ? "Close question" : "Ask a question"}
                    title={isQuestionOpen ? "Close question" : "Ask a question"}>
                    <svg className={styles['action-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {isQuestionOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <>
                            <path d="M21 15a3 3 0 0 1-3 3H7l-4 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
                            <path d="M8 9h8M8 13h5" />
                        </>}
                    </svg>
                    <span className={styles['action-label']}>{isQuestionOpen ? "Close question" : "Ask a question"}</span>
                </button>
                <button type="button" className={styles['filter-button']} onClick={onOpenFilters} aria-label="Filter & Sort" title="Filter & Sort">
                    <svg className={styles['action-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
                        <circle cx="15" cy="7" r="2" />
                        <circle cx="9" cy="17" r="2" />
                    </svg>
                    <span className={styles['action-label']}>Filter & Sort</span>
                </button>
            </div>
        </div>
    );
};

export default SearchHeader;
