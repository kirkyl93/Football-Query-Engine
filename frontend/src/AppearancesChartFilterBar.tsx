import React, {useEffect, useState} from "react";
import './AppearancesChartFilterBar.css';
import {
    EventType,
    HomeOrAwayOptions,
    PlayerFilterState,
    PlayerSeasonsCompetitionsAndClubs
} from "./types";
import {formatSeason} from "./dateUtils";
import {competitions} from "./competitions";
import {getColour, hexToRGB} from "./colourUtil";

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
    const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
    const [isCompetitionsOpen, setIsCompetitionsOpen] = useState(false);
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);
    const [isClubsPlayedForOpen, setIsClubsPlayedForOpen] = useState(false);
    const [isClubsPlayedAgainstOpen, setIsClubsPlayedAgainstOpen] = useState(false);
    const [newClubPlayedAgainst, setNewClubPlayedAgainst] = useState<string>("");
    const [newClubsPlayedAgainstSuggestions, setNewClubsPlayedAgainstSuggestions] = useState<[number, string][]>([]);
    const [isClubsPlayedAgainstDropdownVisible, setIsClubsPlayedAgainstDropdownVisible] = useState<boolean>(false);
    const [isHomeOrAwayOpen, setIsHomeOrAwayOpen] = useState(false);
    const [isEventsOpen, setIsEventsOpen] = useState(false);

    const homeOrAwayOptions = [
        {name: "Either", id: HomeOrAwayOptions.EITHER},
        {name: "Home", id: HomeOrAwayOptions.HOME},
        {name: "Away", id: HomeOrAwayOptions.AWAY}
    ]

    const eventTypeOptions = [
        {eventType: EventType.Goals, colour: "blue"},
        {eventType: EventType.Penalties, colour: "gold"},
        {eventType: EventType.Assists, colour: "green"},
        {eventType: EventType.Yellows, colour: "yellow"},
        {eventType: EventType.Reds, colour: "red"},
    ]

    useEffect(() => {
        setLocalFilterState(playerFilterState);
    }, [playerFilterState]);

    const resetFilters = () => {
        setLocalFilterState(prev => ({
            ...prev,
            selectedSeasons: [playerSeasonsCompetitionsAndClubs.seasons[playerSeasonsCompetitionsAndClubs.seasons.length - 1]],
            selectedCompetitions: [],
            selectedClubsPlayedFor: [],
            selectedClubsPlayedAgainst: [],
            selectedHomeOrAway: HomeOrAwayOptions.EITHER,
            selectedEvents: {
                [EventType.Goals]: false,
                [EventType.Penalties]: false,
                [EventType.Assists]: false,
                [EventType.Yellows]: false,
                [EventType.Reds]: false
        }
        }));
    };

    const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        setLocalFilterState(prevState => ({
            ...prevState,
            selectedSeasons: e.target.checked
                ? [...prevState.selectedSeasons, value]
                : prevState.selectedSeasons.filter(season => season !== value)
        }));
    };

    const handleCompetitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalFilterState(prevState => ({
            ...prevState,
            selectedCompetitions: e.target.checked
                ? [...prevState.selectedCompetitions, value]
                : prevState.selectedCompetitions.filter(competition => competition !== value)
        }));
    };

    const handleClubsPlayedForChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setLocalFilterState(prevState => ({
            ...prevState,
            selectedClubsPlayedFor: e.target.checked
                ? [...prevState.selectedClubsPlayedFor, value]
                : prevState.selectedClubsPlayedFor.filter(club => club !== value)
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

    const handleHomeOrAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const homeOrAwayOption = e.target.value as HomeOrAwayOptions;
        setLocalFilterState(prevState => ({
            ...prevState,
            selectedHomeOrAway: homeOrAwayOption
        }));
    }

    const handleClubPlayedAgainstSuggestionClick = (suggestion: number) => {
        setNewClubPlayedAgainst("");
        setNewClubsPlayedAgainstSuggestions([]);
        setIsClubsPlayedAgainstDropdownVisible(false);
        if (localFilterState.selectedClubsPlayedFor !== undefined && !localFilterState.selectedClubsPlayedAgainst.includes(suggestion)) {
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

    const isEventSelected = (event: EventType) => localFilterState.selectedEvents[event];

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
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}>
                        <span className="title-text">SEASONS</span>
                        <span className="arrow-icon">{isSeasonsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isSeasonsOpen && (
                        <div className="season-group">
                            {playerSeasonsCompetitionsAndClubs.seasons.map(season => (
                                <label className="season-checkbox-label" key={season}>
                                    <input
                                        type="checkbox"
                                        value={season}
                                        checked={localFilterState?.selectedSeasons.includes(season)}
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
                            {playerSeasonsCompetitionsAndClubs.leagueCompetitions.length > 0 && (
                                <div className="sub-dropdown-title" onClick={() => setIsLeaguesOpen(!isLeaguesOpen)}>
                                    <span className="title-text">DOMESTIC</span>
                                    <span className="arrow-icon">{isLeaguesOpen ? '▲' : '▼'}</span>
                                </div>
                            )}
                            {isLeaguesOpen && playerSeasonsCompetitionsAndClubs.leagueCompetitions.length > 0 && (
                                <div className="checkbox-group-vertical">
                                    {playerSeasonsCompetitionsAndClubs.leagueCompetitions.map(league => {
                                        const leagueComp = competitions.leagues.find(comp => comp.name === league);
                                        if (!leagueComp) {
                                            return;
                                        }
                                        return (
                                            <label className="competition-label" key={leagueComp.competitionId}>
                                                <input
                                                    type="checkbox"
                                                    value={leagueComp.name}
                                                    checked={localFilterState.selectedCompetitions.includes(leagueComp.name)}
                                                    onChange={handleCompetitionChange}
                                                />
                                                <img
                                                    src={`https://flagcdn.com/w20/${leagueComp.countryCode}.png`}
                                                    alt={leagueComp.name}
                                                    className="flag-icon"
                                                />
                                                {leagueComp.name}
                                            </label>
                                        )
                                    })}
                                </div>
                            )}

                            {playerSeasonsCompetitionsAndClubs.europeanCompetitions.length > 0 && (
                                <div className="sub-dropdown-title"
                                     onClick={() => setIsEuropeanCompetitionsOpen(!isEuropeanCompetitionsOpen)}>
                                    <span className="title-text">EUROPE</span>
                                    <span className="arrow-icon">{isEuropeanCompetitionsOpen ? '▲' : '▼'}</span>
                                </div>
                            )}
                            {isEuropeanCompetitionsOpen && playerSeasonsCompetitionsAndClubs.europeanCompetitions.length > 0 && (
                                <div className="checkbox-group-vertical">
                                    {playerSeasonsCompetitionsAndClubs.europeanCompetitions.map(comp => {
                                        const europeComp = competitions.europeanCompetitions.find(euroComp => euroComp.name === comp);
                                        if (!europeComp) {
                                            return;
                                        }
                                        return (
                                            <label className="competition-label" key={europeComp.competitionId}>
                                                <input
                                                    type='checkbox'
                                                    value={europeComp.name}
                                                    checked={localFilterState.selectedCompetitions.includes(europeComp.name)}
                                                    onChange={handleCompetitionChange}
                                                />
                                                <img
                                                    src={`https://tmssl.akamaized.net/images/logo/header/${encodeURIComponent(europeComp.competitionId.toLowerCase())}.png`}
                                                    alt={europeComp.name}
                                                    className="flag-icon"
                                                />
                                                {europeComp.name}
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsClubsPlayedForOpen(!isClubsPlayedForOpen)}>
                        <span className="title-text">CLUBS PLAYED FOR</span>
                        <span className="arrow-icon">{isClubsPlayedForOpen ? '▲' : '▼'}</span>
                    </div>
                    {isClubsPlayedForOpen && (
                        <div className="checkbox-group-vertical">
                            {playerSeasonsCompetitionsAndClubs.clubsPlayedFor.map(club => (
                                <label className="club-label"
                                       style={{
                                           backgroundColor: hexToRGB(getColour(club[0]), 0.25),
                                        }}
                                       key={club[0]}>
                                    <input
                                        type="checkbox"
                                        value={club[0]}
                                        checked={localFilterState?.selectedClubsPlayedFor.includes(club[0])}
                                        onChange={handleClubsPlayedForChange}
                                    />
                                    <img
                                        style={{width: 30, fontSize: 15, marginRight: "5px"}}
                                        alt="Badge of football team selected"
                                        src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(club[0])}.png`}
                                    />
                                    {club[1]}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="dropdown-section">
                    <div className="dropdown-title"
                         onClick={() => setIsClubsPlayedAgainstOpen(!isClubsPlayedAgainstOpen)}>
                        <span className="title-text">CLUBS PLAYED AGAINST</span>
                        <span className="arrow-icon">{isClubsPlayedAgainstOpen ? '▲' : '▼'}</span>
                    </div>
                    {isClubsPlayedAgainstOpen && (
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
                                            onClick={() => handleClubPlayedAgainstSuggestionClick(suggestion[0])}
                                        >
                                            <img
                                                style={{width: 30, fontSize: 15}}
                                                alt="Badge of football team selected"
                                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(suggestion[0])}.png`}
                                            />
                                            {suggestion[1]}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="club-names-list">
                                {(localFilterState.selectedClubsPlayedAgainst || []).map((club, index) => (
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
                                        checked={localFilterState.selectedHomeOrAway === option.id}
                                        onChange={handleHomeOrAwayChange}
                                    />
                                    {option.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsEventsOpen(!isEventsOpen)}>
                        <span className="title-text">EVENTS</span>
                        <span className="arrow-icon">{isEventsOpen ? '▲' : '▼'}</span>
                    </div>
                    {isEventsOpen && (
                        <div className="checkbox-group-vertical">
                            {eventTypeOptions.map(event => (
                                <label className="club-label" key={event.eventType}>
                                    <input
                                        type="checkbox"
                                        value={event.eventType}
                                        checked={isEventSelected(event.eventType)}
                                        onChange={handleEventSelectionChange}
                                    />
                                    <span className="square" style={{backgroundColor: event.colour}}></span> {event.eventType}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button className="apply-button" onClick={applyFilters}>APPLY</button>

        </div>
    )
}

export default AppearancesChartFilterBar