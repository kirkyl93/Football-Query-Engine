import React, {useMemo, useState} from "react";
import InfiniteScrollTable from "./InfiniteScrollTable";
import FilterSortDrawer from "./FilterSortDrawer";
import './PlayerFilterScreen.css';
import {useNavigate, useLocation} from "react-router-dom";
import {FilterState, minuteBasedSortOptions, PenaltyOptions, SortOptions, StatScope, UrlFilters} from "./types";
import PlayerSearchTitle from "./PlayerSearchTitle";

const PlayerFilterScreen: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const {
        selectedSeasons,
        selectedCompetitions,
        selectedPositions,
        selectedMinuteFrom,
        selectedMinuteTo,
        selectedMinAge,
        selectedMaxAge,
        selectedPlayerNames,
        selectedClubsPlayedFor,
        selectedClubsPlayedAgainst,
        selectedSubsOnly,
        selectedEarliestSubOnTime,
        selectedLatestSubOnTime,
        selectedPenaltyOption,
        selectedScope,
        selectedSortBy,
        selectedMinimumAppearances
    } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            selectedSeasons: params.get(UrlFilters.SEASONS)?.split(',').map(Number) || [],
            selectedCompetitions: params.get(UrlFilters.COMPETITIONS)?.split(',') || [],
            selectedPositions: params.get(UrlFilters.POSITIONS)?.split(',') || [],
            selectedMinuteFrom: params.get(UrlFilters.MINUTE_FROM) ?
                parseInt(params.get(UrlFilters.MINUTE_FROM)!, 10) : undefined,
            selectedMinuteTo: params.get(UrlFilters.MINUTE_TO) ?
                parseInt(params.get(UrlFilters.MINUTE_TO)!, 10) : undefined,
            selectedMinAge: params.get(UrlFilters.MINIMUM_AGE) ?
                parseInt(params.get(UrlFilters.MINIMUM_AGE)!, 10) : undefined,
            selectedMaxAge: params.get(UrlFilters.MAXIMUM_AGE) ?
                parseInt(params.get(UrlFilters.MAXIMUM_AGE)!, 10) : undefined,
            selectedPlayerNames: params.get(UrlFilters.PLAYER_NAMES)?.split(',').map(name => name.trim()) || [],
            selectedClubsPlayedFor: params.get(UrlFilters.CLUBS_PLAYED_FOR)?.split(',').map(Number) || [],
            selectedClubsPlayedAgainst: params.get(UrlFilters.CLUBS_PLAYED_AGAINST)?.split(',').map(Number) || [],
            selectedSubsOnly: params.has(UrlFilters.SUBS_ONLY),
            selectedEarliestSubOnTime: params.get(UrlFilters.EARLIEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.EARLIEST_SUB_ON_TIME)!, 10) : undefined,
            selectedLatestSubOnTime: params.get(UrlFilters.LATEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.LATEST_SUB_ON_TIME)!, 10) : undefined,
            selectedPenaltyOption: params.get(UrlFilters.PENALTIES) as PenaltyOptions || PenaltyOptions.INCLUDE_PENALTIES,
            selectedSortBy: params.get(UrlFilters.SORT_BY) as SortOptions || SortOptions.GOALS,
            selectedScope: params.get(UrlFilters.SCOPE) as StatScope || StatScope.OVERALL,
            selectedMinimumAppearances: params.get(UrlFilters.MINIMUM_APPEARANCES) ?
                parseInt(params.get(UrlFilters.MINIMUM_APPEARANCES)!, 10) : undefined
        };
    }, [location.search]);

    const handleFilterChange = (filterState: FilterState) => {
        const params = new URLSearchParams();

        const addParam = (key: string, value: any) => {
            if (value !== undefined && value !== null && value != '') {
                params.append(key, value.toString().trim());
            }
        }
        addParam(UrlFilters.SEASONS, filterState.seasons.join(','));
        addParam(UrlFilters.COMPETITIONS, filterState.competitions.join(','));
        addParam(UrlFilters.POSITIONS, filterState.positions.join(','));
        addParam(UrlFilters.MINUTE_FROM, filterState.minuteFrom);
        addParam(UrlFilters.MINUTE_TO, filterState.minuteTo);
        addParam(UrlFilters.MINIMUM_AGE, filterState.minAge);
        addParam(UrlFilters.MAXIMUM_AGE, filterState.maxAge);
        addParam(UrlFilters.PLAYER_NAMES, filterState.playerNames);
        addParam(UrlFilters.CLUBS_PLAYED_FOR, filterState.clubsPlayedFor);
        addParam(UrlFilters.CLUBS_PLAYED_AGAINST, filterState.clubsPlayedAgainst);
        if (filterState.subsOnly) {
            addParam(UrlFilters.SUBS_ONLY, 1);
            addParam(UrlFilters.EARLIEST_SUB_ON_TIME, filterState.earliestSubOnTime);
            addParam(UrlFilters.LATEST_SUB_ON_TIME, filterState.latestSubOnTime);
        }
        addParam(UrlFilters.PENALTIES, filterState.penalties);
        addParam(UrlFilters.SORT_BY, filterState.sortBy);
        addParam(UrlFilters.SCOPE, filterState.statScope);
        if (minuteBasedSortOptions.includes(filterState.sortBy)) {
            addParam(UrlFilters.MINIMUM_APPEARANCES, filterState.minimumAppearances);
        }

        navigate({
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : ''
        }, {replace: true});
    };

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    }

    const filterState = {
        seasons: selectedSeasons, competitions: selectedCompetitions, positions: selectedPositions,
        minuteFrom: selectedMinuteFrom, minuteTo: selectedMinuteTo,
        minAge: selectedMinAge, maxAge: selectedMaxAge,
        playerNames: selectedPlayerNames, clubsPlayedFor: selectedClubsPlayedFor,
        clubsPlayedAgainst: selectedClubsPlayedAgainst, subsOnly: selectedSubsOnly,
        earliestSubOnTime: selectedEarliestSubOnTime, latestSubOnTime: selectedLatestSubOnTime,
        penalties: selectedPenaltyOption, statScope: selectedScope, sortBy: selectedSortBy,
        minimumAppearances: selectedMinimumAppearances
    };

    return (
        <div className="player-filter-screen">
            <div className="content-wrapper">
                <div className="header-container">
                    <PlayerSearchTitle
                        filterState={filterState}
                    />
                    <button className="filter-button" onClick={toggleDrawer}>
                        Filter & Sort
                    </button>
                </div>

                <InfiniteScrollTable
                    filterState={filterState}
                />
            </div>

            <FilterSortDrawer
                isOpen={isDrawerOpen}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                onClose={toggleDrawer}
            />
        </div>
    );
}

export default PlayerFilterScreen;