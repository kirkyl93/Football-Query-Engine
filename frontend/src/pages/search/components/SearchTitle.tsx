import React, {useMemo} from "react";
import './SearchTitle.css'
import {SearchFilterState} from "../../../types/SearchFilterState";
import {constructSearchTitle} from "../lib/searchTitleBuilders";
import TitleClubBadges from "../../../components/TitleClubBadges";

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
        <h4 className="title">
            {constructTitle}
            <TitleClubBadges label=" · PLAYING FOR:" clubIds={filterState.clubsPlayedFor} />
            <TitleClubBadges label="· PLAYING AGAINST:" clubIds={filterState.clubsPlayedAgainst} />
        </h4>
    );
}

export default SearchTitle;
