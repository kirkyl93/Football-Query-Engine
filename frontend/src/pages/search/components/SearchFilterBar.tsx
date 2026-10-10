import React, {useEffect, useState} from 'react';
import styles from './SearchFilterBar.module.css';
import shared from "../../../styles/shared.module.css";
import {countries, Country} from "../../../data/Countries";
import {
    gameOnlySortOptions,
    HomeOrAwayOptions,
    PenaltyOptions,
    SortOptions,
    StatScope
} from "../../../types/SearchOptions";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {ages, heights, homeOrAwayOptions, minutes, penaltyOptions} from "../lib/searchFilterOptions";
import {createDefaultSearchFilterState} from "../lib/defaultSearchFilter";
import {validateSearchFilters} from "../lib/searchFilterValidation";
import {parseOptionalNumber, toggleArrayValue} from "../../../lib/filterStateUtils";
import {useClubAutocomplete} from "../hooks/useClubAutocomplete";
import SeasonFilterSection from "./filterBar/SeasonFilterSection";
import CompetitionFilterSection from "./filterBar/CompetitionFilterSection";
import PositionFilterSection from "./filterBar/PositionFilterSection";
import MinMaxSelectSection from "./filterBar/MinMaxSelectSection";
import PlayerNameFilterSection from "./filterBar/PlayerNameFilterSection";
import PlayerCountryFilterSection from "./filterBar/PlayerCountryFilterSection";
import ClubsFilterSection from "./filterBar/ClubsFilterSection";
import SubstitutesFilterSection from "./filterBar/SubstitutesFilterSection";
import RadioGroupSection from "../../../components/RadioGroupSection";
import SortByFilterSection from "./filterBar/SortByFilterSection";

