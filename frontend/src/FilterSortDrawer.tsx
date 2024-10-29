import React, { useEffect, useState } from 'react';
import './FilterSortDrawer.css';
import { competitions } from "./competitions";
import {formatSeason} from "./utils";

interface FilterSortDrawerProps {
    isOpen: boolean;
    selectedSeasons: number[];
    selectedCompetitions: string[];
    selectedPositions: string[];
    minuteFrom: number | undefined,
    minuteTo: number | undefined,
    minAge: number | undefined,
    maxAge: number | undefined,
    playerName: string | undefined,
    subsOnly: boolean;
    earliestSubOnTime: number | undefined,
    latestSubOnTime: number | undefined,
    penalties: string,
    sortBy: string;
    onFilterChange: (seasons: number[], competitions: string[], positions: string[],  minuteFrom: number | undefined, minuteTo: number | undefined,
        minAge: number | undefined, maxAge: number | undefined, playerName: string | undefined, subsOnly: boolean, earliestSubOnTime: number | undefined,
        latestSubOnTime: number | undefined, penalties: string, sortBy: string) => void;
    onClose: () => void;
}

const FilterSortDrawer: React.FC<FilterSortDrawerProps> = ({
    isOpen,
    selectedSeasons,
    selectedCompetitions,
    selectedPositions,
    minuteFrom,
    minuteTo,
    minAge,
    maxAge,
    playerName,
    subsOnly,
    earliestSubOnTime,
    latestSubOnTime,
    penalties,
    sortBy,
    onFilterChange,
    onClose,
}) => {
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009,
        2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992];


    const positions: string[] = ["GK", "LB", "RB", "CB", "CDM", "LM", "RM", "CM", "CAM", "LW", "RW", "SS", "CF"];

    const ages = Array.from({ length: 37 }, (_, i) => i + 14);

    const minutes = Array.from({ length: 120 }, (_, i) => i + 1);

    const penaltyOptions = [
        { name: "Include penalties", id: "ip" },
        { name: "Exclude penalties", id: "ep" },
        { name: "Include only penalties", id: "op" }
    ];

    const sortTypes = [
        { name: "Goals", id: "g"},
        { name: "Assists", id: "a"},
        { name: "Goals and Assists", id: "ga"},
        { name: "Appearances", id: "ap"}, 
        { name: "Minutes played", id: "m"},
        { name: "Yellow cards", id: "y"},
        { name: "Red cards", id: "r"}
    ];

    const [localSelectedSeasons, setLocalSelectedSeasons] = useState<number[]>(selectedSeasons);
    const [localSelectedCompetitions, setLocalSelectedCompetitions] = useState<string[]>(selectedCompetitions);
    const [localSelectedPositions, setLocalSelectedPositions] = useState<string[]>(selectedPositions);
    const [localMinuteFrom, setLocalMinuteFrom] = useState<number | undefined>(minuteFrom);
    const [localMinuteTo, setLocalMinuteTo] = useState<number | undefined>(minuteTo);
    const [localMinAge, setLocalMinAge] = useState<number | undefined>(minAge);
    const [localMaxAge, setLocalMaxAge] = useState<number | undefined>(maxAge);
    const [localPlayerName, setLocalPlayerName] = useState<string | undefined>(playerName);
    const [localSubsOnly, setLocalSubsOnly] = useState<boolean>(subsOnly);
    const [localEarliestSubOnTime, setLocalEarliestSubOnTime] = useState<number | undefined>(earliestSubOnTime);
    const [localLatestSubOnTime, setLocalLatestSubOnTime] = useState<number | undefined>(latestSubOnTime);
    const [localPenalties, setLocalPenalties] = useState<string>(penalties);
    const [localSortBy, setLocalSortBy] = useState<string>(sortBy);

    const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
    const [isCompetitionsOpen, setIsCompetitionsOpen] = useState(false);
    const [isLeaguesOpen, setIsLeaguesOpen] = useState(false);
    const [isEuropeanCompetitionsOpen, setIsEuropeanCompetitionsOpen] = useState(false);
    const [isPositionsOpen, setIsPositionsOpen] = useState(false);
    const [isMinutesOpen, setIsMinutesOpen] = useState(false);
    const [isAgeOpen, setIsAgeOpen] = useState(false);
    const [isPlayerNameOpen, setIsPlayerNameOpen] = useState(false);
    const [isSubstitutesOpen, setIsSubstitutesOpen] = useState(false);
    const [isPenaltiesOpen, setIsPenaltiesOpen] = useState(false);
    const [isSortByOpen, setIsSortByOpen] = useState(false);

    const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (e.target.checked) {
            setLocalSelectedSeasons(prev => [...prev, value]);
        } else {
            setLocalSelectedSeasons(prev => prev.filter(season => season !== value));
        }
    };

    const handleCompetitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (e.target.checked) {
            setLocalSelectedCompetitions(prev => [...prev, value]);
        } else {
            setLocalSelectedCompetitions(prev => prev.filter(competition => competition !== value));
        }
    };

    const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (e.target.checked) {
            setLocalSelectedPositions(prev => [...prev, value]);
        } else {
            setLocalSelectedPositions(prev => prev.filter(position => position !== value));
        }
    }

    const handleMinuteFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalMinuteFrom(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handleMinuteToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalMinuteTo(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handleMinAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalMinAge(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handleMaxAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalMaxAge(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPlayerName(e.target.value);
    }

    const handleSubsOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSubsOnly(!localSubsOnly);
    }

    const handleEarliestSubOnTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalEarliestSubOnTime(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handleLatestSubOnTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalLatestSubOnTime(e.target.value ? parseInt(e.target.value) : undefined);
    }

    const handlePenaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPenalties(e.target.value);
    }

    const handleSortByChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSortBy(e.target.value);
    }

    const applyFilters = () => {
        if (filtersValidated()) {
            onFilterChange(localSelectedSeasons, localSelectedCompetitions, localSelectedPositions, localMinuteFrom, localMinuteTo,
                localMinAge, localMaxAge, localPlayerName, localSubsOnly, localEarliestSubOnTime, localLatestSubOnTime, localPenalties, localSortBy);
            onClose();
        }
    };

    const filtersValidated = () => {
        if (localMinAge !== undefined && localMaxAge !== undefined && localMinAge > localMaxAge) {
            alert("Max age should be greater than or equal to Min age");
            return false;
        }

        if (localMinuteFrom !== undefined && localMinuteTo !== undefined && localMinuteFrom > localMinuteTo) {
            alert("Minute to should be later than or equal to minute from");
            return false;
        }

        if (localSubsOnly && localEarliestSubOnTime !== undefined && localLatestSubOnTime !== undefined && localEarliestSubOnTime > localLatestSubOnTime) {
            alert("Latest sub on minute should be later or equal to earliest sub on minute");
            return false;
        }
        return true;
    }

    return (
        <div className={`filter-drawer ${isOpen ? 'open' : ''}`}>
            <div className="drawer-header">
                <h2>Filter & Sort</h2>
                <button className="close-button" onClick={onClose}>X</button>
            </div>

            <div className="filter-drawer-content">
                <div className="dropdown-section">
                    <div className="dropdown-title" onClick={() => setIsSeasonsOpen(!isSeasonsOpen)}>
                        Seasons {isSeasonsOpen ? '▲' : '▼'}
                    </div>
                    {isSeasonsOpen && (
                        <div className="checkbox-group">
                            {seasons.map(season => (
                                <label key={season}>
                                    <input
                                        type="checkbox"
                                        value={season}
                                        checked={localSelectedSeasons.includes(season)}
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
                                                checked={localSelectedCompetitions.includes(league.competitionId)}
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
                                                checked={localSelectedCompetitions.includes(competition.competitionId)}
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
                        <div className="checkbox-group">
                            {positions.map(position => (
                                <label key={position}>
                                    <input
                                        type="checkbox"
                                        value={position}
                                        checked={localSelectedPositions.includes(position)}
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
                            <select value={localMinuteFrom ?? ''} onChange={handleMinuteFromChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>

                            <label>Played to:</label>
                            <select value={localMinuteTo ?? ''} onChange={handleMinuteToChange}>
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
                            <select value={localMinAge ?? ''} onChange={handleMinAgeChange}>
                                <option value="">Any</option>
                                {ages.map(age => (
                                    <option key={age} value={age}>{age}</option>
                                ))}
                            </select>

                            <label>Max age:</label>
                            <select value={localMaxAge ?? ''} onChange={handleMaxAgeChange}>
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
                        Player name {isPlayerNameOpen ? '▲' : '▼'}
                    </div>
                    {isPlayerNameOpen && (
                        <div className="dropdown-content">
                            <input
                                type="text"
                                placeholder="Enter player name"
                                value={playerName}
                                onChange={handlePlayerNameChange}
                                />
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
                                    checked={localSubsOnly}
                                    onChange={handleSubsOnlyChange}
                                />
                                Substitutes only?
                            </label>
                        </div>
                    )}
                    {isSubstitutesOpen && localSubsOnly && (
                        <div className="dropdown-group">
                            <label>Earliest minute:</label>
                            <select value={localEarliestSubOnTime ?? ''} onChange={handleEarliestSubOnTimeChange}>
                                <option value="">Any</option>
                                {minutes.map(minute => (
                                    <option key={minute} value={minute}>{minute}</option>
                                ))}
                            </select>


                            <label>Latest minute:</label>
                            <select value={localLatestSubOnTime ?? ''} onChange={handleLatestSubOnTimeChange}>
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
                                        checked={localPenalties === option.id}
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
                            {sortTypes.map(sort => (
                                <label key={sort.id}>
                                    <input
                                        type="radio"
                                        value={sort.id}
                                        checked={localSortBy === sort.id}
                                        onChange={handleSortByChange}
                                    />
                                    {sort.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <button className="apply-button" onClick={applyFilters}>Apply Filters</button>
            </div>
        </div>
    );
};

export default FilterSortDrawer;