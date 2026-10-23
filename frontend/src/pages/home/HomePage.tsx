import React, {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import styles from "./HomePage.module.css";
import NaturalLanguageHero from "./components/NaturalLanguageHero";
import SupportedInfo from "./components/SupportedInfo";
import SearchFilterBar from "../search/components/SearchFilterBar";
import {SearchFilterState} from "../../types/SearchFilterState";
import {createDefaultSearchFilterState} from "../search/lib/defaultSearchFilter";
import {filterStateToSearchParams} from "../search/lib/searchParamsSerializer";
import {useNaturalLanguageQuery} from "../search/hooks/useNaturalLanguageQuery";

const HomePage: React.FC = () => {
    const [query, setQuery] = useState("");
    // Seeded from the default (Premier League top scorers 25/26) so an Apply
    // with no edits lands on the known-good sample search. No external
    // updates happen on the landing page, so a stable seed is enough.
    const [drawerFilterState] = useState<SearchFilterState>(createDefaultSearchFilterState);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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

    // A successful translation (or drawer Apply) always serializes to
    // parameters — penalties, home/away, sort and scope are always included —
    // so navigating back to bare `/` (the landing) is not possible.
    const applyFilters = (newFilterState: SearchFilterState) => {
        const params = filterStateToSearchParams(newFilterState);

        // Push (not replace) so each search is its own history entry and the
        // back button returns to the landing page.
        navigate({
            pathname: '/',
            search: params.toString() ? `?${params.toString()}` : ''
        });
    };

    const {isLoading, message, submit} = useNaturalLanguageQuery({query, onApplyFilters: applyFilters});

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    }

    return (
        <div className={styles['home-page']}>
            <div className={styles['home-content']}>
                <NaturalLanguageHero
                    query={query}
                    onQueryChange={setQuery}
                    onSubmit={submit}
                    isLoading={isLoading}
                    message={message}
                />

                <section
                    className={styles['manual-filters']}
                    aria-label="Manual search filters"
                >
                    <p className={styles['manual-filters-intro']}>
                        Prefer to build your own search?{" "}
                        <button
                            type="button"
                            className={styles['direct-link']}
                            onClick={toggleDrawer}
                            aria-label="Open the filter and sort menu"
                            aria-expanded={isDrawerOpen}
                            aria-haspopup="true"
                        >
                            Open filters &amp; sort <span aria-hidden="true">→</span>
                        </button>
                    </p>
                </section>

                <SupportedInfo />

                <p className={styles['disclaimer']}>
                    Questions are converted into search filters, which aren't guaranteed to work as expected.
                    Check the selected filters on the results page and adjust them if needed.
                </p>
            </div>

            <div ref={drawerRef}>
                <SearchFilterBar
                    isOpen={isDrawerOpen}
                    filterState={drawerFilterState}
                    onFilterChange={applyFilters}
                    onClose={toggleDrawer}
                />
            </div>
        </div>
    );
}

export default HomePage;
