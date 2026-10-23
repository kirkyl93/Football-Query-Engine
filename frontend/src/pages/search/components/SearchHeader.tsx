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
                    onClick={onToggleQuestion} aria-expanded={isQuestionOpen} aria-controls="natural-language-search-panel">
                    {isQuestionOpen ? "Close question" : "Ask another question"}
                </button>
                <button type="button" className={styles['filter-button']} onClick={onOpenFilters}>
                    Filter & Sort
                </button>
            </div>
        </div>
    );
};

export default SearchHeader;
