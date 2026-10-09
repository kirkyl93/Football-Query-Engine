import React from "react";
import {SearchFilterState} from "../../../types/SearchFilterState";
import SearchTitle from "./SearchTitle";
import shared from "../../../styles/shared.module.css";
import styles from '../Search.module.css';

interface SearchHeaderProps {
    filterState: SearchFilterState;
    onOpenFilters: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({filterState, onOpenFilters}) => {
    return (
        <div className={shared['header-container']}>
            <SearchTitle
                filterState={filterState}
            />
            <button className={styles['filter-button']} onClick={onOpenFilters}>
                Filter & Sort
            </button>
        </div>
    );
};

export default SearchHeader;
