import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScrollTable from "./InfiniteScrollTable";
import FilterSortDrawer from "./FilterSortDrawer";
import './PlayerFilterScreen.css';
import { useNavigate, useLocation } from "react-router-dom";

const PlayerFilterScreen: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { selectedSeasons, selectedCompetitions, selectedPositions, selectedMinuteFrom, selectedMinuteTo, selectedMinAge, selectedMaxAge, 
        selectedPlayerName, selectedSubsOnly, selectedEarliestSubOnTime, selectedLatestSubOnTime, selectedPenaltyOption, selectedSortBy } = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            selectedSeasons: params.get('seasons')?.split(',').map(Number) || [],
            selectedCompetitions: params.get('comps')?.split(',') || [],
            selectedPositions: params.get('positions')?.split(',') || [],
            selectedMinuteFrom: params.get('minfrom') ? parseInt(params.get('minfrom')!, 10) : undefined,
            selectedMinuteTo: params.get('minto') ? parseInt(params.get('minto')!, 10) : undefined,
            selectedMinAge: params.get('minage') ? parseInt(params.get('minage')!, 10) : undefined,
            selectedMaxAge: params.get('maxage') ? parseInt(params.get('maxage')!, 10) : undefined,
            selectedPlayerName: params.get('playername')?.trim() ?? params.get('playername') ?? undefined,
            selectedSubsOnly: params.has('subonly'),
            selectedEarliestSubOnTime: params.get('earliestsub') ? parseInt(params.get('earliestsub')!, 10) : undefined,
            selectedLatestSubOnTime: params.get('latestsub') ? parseInt(params.get('latestsub')!, 10) : undefined,
            selectedPenaltyOption: params.get("penalty") || "ip",
            selectedSortBy: params.get("sort") || "g",
        };
    }, [location.search]);


    const handleFilterChange = (seasons: number[], competitions: string[], positions: string[], minuteFrom: number | undefined, minuteTo: number | undefined, 
        minAge: number | undefined, maxAge: number | undefined, playerName: string | undefined, subsOnly: boolean, earliestSubOnTime: number | undefined,
        latestSubOnTime: number | undefined, penalties: string, sortBy: string) => {
        const params = new URLSearchParams();
        if (seasons.length > 0) {
            params.append('seasons', seasons.join(','));
        }
        if (competitions.length > 0) {
            params.append('comps', competitions.join(','));
        }

        if (positions.length > 0) {
            params.append('positions', positions.join(','));
        }

        if (minuteFrom !== undefined) {
            params.append('minfrom', minuteFrom.toString());
        }

        if (minuteTo !== undefined) {
            params.append("minto", minuteTo.toString());
        }

        if (minAge !== undefined) {
            params.append('minage', minAge.toString());
        }

        if (maxAge !== undefined) {
            params.append('maxage', maxAge.toString());
        }

        if (playerName !== undefined && playerName.trim() !== '') {
            params.append('name', playerName);
        }

        if (subsOnly) {
            params.append('subonly', '1');
        }

        if (subsOnly && earliestSubOnTime !== undefined) {
            params.append('earliestsub', earliestSubOnTime.toString());
        }

        if (subsOnly && latestSubOnTime !== undefined) {
            params.append('latestsub', latestSubOnTime.toString());
        }

        if (penalties) {
            params.append('penalty', penalties);
        }

        if (sortBy) {
            params.append('sort', sortBy);
        }

        navigate({
            pathname: location.pathname,
            search: params.toString() ? `?${params.toString()}` : ''
        }, { replace: true });
    };

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    }

    return (
        <div className="player-filter-screen">
            <button className="filter-button" onClick={toggleDrawer}>
                Filter & Sort
            </button>

            <FilterSortDrawer
                isOpen={isDrawerOpen}
                selectedSeasons={selectedSeasons}
                selectedCompetitions={selectedCompetitions}
                selectedPositions={selectedPositions}
                minuteFrom={selectedMinuteFrom}
                minuteTo={selectedMinuteTo}
                minAge={selectedMinAge}
                maxAge={selectedMaxAge}
                playerName={selectedPlayerName}
                subsOnly={selectedSubsOnly}
                earliestSubOnTime={selectedEarliestSubOnTime}
                latestSubOnTime={selectedLatestSubOnTime}
                penalties={selectedPenaltyOption}
                sortBy={selectedSortBy}
                onFilterChange={handleFilterChange}
                onClose={toggleDrawer}
            />
      
            <InfiniteScrollTable
                selectedSeasons={selectedSeasons}
                selectedCompetitions={selectedCompetitions}
                sortBy={selectedSortBy}
                subsOnly={selectedSubsOnly}
            />
        </div>
    );
};

export default PlayerFilterScreen;