interface SearchFilterBarProps {
    isOpen: boolean;
    filterState: SearchFilterState;
    onFilterChange: (filterState: SearchFilterState) => void;
    onClose: () => void;
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = (
    {
        isOpen,
        filterState,
        onFilterChange,
        onClose,
    }) => {
    const [localFilterState, setLocalFilterState] = useState<SearchFilterState>(filterState);
    const [newCountry, setNewCountry] = useState<string>("");
    const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const playedForAutocomplete = useClubAutocomplete();
    const playedAgainstAutocomplete = useClubAutocomplete();

    // Refresh the working copy whenever the drawer opens, so sorts (or
    // anything else) applied elsewhere — e.g. table headers — show up.
    // Deliberately keyed on opening only, so in-progress edits are kept.
    useEffect(() => {
        if (isOpen) {
            setLocalFilterState(filterState);
        }
    }, [isOpen]);

    const resetFilters = () => {
        setLocalFilterState(createDefaultSearchFilterState());
        setNewPlayerName("");
        playedForAutocomplete.clear();
        playedAgainstAutocomplete.clear();
    };

    const setField = <K extends keyof SearchFilterState>(key: K, value: SearchFilterState[K]) => {
        setLocalFilterState(prevState => ({...prevState, [key]: value}));
    };

    const updateField = <K extends keyof SearchFilterState>(
        key: K,
        updater: (current: SearchFilterState[K]) => SearchFilterState[K],
    ) => {
        setLocalFilterState(prevState => ({...prevState, [key]: updater(prevState[key])}));
    };

    const handleClubPlayedForSuggestionClick = (suggestion: number) => {
        playedForAutocomplete.clear();
        if (localFilterState.clubsPlayedFor !== undefined && !localFilterState.clubsPlayedFor.includes(suggestion)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                clubsPlayedFor: [...prevState.clubsPlayedFor, suggestion]
            }));
        }
    };

    const handleClubPlayedAgainstSuggestionClick = (suggestion: number) => {
        playedAgainstAutocomplete.clear();
        if (localFilterState.clubsPlayedAgainst !== undefined && !localFilterState.clubsPlayedAgainst.includes(suggestion)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                clubsPlayedAgainst: [...prevState.clubsPlayedAgainst, suggestion]
            }));
        }
    };

    const handlePlayerCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewCountry(value);
        if (value.length > 0) {
            setFilteredCountries(
                countries.filter((country) =>
                    country.name.toLowerCase().startsWith(value.toLowerCase())
                )
            );
        } else {
            setFilteredCountries([]);
        }
    };

    const handlePlayerCountryClick = (country: Country) => {
        setNewCountry("");
        setFilteredCountries([]);

        if (!localFilterState.playerCountries?.some((n) => n.name === country.name)) {
            setLocalFilterState((prevState) => ({
                ...prevState,
                playerCountries: [...(prevState.playerCountries || []), country],
            }));
        }
    };


    const handleRemovePlayerCountry = (countryName: string) => {
        setLocalFilterState((prevState) => ({
            ...prevState,
            playerCountries: prevState.playerCountries.filter(
                (n) => n.name !== countryName
            ),
        }));
    };


    const handleRemovePlayedForClub = (clubIdToRemove: number) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            clubsPlayedFor: prevState.clubsPlayedFor.filter(club => club !== clubIdToRemove)
        }));
    }

    const handleRemovePlayedAgainstClub = (clubIdToRemove: number) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            clubsPlayedAgainst: prevState.clubsPlayedAgainst.filter(club => club !== clubIdToRemove)
        }));
    }

    const handleRemovePlayerName = (nameToRemove: string) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            playerNames: prevState.playerNames.filter(name => name !== nameToRemove)
        }));
    }

    const handleAddPlayerName = () => {
        if (newPlayerName.trim() && !localFilterState.playerNames.includes(newPlayerName.trim())) {
            setLocalFilterState(prevState => ({
                ...prevState,
                playerNames: [...prevState.playerNames, newPlayerName.trim()]
            }));
        }
        setNewPlayerName("");
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAddPlayerName();
            e.preventDefault();
        }
    }

    const handleStatScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const statScope = e.target.value as StatScope;
        const localStatScope = localFilterState.statScope;
        setLocalFilterState(prevState => ({
            ...prevState,
            statScope: statScope
        }));

        // If we move from Overall/Season scope to Game, and currently have an Overall/Season only sort by selected, default to sort by goals
        if (statScope === StatScope.GAME && statScope !== localStatScope && !gameOnlySortOptions.includes(localFilterState.sortBy)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                sortBy: SortOptions.GOALS
            }))
        }
    }

    const applyFilters = () => {
        if (filtersValidated()) {
            onFilterChange(localFilterState);
            onClose();
        }
    };

    const filtersValidated = () => {
        const errors = validateSearchFilters(localFilterState);
        if (errors.length > 0) {
            alert(errors[0]);
            return false;
        }
        return true;
    }

    return (
        <div className={`${styles['filter-drawer']} ${isOpen ? styles['open'] : ''}`}>
            <div className={shared['filter-header']}>
                <div className={shared['filter-title']}><h2>Filter & Sort</h2></div>
                <div className={shared['filter-actions']}>
                    <button className={shared['reset-button']} onClick={resetFilters}>Reset</button>
                    <button className={shared['close-button']} onClick={onClose}>&#10006;</button>
                </div>
            </div>

            <div className={shared['filter-drawer-content']}>
                <SeasonFilterSection
                    selectedSeasons={localFilterState.seasons}
                    onSeasonChange={(e) => updateField('seasons', seasons => toggleArrayValue(seasons, parseInt(e.target.value)))}
                />
                <CompetitionFilterSection
                    selectedCompetitions={localFilterState.competitions}
                    onCompetitionChange={(e) => updateField('competitions', competitions => toggleArrayValue(competitions, e.target.value))}
                />
                <PositionFilterSection
                    selectedPositions={localFilterState.positions}
                    onPositionChange={(e) => updateField('positions', positions => toggleArrayValue(positions, e.target.value))}
                />
                <MinMaxSelectSection
                    title="MINUTES"
                    summaryUnit="'"
                    options={minutes}
                    minLabel="Played from:"
                    maxLabel="Played to:"
                    minValue={localFilterState.minuteFrom}
                    maxValue={localFilterState.minuteTo}
                    onMinChange={(e) => setField('minuteFrom', parseOptionalNumber(e.target.value))}
                    onMaxChange={(e) => setField('minuteTo', parseOptionalNumber(e.target.value))}
                />
                <MinMaxSelectSection
                    title="AGE"
                    options={ages}
                    minLabel="Min age:"
                    maxLabel="Max age:"
                    minValue={localFilterState.minAge}
                    maxValue={localFilterState.maxAge}
                    onMinChange={(e) => setField('minAge', parseOptionalNumber(e.target.value))}
                    onMaxChange={(e) => setField('maxAge', parseOptionalNumber(e.target.value))}
                />
                <MinMaxSelectSection
                    title="HEIGHT"
                    summaryUnit="cm"
                    options={heights}
                    minLabel="Min height (cms):"
                    maxLabel="Max height (cms):"
                    minValue={localFilterState.minHeight}
                    maxValue={localFilterState.maxHeight}
                    onMinChange={(e) => setField('minHeight', parseOptionalNumber(e.target.value))}
                    onMaxChange={(e) => setField('maxHeight', parseOptionalNumber(e.target.value))}
                />
                <PlayerNameFilterSection
                    playerNames={localFilterState.playerNames}
                    inputValue={newPlayerName}
                    onInputChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onRemovePlayerName={handleRemovePlayerName}
                />
                <PlayerCountryFilterSection
                    selectedCountries={localFilterState.playerCountries}
                    query={newCountry}
                    filteredCountries={filteredCountries}
                    onQueryChange={handlePlayerCountryChange}
                    onSelectCountry={handlePlayerCountryClick}
                    onRemoveCountry={handleRemovePlayerCountry}
                />
                <ClubsFilterSection
                    clubsPlayedFor={localFilterState.clubsPlayedFor}
                    clubsPlayedAgainst={localFilterState.clubsPlayedAgainst}
                    playedFor={{
                        query: playedForAutocomplete.query,
                        suggestions: playedForAutocomplete.suggestions,
                        isDropdownVisible: playedForAutocomplete.isDropdownVisible,
                        onQueryChange: (e) => playedForAutocomplete.setQuery(e.target.value),
                        onSuggestionClick: handleClubPlayedForSuggestionClick,
                    }}
                    playedAgainst={{
                        query: playedAgainstAutocomplete.query,
                        suggestions: playedAgainstAutocomplete.suggestions,
                        isDropdownVisible: playedAgainstAutocomplete.isDropdownVisible,
                        onQueryChange: (e) => playedAgainstAutocomplete.setQuery(e.target.value),
                        onSuggestionClick: handleClubPlayedAgainstSuggestionClick,
                    }}
                    onRemovePlayedForClub={handleRemovePlayedForClub}
                    onRemovePlayedAgainstClub={handleRemovePlayedAgainstClub}
                />
                <SubstitutesFilterSection
                    subsOnly={localFilterState.subsOnly}
                    earliestSubOnTime={localFilterState.earliestSubOnTime}
                    latestSubOnTime={localFilterState.latestSubOnTime}
                    onSubsOnlyChange={() => updateField('subsOnly', subsOnly => !subsOnly)}
                    onEarliestSubOnTimeChange={(e) => setField('earliestSubOnTime', parseOptionalNumber(e.target.value))}
                    onLatestSubOnTimeChange={(e) => setField('latestSubOnTime', parseOptionalNumber(e.target.value))}
                />
                <RadioGroupSection
                    title="PENALTIES"
                    options={penaltyOptions}
                    selectedId={localFilterState.penalties}
                    defaultId={PenaltyOptions.INCLUDE_PENALTIES}
                    showDefaultSummary
                    onChange={(e) => setField('penalties', e.target.value as PenaltyOptions)}
                />
                <RadioGroupSection
                    title="HOME OR AWAY"
                    options={homeOrAwayOptions}
                    selectedId={localFilterState.homeOrAway}
                    defaultId={HomeOrAwayOptions.EITHER}
                    showDefaultSummary
                    onChange={(e) => setField('homeOrAway', e.target.value as HomeOrAwayOptions)}
                />
                <SortByFilterSection
                    filterState={localFilterState}
                    onStatScopeChange={handleStatScopeChange}
                    onSortByChange={(e) => setField('sortBy', e.target.value as SortOptions)}
                    onMinimumAppearanceChange={(e) => setField('minimumAppearances', parseOptionalNumber(e.target.value))}
                    onMinimumGoalsChange={(e) => setField('minimumGoals', parseOptionalNumber(e.target.value))}
                    onMaximumGoalsChange={(e) => setField('maximumGoals', parseOptionalNumber(e.target.value))}
                    onMinimumAssistsChange={(e) => setField('minimumAssists', parseOptionalNumber(e.target.value))}
                    onMaximumAssistsChange={(e) => setField('maximumAssists', parseOptionalNumber(e.target.value))}
                    onMinimumGoalsAndAssistsChange={(e) => setField('minimumGoalsAndAssists', parseOptionalNumber(e.target.value))}
                    onMaximumGoalsAndAssistsChange={(e) => setField('maximumGoalsAndAssists', parseOptionalNumber(e.target.value))}
                />
            </div>

            <button className={shared['apply-button']} onClick={applyFilters}>APPLY</button>
        </div>
    );
};

export default SearchFilterBar;
