import React, {useMemo} from "react";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {constructSearchTitleParts} from "../lib/searchTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";
import styles from "./SearchTitle.module.css";

interface SearchTitleProps {
    filterState: SearchFilterState;
    compact?: boolean;
}

const SearchTitle: React.FC<SearchTitleProps> = (
    {
        filterState, compact = false
    }) => {
    const {headline, filters} = useMemo(() => constructSearchTitleParts(filterState), [filterState]);

    return (
        <div className={`${styles.title} ${compact ? styles.compact : ""}`}>
            {compact ? <p className={styles.headline}>{headline}</p> : <h1 className={styles.headline}>{headline}</h1>}
            <ul className={styles.filters} aria-label="Applied filters">
                {filters.map((filter, index) => <li key={`${index}-${filter}`}>{filter}</li>)}
                {filterState.clubsPlayedFor.length > 0 && <li>
                    <TitleClubBadges label="playing for" clubIds={filterState.clubsPlayedFor} separator="" />
                </li>}
                {filterState.clubsPlayedAgainst.length > 0 && <li>
                    <TitleClubBadges label="playing against" clubIds={filterState.clubsPlayedAgainst} separator="" />
                </li>}
            </ul>
        </div>
    );
}

export default SearchTitle;
