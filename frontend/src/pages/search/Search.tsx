import React, {useEffect, useMemo, useRef, useState} from "react";
import SearchFilterBar from "./components/SearchFilterBar";
import './Search.css';
import {useLocation, useNavigate} from "react-router-dom";
import SearchTitle from "./components/SearchTitle";
import {SearchOverallTable} from "./components/SearchOverallTable";
import {SearchByGameTable} from "./components/SearchByGameTable";
import {SearchByCountTable} from "./components/SearchByCountTable";
import {countries, Country} from "../../data/Countries";
import {
    HomeOrAwayOptions,
    minuteBasedSortOptions, numberOfGamesOrSeasonsSortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope
} from "../../types/SearchOptions";
import {UrlFilters} from "../../types/UrlFilters";
import {SearchFilterState} from "../../types/SearchFilterState";

const Search: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsDrawerOpen(false);
            }
        };

        if (isDrawerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDrawerOpen]);

    const {
        selectedSeasons,
        selectedCompetitions,
        selectedPositions,
        selectedMinuteFrom,
        selectedMinuteTo,
        selectedMinAge,
        selectedMaxAge,
        selectedMinHeight,
        selectedMaxHeight,
        selectedPlayerNames,
        selectedCountries,
        selectedClubsPlayedFor,
        selectedClubsPlayedAgainst,
        selectedSubsOnly,
        selectedEarliestSubOnTime,
        selectedLatestSubOnTime,
        selectedPenaltyOption,
        selectedHomeOrAwayOption,
        selectedScope,
        selectedSortBy,
        selectedMinimumAppearances,
        selectedMinimumGoals,
        selectedMaximumGoals,
        selectedMinimumAssists,
        selectedMaximumAssists,
        selectedMinimumGoalsAndAssists,
        selectedMaximumGoalsAndAssists
    } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const selectedCountryCodes = params.get(UrlFilters.PLAYER_COUNTRIES)?.split(',').map(code => code.trim()) || [];
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
            selectedMinHeight: params.get(UrlFilters.MINIMUM_HEIGHT) ?
                parseInt(params.get(UrlFilters.MINIMUM_HEIGHT)!, 10) : undefined,
            selectedMaxHeight: params.get(UrlFilters.MAXIMUM_HEIGHT) ?
                parseInt(params.get(UrlFilters.MAXIMUM_HEIGHT)!, 10) : undefined,
            selectedPlayerNames: params.get(UrlFilters.PLAYER_NAMES)?.split(',').map(name => name.trim()) || [],
            selectedCountries: selectedCountryCodes.map(code =>
                countries.find(country => country.code === code))
                .filter((country): country is Country => country !== undefined),
            selectedClubsPlayedFor: params.get(UrlFilters.CLUBS_PLAYED_FOR)?.split(',').map(Number) || [],
            selectedClubsPlayedAgainst: params.get(UrlFilters.CLUBS_PLAYED_AGAINST)?.split(',').map(Number) || [],
            selectedSubsOnly: params.has(UrlFilters.SUBS_ONLY),
            selectedEarliestSubOnTime: params.get(UrlFilters.EARLIEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.EARLIEST_SUB_ON_TIME)!, 10) : undefined,
            selectedLatestSubOnTime: params.get(UrlFilters.LATEST_SUB_ON_TIME) ?
                parseInt(params.get(UrlFilters.LATEST_SUB_ON_TIME)!, 10) : undefined,
            selectedPenaltyOption: params.get(UrlFilters.PENALTIES) as PenaltyOptions || PenaltyOptions.INCLUDE_PENALTIES,
            selectedHomeOrAwayOption: params.get(UrlFilters.HOME_OR_AWAY) as HomeOrAwayOptions || HomeOrAwayOptions.EITHER,
            selectedSortBy: params.get(UrlFilters.SORT_BY) as SortOptions || SortOptions.GOALS,
            selectedScope: params.get(UrlFilters.SCOPE) as StatScope || StatScope.OVERALL,
            selectedMinimumAppearances: params.get(UrlFilters.MINIMUM_APPEARANCES) ?
                parseInt(params.get(UrlFilters.MINIMUM_APPEARANCES)!, 10) : undefined,
            selectedMinimumGoals: params.get(UrlFilters.MINIMUM_GOALS) ?
                parseInt(params.get(UrlFilters.MINIMUM_GOALS)!, 10) : undefined,
            selectedMaximumGoals: params.get(UrlFilters.MAXIMUM_GOALS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_GOALS)!, 10) : undefined,
            selectedMinimumAssists: params.get(UrlFilters.MINIMUM_ASSISTS) ?
                parseInt(params.get(UrlFilters.MINIMUM_ASSISTS)!, 10) : undefined,
            selectedMaximumAssists: params.get(UrlFilters.MAXIMUM_ASSISTS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_ASSISTS)!, 10) : undefined,
            selectedMinimumGoalsAndAssists: params.get(UrlFilters.MINIMUM_GOALS_AND_ASSISTS) ?
                parseInt(params.get(UrlFilters.MINIMUM_GOALS_AND_ASSISTS)!, 10) : undefined,
            selectedMaximumGoalsAndAssists: params.get(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS) ?
                parseInt(params.get(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS)!, 10) : undefined
        };
    }, [location.search]);

    const handleFilterChange = (filterState: SearchFilterState) => {
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
        addParam(UrlFilters.MINIMUM_HEIGHT, filterState.minHeight);
        addParam(UrlFilters.MAXIMUM_HEIGHT, filterState.maxHeight);
        addParam(UrlFilters.PLAYER_NAMES, filterState.playerNames);
        addParam(UrlFilters.PLAYER_COUNTRIES, filterState.playerCountries.map(country => country.code));
        addParam(UrlFilters.CLUBS_PLAYED_FOR, filterState.clubsPlayedFor);
        addParam(UrlFilters.CLUBS_PLAYED_AGAINST, filterState.clubsPlayedAgainst);
        if (filterState.subsOnly) {
            addParam(UrlFilters.SUBS_ONLY, 1);
            addParam(UrlFilters.EARLIEST_SUB_ON_TIME, filterState.earliestSubOnTime);
            addParam(UrlFilters.LATEST_SUB_ON_TIME, filterState.latestSubOnTime);
        }
        addParam(UrlFilters.PENALTIES, filterState.penalties);
        addParam(UrlFilters.HOME_OR_AWAY, filterState.homeOrAway);
        addParam(UrlFilters.SORT_BY, filterState.sortBy);
        addParam(UrlFilters.SCOPE, filterState.statScope);
        if (minuteBasedSortOptions.includes(filterState.sortBy)) {
            addParam(UrlFilters.MINIMUM_APPEARANCES, filterState.minimumAppearances);
        }
        if (numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy)) {
            addParam(UrlFilters.MINIMUM_GOALS, filterState.minimumGoals);
            addParam(UrlFilters.MAXIMUM_GOALS, filterState.maximumGoals);
            addParam(UrlFilters.MINIMUM_ASSISTS, filterState.minimumAssists);
            addParam(UrlFilters.MAXIMUM_ASSISTS, filterState.maximumAssists);
            addParam(UrlFilters.MINIMUM_GOALS_AND_ASSISTS, filterState.minimumGoalsAndAssists);
            addParam(UrlFilters.MAXIMUM_GOALS_AND_ASSISTS, filterState.maximumGoalsAndAssists);
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
        minHeight: selectedMinHeight, maxHeight: selectedMaxHeight,
        playerNames: selectedPlayerNames, playerCountries: selectedCountries,
        clubsPlayedFor: selectedClubsPlayedFor, clubsPlayedAgainst: selectedClubsPlayedAgainst,
        subsOnly: selectedSubsOnly, earliestSubOnTime: selectedEarliestSubOnTime, latestSubOnTime: selectedLatestSubOnTime,
        penalties: selectedPenaltyOption, homeOrAway: selectedHomeOrAwayOption, statScope: selectedScope,
        sortBy: selectedSortBy, minimumAppearances: selectedMinimumAppearances,
        minimumGoals: selectedMinimumGoals, maximumGoals: selectedMaximumGoals,
        minimumAssists: selectedMinimumAssists, maximumAssists: selectedMaximumAssists,
        minimumGoalsAndAssists: selectedMinimumGoalsAndAssists, maximumGoalsAndAssists: selectedMaximumGoalsAndAssists

    };

    return (
        <div className="player-filter-screen">
            <div className="content-wrapper">
                <div className="header-container">
                    <SearchTitle
                        filterState={filterState}
                    />
                    <button className="filter-button" onClick={toggleDrawer}>
                        Filter & Sort
                    </button>
                </div>

                {selectedScope !== StatScope.GAME &&
                    !numberOfGamesOrSeasonsSortOptions.includes(selectedSortBy) &&
                    <SearchOverallTable
                        filterState={filterState}
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