import React, {useEffect, useState} from "react";
import './AppearancesChartFilterBar.css';
import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";
import {EventType, PlayerFilterState, PlayerSeasonsCompetitionsAndClubs} from "../../../types/Player";
import {homeOrAwayOptions} from "../lib/appearancesFilterOptions";
import {parseOptionalNumber, toggleArrayValue} from "../../../lib/filterStateUtils";
import RadioGroupSection from "../../../components/RadioGroupSection";
import PlayerSeasonSection from "./appearancesFilter/PlayerSeasonSection";
import PlayerCompetitionSection from "./appearancesFilter/PlayerCompetitionSection";
import ClubsPlayedForSection from "./appearancesFilter/ClubsPlayedForSection";
import ClubsPlayedAgainstSection from "./appearancesFilter/ClubsPlayedAgainstSection";
import AppearanceTypeSection from "./appearancesFilter/AppearanceTypeSection";
import EventsSection from "./appearancesFilter/EventsSection";

interface AppearancesChartFilterBarProps {
    isOpen: boolean;
    playerSeasonsCompetitionsAndClubs: PlayerSeasonsCompetitionsAndClubs;
    playerFilterState: PlayerFilterState;
    onFilterChange: (filterState: PlayerFilterState) => void;
    onClose: () => void;
}

