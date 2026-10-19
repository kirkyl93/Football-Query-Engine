import React, {useMemo} from "react";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {constructSearchTitle} from "../lib/searchTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";
import shared from "../../../styles/shared.module.css";

interface SearchTitleProps {
    filterState: SearchFilterState;
}

const SearchTitle: React.FC<SearchTitleProps> = (
    {
        filterState
    }) => {
    const constructTitle = useMemo((): string => {
        return constructSearchTitle(filterState);
    }, [filterState]);

    return (
        <h4 className={shared['title']}>
            {constructTitle}
            <TitleClubBadges label="playing for" clubIds={filterState.clubsPlayedFor} />
            <TitleClubBadges label="playing against" clubIds={filterState.clubsPlayedAgainst} />
        </h4>
    );
}

export default SearchTitle;
