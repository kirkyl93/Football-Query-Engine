import React, {useEffect, useState} from 'react';
import './SearchFilterBar.css';
import {competitions} from "../../../data/Competitions";
import {formatSeason} from "../../../lib/DateUtils";
import {countries, Country} from "../../../data/Countries";
import {
    gameOnlySortOptions,
    HomeOrAwayOptions, minuteBasedSortOptions, numberOfGamesOrSeasonsSortOptions, overallOnlySortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope
} from "../../../types/SearchOptions";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {Club} from "../../../types/Club";

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
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009,
        2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992];


    const positions: string[] = ["GK", "LB", "RB", "CB", "CDM", "LM", "RM", "CM", "CAM", "LW", "RW", "SS", "CF"];

    const ages = Array.from({length: 37}, (_, i) => i + 14);

    const minutes = Array.from({length: 120}, (_, i) => i + 1);

    const heights = Array.from({length: 120}, (_, i) => i + 120);

    const appearances = Array.from({length: 249}, (_, i) => i + 2);

    const season_goals_or_assists = Array.from({length: 50}, (_, i) => i + 1);

    const game_goals_or_assists = Array.from({length: 8}, (_, i) => i + 1);

    const penaltyOptions = [
        {name: "Include penalties", id: PenaltyOptions.INCLUDE_PENALTIES},
        {name: "Exclude penalties", id: PenaltyOptions.EXCLUDE_PENALTIES},
        {name: "Only penalties", id: PenaltyOptions.ONLY_PENALTIES}
    ];

    const homeOrAwayOptions = [
        {name: "Either", id: HomeOrAwayOptions.EITHER},
        {name: "Home", id: HomeOrAwayOptions.HOME},
        {name: "Away", id: HomeOrAwayOptions.AWAY}
    ]

    const sortTypes = [
        {name: "Goals", id: SortOptions.GOALS},
        {name: "Assists", id: SortOptions.ASSISTS},
        {name: "Goals and Assists", id: SortOptions.GOALS_AND_ASSISTS},
        {name: "Appearances", id: SortOptions.APPEARANCES},
        {name: "Minutes played", id: SortOptions.MINUTES_PLAYED},
        {name: "Yellow cards", id: SortOptions.YELLOW_CARDS},
        {name: "Red cards", id: SortOptions.RED_CARDS},
        {name: "Minutes per goal", id: SortOptions.MINUTES_PER_GOAL},
        {name: "Minutes per assist", id: SortOptions.MINUTES_PER_ASSIST},
        {name: "Minutes per goal or assist", id: SortOptions.MINUTES_PER_GOAL_OR_ASSIST},
        {name: "Minutes per yellow card", id: SortOptions.MINUTES_PER_YELLOW},
        {name: "Minutes per red card", id: SortOptions.MINUTES_PER_RED},
        {name: "Number of games with", id: SortOptions.NUMBER_OF_GAMES_WITH},
        {name: "Number of seasons with", id: SortOptions.NUMBER_OF_SEASONS_WITH}
    ];

    const statScopes = [
        {name: "Overall", id: StatScope.OVERALL},
        {name: "Season", id: StatScope.SEASON},
        {name: "Game", id: StatScope.GAME}
    ];


    const [localFilterState, setLocalFilterState] = useState<SearchFilterState>(filterState);
    const [newCountry, setNewCountry] = useState<string>("");
    const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [newClubPlayedFor, setNewClubPlayedFor] = useState<string>("");
    const [newClubsPlayedForSuggestions, setNewClubsPlayedForSuggestions] = useState<Club[]>([]);
    const [isClubsPlayedForDropdownVisible, setIsClubsPlayedForDropdownVisible] = useState<boolean>(false);
    const [newClubPlayedAgainst, setNewClubPlayedAgainst] = useState<string>("");
    const [newClubsPlayedAgainstSuggestions, setNewClubsPlayedAgainstSuggestions] = useState<Club[]>([]);
    const [isClubsPlayedAgainstDropdownVisible, setIsClubsPlayedAgainstDropdownVisible] = useState<boolean>(false);

    const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
    const [isCompetitionsOpen, setIsCompetitionsOpen] = useState(false);
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);
    const [isPositionsOpen, setIsPositionsOpen] = useState(false);
    const [isMinutesOpen, setIsMinutesOpen] = useState(false);
    const [isAgeOpen, setIsAgeOpen] = useState(false);
    const [isHeightOpen, setIsHeightOpen] = useState(false);
    const [isPlayerNameOpen, setIsPlayerNameOpen] = useState(false);
    const [isPlayerCountriesOpen, setIsPlayerCountriesOpen] = useState(false);
    const [isClubsOpen, setIsClubsOpen] = useState(false);
    const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(false);
    const [isPenaltiesOpen, setIsPenaltiesOpen] = useState(false);
    const [isHomeOrAwayOpen, setIsHomeOrAwayOpen] = useState(false);
    const [isSortByOpen, setIsSortByOpen] = useState(false);

    const resetFilters = () => {
        setLocalFilterState({
            seasons: [2024],
            competitions: ['GB1'],
            positions: [],
            minuteFrom: undefined,
            minuteTo: undefined,
            minAge: undefined,
            maxAge: undefined,
            minHeight: undefined,
            maxHeight: undefined,
            playerNames: [],
            playerCountries: [],
            clubsPlayedFor: [],
            clubsPlayedAgainst: [],
            subsOnly: false,
            earliestSubOnTime: undefined,
            latestSubOnTime: undefined,
            penalties: PenaltyOptions.INCLUDE_PENALTIES,
            homeOrAway: HomeOrAwayOptions.EITHER,
            statScope: StatScope.OVERALL,
            sortBy: SortOptions.GOALS,
            minimumAppearances: undefined,
            minimumGoals: undefined,
            maximumGoals: undefined,
            minimumAssists: undefined,
            maximumAssists: undefined,
            minimumGoalsAndAssists: undefined,
            maximumGoalsAndAssists: undefined
        });
        setNewPlayerName("");
        setNewClubPlayedFor("");
        setNewClubPlayedAgainst("");
    };

    const fetchClubSuggestions = async (playedFor: boolean) => {
        try {
            const newClub = playedFor ? newClubPlayedFor.trim() : newClubPlayedAgainst.trim();
            if (newClub.length < 3) {
                return;
            }
            const response = await fetch(`http://localhost:8080/clubs?search_name=${newClub}&page=0&limit=10`);
            const data: Club[] = await response.json();
            playedFor ? setNewClubsPlayedForSuggestions(data) : setNewClubsPlayedAgainstSuggestions(data);
            playedFor ? setIsClubsPlayedForDropdownVisible(true) : setIsClubsPlayedAgainstDropdownVisible(true);
        } catch (error) {
            console.error(`Error fetching suggestions: `, error);
        }
    }

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (newClubPlayedFor.trim()) {
                void fetchClubSuggestions(true);
            } else {
                setNewClubPlayedFor("");
                setNewClubsPlayedForSuggestions([]);
                setIsClubsPlayedForDropdownVisible(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [newClubPlayedFor]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (newClubPlayedAgainst.trim()) {
                void fetchClubSuggestions(false);
            } else {
                setNewClubPlayedAgainst("");
                setNewClubsPlayedAgainstSuggestions([]);
                setIsClubsPlayedAgainstDropdownVisible(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [newClubPlayedAgainst]);

    const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        setLocalFilterState(prevState => ({
            ...prevState,
            seasons: e.target.checked
                ? [...prevState.seasons, value]
                : prevState.seasons.filter(season => season !== value)
        }));
    };

    const handleClubPlayedForSuggestionClick = (suggestion: number) => {
        setNewClubPlayedFor("");
        setIsClubsPlayedForDropdownVisible(false);
        if (localFilterState.clubsPlayedFor !== undefined && !localFilterState.clubsPlayedFor.includes(suggestion)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                clubsPlayedFor: [...prevState.clubsPlayedFor, suggestion]
            }));
        }
    };

    const handleClubPlayedAgainstSuggestionClick = (suggestion: number) => {
        setNewClubPlayedAgainst("");
        setNewClubsPlayedAgainstSuggestions([]);
        setIsClubsPlayedAgainstDropdownVisible(false);
        if (localFilterState.clubsPlayedFor !== undefined && !localFilterState.clubsPlayedFor.includes(suggestion)) {
            setLocalFilterState(prevState => ({
                ...prevState,
                clubsPlayedAgainst: [...prevState.clubsPlayedAgainst, suggestion]
            }));
        }
    };

    const handleCompetitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalFilterState(prevState => ({
            ...prevState,
            competitions: e.target.checked
                ? [...prevState.competitions, value]
                : prevState.competitions.filter(competition => competition !== value)
        }));
    };

    const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalFilterState(prevState => ({
            ...prevState,
            positions: e.target.checked
                ? [...prevState.positions, value]
                : prevState.positions.filter(positions => positions !== value)
        }));

    }

    const handleMinuteFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minuteFrom: e.target.value ? parseInt(e.target.value) : undefined
        }))
    }

    const handleMinuteToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minuteTo: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinimumAppearanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minimumAppearances: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinimumGoalsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minimumGoals: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMaximumGoalsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            maximumGoals: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinimumAssistsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minimumAssists: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMaximumAssistsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            maximumAssists: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinimumGoalsAndAssistsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minimumGoalsAndAssists: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMaximumGoalsAndAssistsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            maximumGoalsAndAssists: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minHeight: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMaxHeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            maxHeight: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMinAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            minAge: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleMaxAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            maxAge: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewPlayerName(e.target.value);
    }

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


    const handleClubPlayedForChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewClubPlayedFor(e.target.value);
    }

    const handleClubPlayedAgainstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewClubPlayedAgainst(e.target.value);
    }

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

    const handleSubsOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            subsOnly: !prevState.subsOnly
        }));
    }


    const handleEarliestSubOnTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            earliestSubOnTime: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handleLatestSubOnTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalFilterState(prevState => ({
            ...prevState,
            latestSubOnTime: e.target.value ? parseInt(e.target.value) : undefined
        }));
    }

    const handlePenaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const penaltyOption = e.target.value as PenaltyOptions;
        setLocalFilterState(prevState => ({
            ...prevState,
            penalties: penaltyOption
        }));
    }

    const handleHomeOrAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const homeOrAwayOption = e.target.value as HomeOrAwayOptions;
        setLocalFilterState(prevState => ({
            ...prevState,
            homeOrAway: homeOrAwayOption
        }));
    }

    const handleSortByChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sortOption = e.target.value as SortOptions;
        setLocalFilterState(prevState => ({
            ...prevState,
            sortBy: sortOption
        }));
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
        if (localFilterState.minAge !== undefined && localFilterState.maxAge !== undefined && localFilterState.minAge > localFilterState.maxAge) {
            alert("Max age should be greater than or equal to Min age");
            return false;
        }

        if (localFilterState.minuteFrom !== undefined && localFilterState.minuteTo !== undefined && localFilterState.minuteFrom > localFilterState.minuteTo) {
            alert("Minute to should be later than or equal to minute from");
            return false;
        }

        if (localFilterState.subsOnly && localFilterState.earliestSubOnTime !== undefined && localFilterState.latestSubOnTime !== undefined &&
            localFilterState.earliestSubOnTime > localFilterState.latestSubOnTime) {
            alert("Latest sub on minute should be later or equal to earliest sub on minute");
            return false;
        }
        return true;
    }

    return (
        <div className={`filter-drawer ${isOpen ? 'open' : ''}`}>
            <div className="filter-header">
                <div className="filter-title"><h2>Filter & Sort</h2></div>
                <div className="filter-actions">
                    <button className="reset-button" onClick={resetFilters}>Reset</button>
                    <button className="close-button" onClick={onClose}>&#10006;</button>
                </div>
            </div>

            <div className="filter-drawer-content">
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}>
                        <span className="title-text">SEASONS</span>
                        <span className="arrow-icon">{isSeasonsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isSeasonsOpen && (
                        <div className="season-group">
                            {seasons.map(season => (
                                <label className="season-checkbox-label" key={season}>
                                    <input
                                        type="checkbox"
                                        value={season}
                                        checked={localFilterState.seasons.includes(season)}
                                        onChange={handleSeasonChange}
                                        className="season-checkbox-input"
                                    />
                                    <span>{formatSeason(season)}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsCompetitionsOpen(!isCompetitionsOpen)}>
                        <span className="title-text">COMPETITIONS</span>
                        <span className="arrow-icon">{isCompetitionsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isCompetitionsOpen && (
                        <div>
                            <div className="sub-dropdown-title" onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                                <span className="title-text">DOMESTIC</span>
                                <span className="arrow-icon">{isLeaguesOpen ? '▲' : '▼'}</span>
                            </div>
                            {isLeaguesOpen && (
                                <div className="checkbox-group-vertical">
                                    {competitions.leagues.map(league => (
                                        <label className="competition-label" key={league.competitionId}>
                                            <input
                                                type="checkbox"
                                                value={league.competitionId}
                                                checked={localFilterState.competitions.includes(league.competitionId)}
                                                onChange={handleCompetitionChange}
                                            />
                                            <img
                                                src={`https://flagcdn.com/w20/${league.countryCode}.png`}
                                                alt={league.name}
                                                className="flag-icon"
                                            />
                                            {league.name}
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="sub-dropdown-title"
                                 onClick={() => setIsEuropeanCompetitionsOpen(!isEuropeanCompetitionsOpen)}>
                                <span className="title-text">EUROPE</span>
                                <span className="arrow-icon">{isEuropeanCompetitionsOpen ? '▲' : '▼'}</span>
                            </div>
                            {isEuropeanCompetitionsOpen && (
                                <div className="checkbox-group-vertical">
                                    {competitions.europeanCompetitions.map(competition => (
                                        <label className="competition-label" key={competition.competitionId}>
                                            <input
                                                type='checkbox'
                                                value={competition.competitionId}
                                                checked={localFilterState.competitions.includes(competition.competitionId)}
                                                onChange={handleCompetitionChange}
                                            />
                                            <img
                                                src={`https://tmssl.akamaized.net/images/logo/header/${encodeURIComponent(competition.competitionId.toLowerCase())}.png`}
                                                alt={competition.name}
                                                className="flag-icon"
                                            />
                                            {competition.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsPositionsOpen(!isPositionsOpen)}>
                        <span className="title-text">POSITIONS</span>
                        <span className="arrow-icon">{isPositionsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isPositionsOpen && (
                        <div className="position-group">
                            {positions.map(position => (
                                <label className="position-checkbox-label" key={position}>
                                    <input
                                        type="checkbox"
                                        value={position}
                                        checked={localFilterState.positions.includes(position)}
                                        onChange={handlePositionChange}
                                        className="position-checkbox-input"
                                    />
                                    {position}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsMinutesOpen(!isMinutesOpen)}>
                        <span className="title-text">MINUTES</span>
                        <span className="arrow-icon">{isMinutesOpen ? '▲' : '▼'}</span>
                    </div>
                    {isMinutesOpen && (
                        <div className="minute-and-age-and-sub-dropdown-group">
                            <label>Played from:</label>
                            <select value={localFilterState.minuteFrom ?? ''} onChange={handleMinuteFromChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>
                            <label>Played to:</label>
                            <select value={localFilterState.minuteTo ?? ''} onChange={handleMinuteToChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsAgeOpen(!isAgeOpen)}>
                        <span className="title-text">AGE</span>
                        <span className="arrow-icon">{isAgeOpen ? '▲' : '▼'}</span>
                    </div>
                    {isAgeOpen && (
                        <div className="minute-and-age-and-sub-dropdown-group">
                            <label>Min age:</label>
                            <select value={localFilterState.minAge ?? ''} onChange={handleMinAgeChange}>
                                <option value="">Any</option>
                                {ages.map(age => (
                                    <option key={age} value={age}>{age}</option>
                                ))}
                            </select>

                            <label>Max age:</label>
                            <select value={localFilterState.maxAge ?? ''} onChange={handleMaxAgeChange}>
                                <option value="">Any</option>
                                {ages.map(age => (
                                    <option key={age} value={age}>{age}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsHeightOpen(!isHeightOpen)}>
                        <span className="title-text">HEIGHT</span>
                        <span className="arrow-icon">{isHeightOpen ? '▲' : '▼'}</span>
                    </div>
                    {isHeightOpen && (
                        <div className="minute-and-age-and-sub-dropdown-group">
                            <label>Min height (cms):</label>
                            <select value={localFilterState.minHeight ?? ''} onChange={handleMinHeightChange}>
                                <option value="">Any</option>
                                {heights.map(height => (
                                    <option key={height} value={height}>{height}</option>
                                ))}
                            </select>

                            <label>Max height (cms):</label>
                            <select value={localFilterState.maxHeight ?? ''} onChange={handleMaxHeightChange}>
                                <option value="">Any</option>
                                {heights.map(height => (
                                    <option key={height} value={height}>{height}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsPlayerNameOpen(!isPlayerNameOpen)}>
                        <span className="title-text">PLAYER NAMES</span>
                        <span className="arrow-icon">{isPlayerNameOpen ? '▲' : '▼'}</span>
                    </div>
                    {isPlayerNameOpen && (
                        <div className="player-name-and-club-dropdown-content">
                            <input
                                type="text"
                                placeholder="Enter player name"
                                value={newPlayerName}
                                onChange={handlePlayerNameChange}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="player-names-and-clubs-list">
                                {localFilterState.playerNames.map((name, index) => (
                                    <span key={index} className="player-name-item">
                                        {name}
                                        <button onClick={() => handleRemovePlayerName(name)}>x</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div
                        className="dropdown-title"
                        onClick={() => setIsPlayerCountriesOpen(!isPlayerCountriesOpen)}
                    >
                        <span className="title-text">PLAYER COUNTRIES</span>
                        <span className="arrow-icon">{isPlayerCountriesOpen ? '▲' : '▼'}</span>
                    </div>
                    {isPlayerCountriesOpen && (
                        <div className="player-name-and-club-dropdown-content">
                            <input
                                type="text"
                                placeholder="Enter country"
                                value={newCountry}
                                onChange={handlePlayerCountryChange}
                            />

                            {filteredCountries.length > 0 && (
                                <ul className="suggestions-dropdown">
                                    {filteredCountries.map((country) => (
                                        <li
                                            key={country.code}
                                            className="suggestion-item"
                                            onClick={() => handlePlayerCountryClick(country)}
                                        >
                                            <img
                                                src={`https://flagcdn.com/w20/${country.code}.png`}
                                                alt={country.name}
                                                className="flag-icon"
                                            />
                                            {country.name}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="player-names-and-clubs-list">
                                {(localFilterState.playerCountries || []).map((country, index) => (
                                    <span key={index} className="player-name-item">
                                        <img
                                            src={`https://flagcdn.com/w20/${country.code}.png`}
                                            alt={country.name}
                                            className="flag-icon"
                                        />
                                        {country.name}
                                        <button
                                            onClick={() => handleRemovePlayerCountry(country.name)}
                                            className="remove-button"
                                        >x</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>


                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsClubsOpen(!isClubsOpen)}>
                        <span className="title-text">CLUBS</span>
                        <span className="arrow-icon">{isClubsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isClubsOpen && (
                        <div className="player-name-and-club-dropdown-content">
                            <input
                                type="text"
                                placeholder="Clubs played for"
                                value={newClubPlayedFor}
                                onChange={handleClubPlayedForChange}
                            />
                            {isClubsPlayedForDropdownVisible && newClubsPlayedForSuggestions.length > 0 && (
                                <ul className="suggestions-dropdown">
                                    {newClubsPlayedForSuggestions.map((suggestion, index) => (
                                        <li key={index}
                                            className="suggestion-item"
                                            onClick={() => handleClubPlayedForSuggestionClick(suggestion.club_id)}
                                        >
                                            <img
                                                style={{width: 30, fontSize: 15}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion.club_id)}.png`}
                                            />
                                            {suggestion.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="player-names-and-clubs-list">
                                {(localFilterState.clubsPlayedFor || []).map((club, index) => (
                                    <span key={index} className="club-name-item">
                                            <img
                                                style={{width: 30}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(club)}.png`}
                                            />
                                            <button onClick={() => handleRemovePlayedForClub(club)}>x</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {isClubsOpen && (
                        <div className="player-name-and-club-dropdown-content">
                            <input
                                type="text"
                                placeholder="Clubs played against"
                                value={newClubPlayedAgainst}
                                onChange={handleClubPlayedAgainstChange}
                            />
                            {isClubsPlayedAgainstDropdownVisible && newClubsPlayedAgainstSuggestions.length > 0 && (
                                <ul className="suggestions-dropdown">
                                    {newClubsPlayedAgainstSuggestions.map((suggestion, index) => (
                                        <li key={index}
                                            className="suggestion-item"
                                            onClick={() => handleClubPlayedAgainstSuggestionClick(suggestion.club_id)}
                                        >
                                            <img
                                                style={{width: 30, fontSize: 15}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion.club_id)}.png`}
                                            />
                                            {suggestion.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="club-names-list">
                                {(localFilterState.clubsPlayedAgainst || []).map((club, index) => (
                                    <span key={index} className="club-name-item">
                                            <img
                                                style={{width: 30}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(club)}.png`}
                                            />
                                            <button onClick={() => handleRemovePlayedAgainstClub(club)}>x</button>
                                        </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSubstitutesOpen(!isSubstitutesOpen)}>
                        <span className="title-text">SUBSTITUTES</span>
                        <span className="arrow-icon">{isSubstitutesOpen ? '▲' : '▼'}</span>
                    </div>
                    {isSubstitutesOpen && (
                        <div className="checkbox-group">
                            <label key="subsOnly">
                                <input
                                    type="checkbox"
                                    value={"subsOnly"}
                                    checked={localFilterState.subsOnly}
                                    onChange={handleSubsOnlyChange}
                                />
                                Substitutes only?
                            </label>
                        </div>
                    )}
                    {isSubstitutesOpen && localFilterState.subsOnly && (
                        <div className="minute-and-age-and-sub-dropdown-group">
                            <label>Earliest minute:</label>
                            <select value={localFilterState.earliestSubOnTime ?? ''}
                                    onChange={handleEarliestSubOnTimeChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>


                            <label>Latest minute:</label>
                            <select value={localFilterState.latestSubOnTime ?? ''}
                                    onChange={handleLatestSubOnTimeChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>
                        </div>
                    )}

                </div>

                <div className='dropdown-section'>
                    <div className="dropdown-title" onClick={() => setIsPenaltiesOpen(!isPenaltiesOpen)}>
                        <span className="title-text">PENALTIES</span>
                        <span className="arrow-icon">{isPenaltiesOpen ? '▲' : '▼'}</span>
                    </div>
                    {isPenaltiesOpen && (
                        <div className='radio-group'>
                            {penaltyOptions.map(option => (
                                <label key={option.id}>
                                    <input
                                        type="radio"
                                        value={option.id}
                                        checked={localFilterState.penalties === option.id}
                                        onChange={handlePenaltyChange}
                                    />
                                    {option.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className='dropdown-section'>
                    <div className="dropdown-title" onClick={() => setIsHomeOrAwayOpen(!isHomeOrAwayOpen)}>
                        <span className="title-text">HOME OR AWAY</span>
                        <span className="arrow-icon">{isHomeOrAwayOpen ? '▲' : '▼'}</span>
                    </div>
                    {isHomeOrAwayOpen && (
                        <div className='radio-group'>
                            {homeOrAwayOptions.map(option => (
                                <label key={option.id}>
                                    <input
                                        type="radio"
                                        value={option.id}
                                        checked={localFilterState.homeOrAway === option.id}
                                        onChange={handleHomeOrAwayChange}
                                    />
                                    {option.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSortByOpen(!isSortByOpen)}>
                        <span className="title-text">SORT BY</span>
                        <span className="arrow-icon">{isSortByOpen ? '▲' : '▼'}</span>
                    </div>
                    {isSortByOpen && (
                        <div className="radio-group">
                            {statScopes.map(score => (
                                <label key={score.id}>
                                    <input
                                        type="radio"
                                        value={score.id}
                                        checked={localFilterState.statScope === score.id}
                                        onChange={handleStatScopeChange}
                                    />
                                    {score.name}
                                </label>
                            ))}
                        </div>
                    )}
                    {isSortByOpen && (
                        <div className="radio-group-vertical">
                            {sortTypes
                                .filter(sort => localFilterState.statScope === StatScope.OVERALL ||
                                    (localFilterState.statScope === StatScope.SEASON && !overallOnlySortOptions.includes(sort.id)) || gameOnlySortOptions.includes(sort.id))
                                .map(sort => (
                                    <label key={sort.id}>
                                        <input
                                            type="radio"
                                            value={sort.id}
                                            checked={localFilterState.sortBy === sort.id}
                                            onChange={handleSortByChange}
                                        />
                                        {sort.name}
                                    </label>
                                ))}
                        </div>
                    )}

                    {isSortByOpen && minuteBasedSortOptions.includes(localFilterState.sortBy as SortOptions) && (
                        <div className="minute-and-age-and-sub-dropdown-group">
                            <label>Minimum Appearances: </label>
                            <select value={localFilterState.minimumAppearances ?? ''}
                                    onChange={handleMinimumAppearanceChange}>
                                <option value="">Any</option>
                                {appearances.map(appearance => (
                                    <option key={appearance} value={appearance}>{appearance}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {isSortByOpen && numberOfGamesOrSeasonsSortOptions.includes(localFilterState.sortBy as SortOptions) && (
                        <>
                            <div className="games_or_seasons-dropdown-group">
                                <label>Minimum Goals: </label>
                                <select value={localFilterState.minimumGoals ?? ''}
                                        onChange={handleMinimumGoalsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>
                                    )) : season_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>))}
                                </select>
                            </div>
                            <div className="games_or_seasons-dropdown-group">
                                <label>Maximum Goals: </label>
                                <select value={localFilterState.maximumGoals ?? ''}
                                        onChange={handleMaximumGoalsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>
                                    )) : season_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>))}
                                </select>
                            </div>
                            <div className="games_or_seasons-dropdown-group">
                                <label>Minimum Assists: </label>
                                <select value={localFilterState.minimumAssists ?? ''}
                                        onChange={handleMinimumAssistsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>
                                    )) : season_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>))}
                                </select>
                            </div>

                            <div className="games_or_seasons-dropdown-group">
                                <label>Maximum Assists: </label>
                                <select value={localFilterState.maximumAssists ?? ''}
                                        onChange={handleMaximumAssistsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>
                                    )) : season_goals_or_assists.map(goal => (
                                        <option key={goal} value={goal}>{goal}</option>))}
                                </select>
                            </div>

                            <div className="games_or_seasons-dropdown-group">
                                <label>Minimum Goals and Assists: </label>
                                <select value={localFilterState.minimumGoalsAndAssists ?? ''}
                                        onChange={handleMinimumGoalsAndAssistsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal_or_assists => (
                                        <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>
                                    )) : season_goals_or_assists.map(goal_or_assists => (
                                        <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>))}
                                </select>
                            </div>

                            <div className="games_or_seasons-dropdown-group">
                                <label>Maximum Goals and Assists: </label>
                                <select value={localFilterState.maximumGoalsAndAssists ?? ''}
                                        onChange={handleMaximumGoalsAndAssistsChange}>
                                    <option value="">Any</option>
                                    {localFilterState.sortBy === SortOptions.NUMBER_OF_GAMES_WITH ? game_goals_or_assists.map(goal_or_assists => (
                                        <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>
                                    )) : season_goals_or_assists.map(goal_or_assists => (
                                        <option key={goal_or_assists} value={goal_or_assists}>{goal_or_assists}</option>))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <button className="apply-button" onClick={applyFilters}>APPLY</button>
            </div>
        </div>
    );
};

export default SearchFilterBar;