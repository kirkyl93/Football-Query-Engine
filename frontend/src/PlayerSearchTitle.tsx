import {
    FilterState,
    HomeOrAwayOptions,
    minuteBasedSortOptions,
    numberOfGamesOrSeasonsSortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope
} from "./types";
import React, {useMemo} from "react";
import {competitions} from "./competitions";
import {formatSeason} from "./dateUtils";
import './PlayerSearchTitle.css'

interface PlayerSearchTitleProps {
    filterState: FilterState;
}

const PlayerSearchTitle: React.FC<PlayerSearchTitleProps> = (
    {
        filterState
    }) => {

    const sortByTitle = (): string => {
        let sortByTitle = "";
        switch (filterState.sortBy) {
            case SortOptions.GOALS:
                sortByTitle += "TOP SCORERS ";
                break;
            case SortOptions.ASSISTS:
                sortByTitle += "MOST ASSISTS ";
                break;
            case SortOptions.GOALS_AND_ASSISTS:
                sortByTitle += "MOST ASSISTS + GOALS ";
                break;
            case SortOptions.APPEARANCES:
                sortByTitle += "MOST APPS ";
                break;
            case SortOptions.MINUTES_PLAYED:
                sortByTitle += "MOST MINS ";
                break;
            case SortOptions.YELLOW_CARDS:
                sortByTitle += "MOST YELLOWS ";
                break;
            case SortOptions.RED_CARDS:
                sortByTitle += "MOST REDS ";
                break;
            case SortOptions.MINUTES_PER_GOAL:
                sortByTitle += "BEST MINS PER GOAL ";
                break;
            case SortOptions.MINUTES_PER_ASSIST:
                sortByTitle += "BEST MINS PER ASSIST ";
                break;
            case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
                sortByTitle += "BEST MINS PER GOAL OR ASSIST ";
                break;
            case SortOptions.MINUTES_PER_YELLOW:
                sortByTitle += "FEWEST MINS PER YELLOW ";
                break;
            case SortOptions.MINUTES_PER_RED:
                sortByTitle += "FEWEST MINS PER RED ";
                break;
            case SortOptions.NUMBER_OF_GAMES_WITH:
                sortByTitle += "MOST GAMES WITH ";
                break;
            case SortOptions.NUMBER_OF_SEASONS_WITH:
                sortByTitle += "MOST SEASONS WITH "
                break;
            default:
                sortByTitle += "TOP SCORERS ";
        }

        if (minuteBasedSortOptions.includes(filterState.sortBy as SortOptions) &&
            (filterState.minimumAppearances ?? 0) > 0) {
            sortByTitle += `(AT LEAST ${filterState.minimumAppearances} APPS) `;
        }

        if (numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy as SortOptions)) {
            const minimumGoals = filterState.minimumGoals ?? 0;
            const maximumGoals = filterState.maximumGoals ?? 0;
            const minimumAssists = filterState.minimumAssists ?? 0;
            const maximumAssists = filterState.maximumAssists ?? 0;

            if (minimumGoals > 0 && maximumGoals > 0) {
                if (minimumGoals === maximumGoals) {
                    sortByTitle += `EXACTLY ${maximumGoals} GOAL${maximumGoals > 1 ? 'S' : ''} `
                } else {
                    sortByTitle += `BETWEEN ${minimumGoals} AND ${maximumGoals} GOALS `
                }
            } else if (minimumGoals > 0) {
                sortByTitle += `AT LEAST ${minimumGoals} GOAL${minimumGoals > 1 ? 'S' : ''} `
            } else if (maximumGoals > 0) {
                sortByTitle += `AT MOST ${maximumGoals} GOAL${maximumGoals > 1 ? 'S' : ''} `
            }

            if ((minimumGoals > 0 || maximumGoals > 0) && (minimumAssists > 0 || maximumAssists > 0)) {
                sortByTitle += `AND `
            }

            if (minimumAssists > 0 && maximumAssists > 0) {
                if (minimumAssists === maximumAssists) {
                    sortByTitle += `EXACTLY ${maximumAssists} ASSIST${maximumAssists > 1 ? `S` : ''} `
                } else {
                    sortByTitle += `BETWEEN ${minimumAssists} AND ${maximumAssists} ASSISTS `
                }
            } else if (minimumAssists > 0) {
                sortByTitle += `AT LEAST ${minimumAssists} ASSIST${minimumAssists > 1 ? 'S' : ''} `
            } else if (maximumAssists > 0) {
                sortByTitle += `AT MOST ${maximumAssists} ASSIST${maximumAssists > 1 ? 'S' : ''} `
            }
        }


        if (filterState.statScope === StatScope.SEASON) {
            sortByTitle += "· SEASON SCOPE "
        }

        if (filterState.statScope === StatScope.GAME) {
            sortByTitle += "· INDIVIDUAL GAME "
        }

        return sortByTitle;
    }

    const competitionsTitle = (): string => {
        if (filterState.competitions.length === 0) {
            return "ALL COMPS";
        }

        if (filterState.competitions.length >= 10) {
            return filterState.competitions.length + " COMPS";
        }

        const competitionNames = filterState.competitions.map(compId => {
            const leagueComp = competitions.leagues.find(comp => comp.competitionId === compId);
            if (leagueComp) {
                return leagueComp.name.toUpperCase();
            }
            const euroComp = competitions.europeanCompetitions.find(comp => comp.competitionId === compId);
            return euroComp ? euroComp.name.toUpperCase() : compId;
        });
        return competitionNames.join(" + ");
    }

    const seasonsTitle = (): string => {
        if (filterState.seasons.length === 0) {
            return "ALL SEASONS";
        }

        if (filterState.seasons.length === 1) {
            return formatSeason(filterState.seasons[0]);
        }

        const seasons = filterState.seasons.sort((a, b) => a - b);
        const isConsecutive = seasons.every((season, index, arr) => index === 0 || season - arr[index - 1] === 1);

        if (isConsecutive) {
            return formatSeason(filterState.seasons[0]) + "-" + formatSeason(filterState.seasons[filterState.seasons.length - 1]);
        }

        if (seasons.length >= 10) {
            return filterState.seasons.length + " SEASONS";
        }

        const formattedSeasons = filterState.seasons.sort((a, b) => a - b).map(season => formatSeason(season));
        return formattedSeasons.join(" · ");
    }

    const positionTitle = (): string => {
        if (filterState.positions.length === 0) {
            return "";
        }

        return " · " + filterState.positions.join(" · ");
    }

    const minsTitle = (): string => {
        let minuteString = "";
        if ((filterState.minuteFrom ?? 0) > 0) {
            minuteString += ` · FROM MINUTE ${filterState.minuteFrom}`;
        }

        if ((filterState.minuteTo ?? 0) > 0) {
            minuteString += ` · UP UNTIL MINUTE ${filterState.minuteTo}`;
        }
        return minuteString;
    }

    const ageTitle = (): string => {
        let ageString = "";
        if ((filterState.minAge ?? 0) > 0) {
            ageString += ` · MIN AGE: ${filterState.minAge}`;
        }

        if ((filterState.maxAge ?? 0) > 0) {
            ageString += ` · MAX AGE: ${filterState.maxAge}`;
        }
        return ageString;
    }

    const heightTitle = (): string => {
        let heightString = "";
        if ((filterState.minHeight ?? 0) > 0) {
            heightString += ` · MIN HEIGHT: ${filterState.minHeight}CMs`;
        }

        if ((filterState.maxHeight ?? 0) > 0) {
            heightString += ` · MAX HEIGHT: ${filterState.maxHeight}CMs`;
        }
        return heightString;
    }

    const namesTitle = (): string => {
        if (filterState.playerNames.length === 0) {
            return "";
        }

        return ` · ${filterState.playerNames.map(name => name.toUpperCase()).join(" OR ")}`;
    }

    const subsTitle = (): string => {
        let subString = "";
        if (!filterState.subsOnly) {
            return subString;
        }

        subString += " · SUBS ONLY";

        if ((filterState.earliestSubOnTime ?? 0) > 0) {
            subString += ` · EARLIEST SUB ON TIME: ${filterState.earliestSubOnTime}`;
        }

        if ((filterState.latestSubOnTime ?? 0) > 0) {
            subString += ` · LATEST SUB ON TIME: " + ${filterState.latestSubOnTime}`;
        }
        return subString;
    }

    const pensTitle = (): string => {
        if (filterState.penalties === PenaltyOptions.EXCLUDE_PENALTIES) {
            return " · EXCLUDE PENALTIES";
        }

        if (filterState.penalties === PenaltyOptions.ONLY_PENALTIES) {
            return " · ONLY PENALTIES";
        }

        return "";
    }

    const homeOrAwayTitle = (): string => {
        if (filterState.homeOrAway === HomeOrAwayOptions.HOME) {
            return " · AT HOME";
        }

        if (filterState.homeOrAway === HomeOrAwayOptions.AWAY) {
            return " · AWAY FROM HOME";
        }

        return "";
    }

    const constructTitle = useMemo((): string => {
        let title = sortByTitle();
        title += "· " + competitionsTitle();
        title += " · " + seasonsTitle();
        title += positionTitle();
        title += minsTitle();
        title += ageTitle();
        title += heightTitle();
        title += namesTitle();
        title += subsTitle();
        title += pensTitle();
        title += homeOrAwayTitle();

        return title;
    }, [filterState]);

    return (
        <h4 className="title">
            {constructTitle}
            {filterState.clubsPlayedFor.length > 0 && (
                <>
                    <span> · PLAYED FOR:</span>
                    {filterState.clubsPlayedFor.length > 10 ? (
                        <span style={{marginLeft: '5px'}}>{filterState.clubsPlayedFor.length} CLUBS SELECTED</span>
                    ) : (
                        filterState.clubsPlayedFor.map(clubId => (
                            <img
                                className="title-badge"
                                key={clubId}
                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                                alt={`Club ${clubId}`}
                            />
                        )))}
                </>
            )}
            {filterState.clubsPlayedAgainst.length > 0 && (
                <>
                    <span>· PLAYED AGAINST:</span>
                    {filterState.clubsPlayedAgainst.length > 10 ? (
                        <span style={{marginLeft: '5px'}}>{filterState.clubsPlayedAgainst.length} CLUBS SELECTED</span>
                    ) : (
                        filterState.clubsPlayedAgainst.map(clubId => (
                            <img
                                className="title-badge"
                                key={clubId}
                                src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(clubId)}.png`}
                                alt={`Club ${clubId}`}
                            />
                        )))}
                </>
            )}
        </h4>
    );
}

export default PlayerSearchTitle;