const AppearancesChartFilterBar: React.FC<AppearancesChartFilterBarProps> = (
    {
        isOpen,
        playerSeasonsCompetitionsAndClubs,
        playerFilterState,
        onFilterChange,
        onClose
    }) => {

    const [localFilterState, setLocalFilterState] = useState<PlayerFilterState>(playerFilterState);
    const [newClubPlayedAgainst, setNewClubPlayedAgainst] = useState<string>("");
    const [newClubsPlayedAgainstSuggestions, setNewClubsPlayedAgainstSuggestions] = useState<[number, string][]>([]);
    const [isClubsPlayedAgainstDropdownVisible, setIsClubsPlayedAgainstDropdownVisible] = useState<boolean>(false);

    useEffect(() => {
        setLocalFilterState(playerFilterState);
    }, [playerFilterState]);

    const setField = <K extends keyof PlayerFilterState>(key: K, value: PlayerFilterState[K]) => {
        setLocalFilterState(prevState => ({...prevState, [key]: value}));
    };

    const updateField = <K extends keyof PlayerFilterState>(
        key: K,
        updater: (current: PlayerFilterState[K]) => PlayerFilterState[K],
    ) => {
        setLocalFilterState(prevState => ({...prevState, [key]: updater(prevState[key])}));
    };

    const resetFilters = () => {
        setLocalFilterState(prev => ({
            ...prev,
            selectedSeasons: [playerSeasonsCompetitionsAndClubs.seasons[playerSeasonsCompetitionsAndClubs.seasons.length - 1]],
            selectedCompetitions: [],
            selectedClubsPlayedFor: [],
            selectedClubsPlayedAgainst: [],
            selectedHomeOrAway: HomeOrAwayOptions.EITHER,
            selectedAppearanceType: AppearanceTypeOptions.EITHER,
            selectedMinimumMinutesPlayed: undefined,
            selectedMaximumMinutesPlayed: undefined,
            selectedEvents: {
                [EventType.Goals]: false,
                [EventType.Penalties]: false,
                [EventType.OwnGoals]: false,
                [EventType.CleanSheets]: false,
                [EventType.Assists]: false,
                [EventType.Yellows]: false,
                [EventType.Reds]: false
        }
        }));
    };

    const handleClubPlayedAgainstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value: string = e.target.value;
        setNewClubPlayedAgainst(value);
        if (value.trim().length < 2) {
            setIsClubsPlayedAgainstDropdownVisible(false);
            setNewClubsPlayedAgainstSuggestions([]);
            return;
        }

        const matchingClubs = playerSeasonsCompetitionsAndClubs.clubsPlayedAgainst.filter(
            club => club[1].toLowerCase().includes(value.toLowerCase())
        );

        if (matchingClubs.length == 0) {
            setIsClubsPlayedAgainstDropdownVisible(false);
            setNewClubsPlayedAgainstSuggestions([]);
            return;
        }

        setNewClubsPlayedAgainstSuggestions(matchingClubs);
        setIsClubsPlayedAgainstDropdownVisible(true);
    }

    const handleClubPlayedAgainstSuggestionClick = (suggestion: number) => {
        setNewClubPlayedAgainst("");
        setNewClubsPlayedAgainstSuggestions([]);
        setIsClubsPlayedAgainstDropdownVisible(false);
        if (localFilterState.selectedClubsPlayedAgainst !== undefined && !localFilterState.selectedClubsPlayedAgainst.includes(suggestion)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                selectedClubsPlayedAgainst: [...prevState.selectedClubsPlayedAgainst, suggestion]
            }));
        }
    };

    const handleRemovePlayedAgainstClub = (clubIdToRemove: number) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            selectedClubsPlayedAgainst: prevState.selectedClubsPlayedAgainst.filter(club => club !== clubIdToRemove)
        }));
    }

    const handleEventSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const eventKey = e.target.value as EventType;

        setLocalFilterState(prevState => ({
            ...prevState,
            selectedEvents: {
                ...prevState.selectedEvents,
                [eventKey]: e.target.checked
            }
        }));
    };

    const applyFilters = () => {
        onFilterChange(localFilterState);
        onClose();
    };

    return (
        <div className={`player-filter-drawer ${isOpen ? 'open' : ''}`}>
            <div className="filter-header">
                <div className="filter-title"><h2>Filter</h2></div>
                <div className="filter-actions">
                    <button className="reset-button" onClick={resetFilters}>Reset</button>
                    <button className="close-button" onClick={onClose}>&#10006;</button>
                </div>
            </div>

            <div className="filter-drawer-content">
                <PlayerSeasonSection
                    seasons={playerSeasonsCompetitionsAndClubs.seasons}
                    selectedSeasons={localFilterState.selectedSeasons}
                    onSeasonChange={(e) => updateField('selectedSeasons', seasons => toggleArrayValue(seasons, parseInt(e.target.value)))}
                />
                <PlayerCompetitionSection
                    leagueCompetitions={playerSeasonsCompetitionsAndClubs.leagueCompetitions}
                    europeanCompetitions={playerSeasonsCompetitionsAndClubs.europeanCompetitions}
                    selectedCompetitions={localFilterState.selectedCompetitions}
                    onCompetitionChange={(e) => updateField('selectedCompetitions', competitions => toggleArrayValue(competitions, e.target.value))}
                />
                <ClubsPlayedForSection
                    clubs={playerSeasonsCompetitionsAndClubs.clubsPlayedFor}
                    selectedClubIds={localFilterState.selectedClubsPlayedFor}
                    onClubChange={(e) => updateField('selectedClubsPlayedFor', clubs => toggleArrayValue(clubs, Number(e.target.value)))}
                />
                <ClubsPlayedAgainstSection
                    selectedClubIds={localFilterState.selectedClubsPlayedAgainst}
                    query={newClubPlayedAgainst}
                    suggestions={newClubsPlayedAgainstSuggestions}
                    isDropdownVisible={isClubsPlayedAgainstDropdownVisible}
                    onQueryChange={handleClubPlayedAgainstChange}
                    onSuggestionClick={handleClubPlayedAgainstSuggestionClick}
                    onRemoveClub={handleRemovePlayedAgainstClub}
                />
                <RadioGroupSection
                    title="HOME OR AWAY"
                    options={homeOrAwayOptions}
                    selectedId={localFilterState.selectedHomeOrAway}
                    onChange={(e) => setField('selectedHomeOrAway', e.target.value as HomeOrAwayOptions)}
                />
                <AppearanceTypeSection
                    selectedAppearanceType={localFilterState.selectedAppearanceType}
                    minimumMinutesPlayed={localFilterState.selectedMinimumMinutesPlayed}
                    maximumMinutesPlayed={localFilterState.selectedMaximumMinutesPlayed}
                    onAppearanceTypeChange={(e) => setField('selectedAppearanceType', e.target.value as AppearanceTypeOptions)}
                    onMinimumMinutesPlayedChange={(e) => setField('selectedMinimumMinutesPlayed', parseOptionalNumber(e.target.value))}
                    onMaximumMinutesPlayedChange={(e) => setField('selectedMaximumMinutesPlayed', parseOptionalNumber(e.target.value))}
                />
                <EventsSection
                    selectedEvents={localFilterState.selectedEvents}
                    onEventSelectionChange={handleEventSelectionChange}
                />
            </div>

            <button className="apply-button" onClick={applyFilters}>APPLY</button>

        </div>
    )
}

export default AppearancesChartFilterBar
