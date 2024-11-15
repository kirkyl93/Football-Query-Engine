import React, {useEffect, useState} from 'react';
import './FilterSortDrawer.css';
import {competitions} from "./competitions";
import {formatSeason} from "./utils";
import {
    Club,
    FilterState,
    gameOnlySortOptions,
    minuteBasedSortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope
} from "./types";

interface FilterSortDrawerProps {
    isOpen: boolean;
    filterState: FilterState;
    onFilterChange: (filterState: FilterState) => void;
    onClose: () => void;
}

const FilterSortDrawer: React.FC<FilterSortDrawerProps> = (
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

    const appearances = Array.from({length: 249}, (_, i) => i + 2);

    const penaltyOptions = [
        {name: "Include penalties", id: PenaltyOptions.INCLUDE_PENALTIES},
        {name: "Exclude penalties", id: PenaltyOptions.EXCLUDE_PENALTIES},
        {name: "Include only penalties", id: PenaltyOptions.ONLY_PENALTIES}
    ];

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
        {name: "Minutes per red card", id: SortOptions.MINUTES_PER_RED}
    ];

    const statScopes = [
        StatScope.OVERALL, StatScope.SEASON, StatScope.GAME];

    const [localFilterState, setLocalFilterState] = useState<FilterState>(filterState);
    const [newPlayerName, setNewPlayerName] = useState<string>("");
    const [newClubPlayedFor, setNewClubPlayedFor] = useState<string>("");
    const [newClubsPlayedForSuggestions, setNewClubsPlayedForSuggestions] = useState<number[]>([]);
    const [isClubsPlayedForDropdownVisible, setIsClubsPlayedForDropdownVisible] = useState<boolean>(false);
    const [newClubPlayedAgainst, setNewClubPlayedAgainst] = useState<string>("");
    const [newClubsPlayedAgainstSuggestions, setNewClubsPlayedAgainstSuggestions] = useState<number[]>([]);
    const [isClubsPlayedAgainstDropdownVisible, setIsClubsPlayedAgainstDropdownVisible] = useState<boolean>(false);

    const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
    const [isCompetitionsOpen, setIsCompetitionsOpen] = useState(false);
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);
    const [isPositionsOpen, setIsPositionsOpen] = useState(false);
    const [isMinutesOpen, setIsMinutesOpen] = useState(false);
    const [isAgeOpen, setIsAgeOpen] = useState(false);
    const [isPlayerNameOpen, setIsPlayerNameOpen] = useState(false);
    const [isClubsOpen, setIsClubsOpen] = useState(false);
    const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(false);
    const [isPenaltiesOpen, setIsPenaltiesOpen] = useState(false);
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
            playerNames: [],
            clubsPlayedFor: [],
            clubsPlayedAgainst: [],
            subsOnly: false,
            earliestSubOnTime: undefined,
            latestSubOnTime: undefined,
            penalties: PenaltyOptions.INCLUDE_PENALTIES,
            statScope: StatScope.OVERALL,
            sortBy: SortOptions.GOALS,
            minimumAppearances: undefined
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
            playedFor ? setNewClubsPlayedForSuggestions(data.map(club => club.club_id)) : setNewClubsPlayedAgainstSuggestions(data.map(club => club.club_id));
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
            <div className="drawer-header">
                <h2>Filter & Sort</h2>
                <button onClick={resetFilters}>Reset</button>
                <button className="close-button" onClick={onClose}>X</button>
            </div>

            <div className="filter-drawer-content">
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}>
                        Seasons {isSeasonsOpen ? '▲' : '▼'}
                    </div>
                    {isSeasonsOpen && (
                        <div className="season-group">
                            {seasons.map(season => (
                                <label key={season}>
                                    <input
                                        type="checkbox"
                                        value={season}
                                        checked={localFilterState.seasons.includes(season)}
                                        onChange={handleSeasonChange}
                                    />
                                    {formatSeason(season)}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsCompetitionsOpen(!isCompetitionsOpen)}>
                        Competitions {isCompetitionsOpen ? '▲' : '▼'}
                    </div>
                    {isCompetitionsOpen && (
                        <div>
                            <div className="sub-dropdown-title" onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                                Leagues {isLeaguesOpen ? '▲' : '▼'}
                            </div>
                            {isLeaguesOpen && (
                                <div className="checkbox-group">
                                    {competitions.leagues.map(league => (
                                        <label key={league.competitionId}>
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
                                European Competitions {isEuropeanCompetitionsOpen ? '▲' : '▼'}
                            </div>
                            {isEuropeanCompetitionsOpen && (
                                <div className="checkbox-group">
                                    {competitions.europeanCompetitions.map(competition => (
                                        <label key={competition.competitionId}>
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
                        Positions {isPositionsOpen ? '▲' : '▼'}
                    </div>
                    {isPositionsOpen && (
                        <div className="position-group">
                            {positions.map(position => (
                                <label key={position}>
                                    <input
                                        type="checkbox"
                                        value={position}
                                        checked={localFilterState.positions.includes(position)}
                                        onChange={handlePositionChange}
                                    />
                                    {position}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsMinutesOpen(!isMinutesOpen)}>
                        Minutes {isMinutesOpen ? '▲' : '▼'}
                    </div>
                    {isMinutesOpen && (
                        <div className="dropdown-group">
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
                        Age {isAgeOpen ? '▲' : '▼'}
                    </div>
                    {isAgeOpen && (
                        <div className="dropdown-group">
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
                    <div className="dropdown-title" onClick={() => setIsPlayerNameOpen(!isPlayerNameOpen)}>
                        Player names {isPlayerNameOpen ? '▲' : '▼'}
                    </div>
                    {isPlayerNameOpen && (
                        <div className="dropdown-content">
                            <input
                                type="text"
                                placeholder="Enter player name and press Enter"
                                value={newPlayerName}
                                onChange={handlePlayerNameChange}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="player-names-list">
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
                    <div className="dropdown-title" onClick={() => setIsClubsOpen(!isClubsOpen)}>
                        Clubs {isClubsOpen ? '▲' : '▼'}
                    </div>
                    {isClubsOpen && (
                        <div className="dropdown-content">
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
                                            onClick={() => handleClubPlayedForSuggestionClick(suggestion)}
                                        >
                                            <img
                                                style={{width: 20, fontSize: 15}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion)}.png`}
                                            />

                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="club-names-list">
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
                        <div className="dropdown-content">
                            <input
                                style={{marginTop: 10}}
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
                                            onClick={() => handleClubPlayedAgainstSuggestionClick(suggestion)}
                                        >
                                            <img
                                                style={{width: 20, fontSize: 15}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion)}.png`}
                                            />

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
                        Substitutes {isSubstitutesOpen ? '▲' : '▼'}
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
                        <div className="dropdown-group">
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
                        Penalties {isPenaltiesOpen ? '▲' : '▼'}
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

                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSortByOpen(!isSortByOpen)}>
                        Sort By {isSortByOpen ? '▲' : '▼'}
                    </div>
                    {isSortByOpen && (
                        <div className="radio-group">
                            {statScopes.map(score => (
                                <label key={score}>
                                    <input
                                        type="radio"
                                        value={score}
                                        checked={localFilterState.statScope === score}
                                        onChange={handleStatScopeChange}
                                    />
                                    {score}
                                </label>
                            ))}
                        </div>
                    )}
                    {isSortByOpen && (
                        <div className="radio-group">
                            {sortTypes
                                .filter(sort => localFilterState.statScope !== StatScope.GAME || gameOnlySortOptions.includes(sort.id))
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
                        <div className="appearance-dropdown">
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
                </div>

                <button className="apply-button" onClick={applyFilters}>Apply Filters</button>
            </div>
        </div>
    );
};

export default FilterSortDrawer;