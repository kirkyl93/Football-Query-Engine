import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import InfiniteScrollTable from "./InfiniteScrollTable";
import FilterSortDrawer from "./FilterSortDrawer";
import './PlayerFilterScreen.css';
import {useNavigate, useLocation} from "react-router-dom";
import {FilterState} from "./types";

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
        selectedSortBy
    } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            selectedSeasons: params.get('seasons')?.split(',').map(Number) || [],
            selectedCompetitions: params.get('comps')?.split(',') || [],
            selectedPositions: params.get('positions')?.split(',') || [],
            selectedMinuteFrom: params.get('minfrom') ? parseInt(params.get('minfrom')!, 10) : undefined,
            selectedMinuteTo: params.get('minto') ? parseInt(params.get('minto')!, 10) : undefined,
            selectedMinAge: params.get('minage') ? parseInt(params.get('minage')!, 10) : undefined,
            selectedMaxAge: params.get('maxage') ? parseInt(params.get('maxage')!, 10) : undefined,
            selectedPlayerNames: params.get('names')?.split(',').map(name => name.trim()) || [],
            selectedClubsPlayedFor: params.get('clubspf')?.split(',').map(Number) || [],
            selectedClubsPlayedAgainst: params.get('clubspa')?.split(',').map(Number) || [],
            selectedSubsOnly: params.has('subonly'),
            selectedEarliestSubOnTime: params.get('earliestsub') ? parseInt(params.get('earliestsub')!, 10) : undefined,
            selectedLatestSubOnTime: params.get('latestsub') ? parseInt(params.get('latestsub')!, 10) : undefined,
            selectedPenaltyOption: params.get("penalty") || "ip",
            selectedSortBy: params.get("sort") || "g",
        };
    }, [location.search]);

    const handleFilterChange = (filterState: FilterState) => {
        const params = new URLSearchParams();

        const addParam = (key: string, value: any) => {
            if (value !== undefined && value !== null && value != '') {
                params.append(key, value.toString().trim());
            }
        }
        addParam('seasons', filterState.seasons.join(','));
        addParam('comps', filterState.competitions.join(','));
        addParam('positions', filterState.positions.join(','));
        addParam('minfrom', filterState.minuteFrom);
        addParam('minto', filterState.minuteTo);
        addParam('minage', filterState.minAge);
        addParam('maxage', filterState.maxAge);
        addParam('names', filterState.playerNames);
        addParam('clubspf', filterState.clubsPlayedFor);
        addParam('clubspa', filterState.clubsPlayedAgainst);
        if (filterState.subsOnly) {
            addParam('subonly', 1);
            addParam('earliestsub', filterState.earliestSubOnTime);
            addParam('latestsub', filterState.latestSubOnTime);
        }
        addParam('penalty', filterState.penalties);
        addParam('sort', filterState.sortBy);

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
        penalties: selectedPenaltyOption, sortBy: selectedSortBy
    };

    return (
        <div className="player-filter-screen">
            <button className="filter-button" onClick={toggleDrawer}>
                Filter & Sort
            </button>

            <FilterSortDrawer
                isOpen={isDrawerOpen}
                filterState={filterState}
                onFilterChange={handleFilterChange}
                onClose={toggleDrawer}
            />

            <InfiniteScrollTable
                filterState={filterState}
            />
        </div>
    );
};

export default PlayerFilterScreen;