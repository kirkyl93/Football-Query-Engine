import React from "react";
import {SearchFilterState} from "../../../types/SearchFilterState";
import SearchTitle from "./SearchTitle";

interface SearchHeaderProps {
    filterState: SearchFilterState;
    onOpenFilters: () => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({filterState, onOpenFilters}) => {
    return (
        <div className="header-container">
            <SearchTitle
                filterState={filterState}
            />
            <button className="filter-button" onClick={onOpenFilters}>
                Filter & Sort
            </button>
        </div>
    );
};

export default SearchHeader;
