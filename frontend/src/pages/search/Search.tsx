import React, {useEffect, useRef, useState} from "react";
import SearchFilterBar from "./components/SearchFilterBar";
import NaturalLanguageSearchBar from "./components/NaturalLanguageSearchBar";
import styles from './Search.module.css';
import {useLocation, useNavigate} from "react-router-dom";
import {SearchOverallTable} from "./components/SearchOverallTable";
import {SearchByGameTable} from "./components/SearchByGameTable";
import {SearchByCountTable} from "./components/SearchByCountTable";
import SearchHeader from "./components/SearchHeader";
import {
    numberOfGamesOrSeasonsSortOptions,
    SortOptions,
    StatScope,
} from "../../types/SearchOptions";
import {SearchFilterState} from "../../types/SearchFilterState";
import {useSearchFiltersFromUrl} from "./hooks/useSearchFiltersFromUrl";
import {filterStateToSearchParams} from "./lib/searchParamsSerializer";

const Search: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isQuestionOpen, setIsQuestionOpen] = useState(false);
    const questionButtonRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsDrawerOpen(false);
            }
        };

        const handleEscPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsDrawerOpen(false);
            }
        };

        if (isDrawerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscPress);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscPress);
        };
    }, [isDrawerOpen]);

    const filterState: SearchFilterState = useSearchFiltersFromUrl(location.search);
    const selectedScope = filterState.statScope;
    const selectedSortBy = filterState.sortBy;

    const handleFilterChange = (newFilterState: SearchFilterState) => {
        const params = filterStateToSearchParams(newFilterState);

        navigate({
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : ''
        }, {replace: true});
    };

    const handleNaturalLanguageSearch = (filterState: SearchFilterState) => {
        // Push (not replace) so each natural-language search is its own
        // history entry and the back button undoes the previous query.
        const params = filterStateToSearchParams(filterState);

        navigate({
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : ''
        });
        setIsQuestionOpen(false);
        questionButtonRef.current?.focus();
    };

    const handleSortChange = (sortBy: SortOptions) => {
        handleFilterChange({...filterState, sortBy});
    };

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    }

    return (
        <div className={styles['player-filter-screen']}>
            <div className={styles['content-wrapper']}>
                <SearchHeader
                    filterState={filterState}
                    onOpenFilters={toggleDrawer}
                    isQuestionOpen={isQuestionOpen}
                    onToggleQuestion={() => setIsQuestionOpen(open => !open)}
                    questionButtonRef={questionButtonRef}
                />
                <div id="natural-language-search-panel" hidden={!isQuestionOpen}
                    onKeyDown={event => {
                        if (event.key === "Escape") {
                            setIsQuestionOpen(false);
                            questionButtonRef.current?.focus();
                        }
                    }}>
                    <NaturalLanguageSearchBar isOpen={isQuestionOpen} onApplyFilters={handleNaturalLanguageSearch} />
                </div>

                {selectedScope !== StatScope.GAME &&
                    !numberOfGamesOrSeasonsSortOptions.includes(selectedSortBy) &&
                    <SearchOverallTable
                        filterState={filterState}
                        onSortChange={handleSortChange}
                    />
                }

                {selectedScope !== StatScope.GAME &&
                    numberOfGamesOrSeasonsSortOptions.includes(selectedSortBy) &&
                    <SearchByCountTable
                        filterState={filterState}
                    />
                }

                {selectedScope === StatScope.GAME &&
                    <SearchByGameTable
                        filterState={filterState}
                        onSortChange={handleSortChange}
                    />
                }
            </div>

            <div ref={drawerRef}>
                <SearchFilterBar
                    isOpen={isDrawerOpen}
                    filterState={filterState}
                    onFilterChange={handleFilterChange}
                    onClose={toggleDrawer}
                />
            </div>
        </div>
    );
}

export default Search;
