import {FilterState, minuteBasedSortOptions, SortOptions, StatScope} from "./types";
import React, {useMemo} from "react";
import {competitions} from "./competitions";
import {formatSeason} from "./utils";
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
                sortByTitle += "LEAST MINS PER YELLOW ";
                break;
            case SortOptions.MINUTES_PER_RED:
                sortByTitle += "LEAST MINS PER RED ";
                break;
            default:
                sortByTitle += "TOP SCORERS ";
        }

        if (minuteBasedSortOptions.includes(filterState.sortBy as SortOptions) &&
            filterState.minimumAppearances !== undefined && filterState.minimumAppearances > 0) {
            sortByTitle += "(AT LEAST " + filterState.minimumAppearances + " APPS) ";
        }

        if (filterState.statScope === StatScope.SEASON) {
            sortByTitle += "· SEASON SCOPE "
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
        if (filterState.minuteFrom !== undefined && filterState.minuteFrom > 0) {
            minuteString += " · FROM MINUTE " + filterState.minuteFrom;
        }

        if (filterState.minuteTo !== undefined && filterState.minuteTo > 0) {
            minuteString += " · UP UNTIL MINUTE " + filterState.minuteTo;
        }
        return minuteString;
    }

    const ageTitle = (): string => {
        let ageString = "";
        if (filterState.minAge !== undefined && filterState.minAge > 0) {
            ageString += " · MIN AGE: " + filterState.minAge;
        }

        if (filterState.maxAge !== undefined && filterState.maxAge > 0) {
            ageString += " · MAX AGE: " + filterState.maxAge;
        }
        return ageString;
    }

    const namesTitle = (): string => {
        if (filterState.playerNames.length === 0) {
            return "";
        }

        return " · " + filterState.playerNames.map(name => name.toUpperCase()).join(" OR ");
    }

    const subsTitle = (): string => {
        let subString = "";
        if (!filterState.subsOnly) {
            return subString;
        }

        subString += " · SUBS ONLY";

        if (filterState.earliestSubOnTime !== undefined && filterState.earliestSubOnTime > 0) {
            subString += " · EARLIEST SUB ON TIME: " + filterState.earliestSubOnTime;
        }

        if (filterState.latestSubOnTime !== undefined && filterState.latestSubOnTime > 0) {
            subString += " · LATEST SUB ON TIME: " + filterState.latestSubOnTime;
        }
        return subString;
    }

    const pensTitle = (): string => {
        if (filterState.penalties === "ep") {
            return " · EXCLUDE PENALTIES";
        }

        if (filterState.penalties === "op") {
            return " · ONLY PENALTIES";
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
        title += namesTitle();
        title += subsTitle();
        title += pensTitle();

        return title;
    }, [filterState]);

    return (
        <h4 className="title">
            {constructTitle}
            {filterState.clubsPlayedFor.length > 0 && (
                <>
                    <span style={{marginLeft: '10px'}}> · PLAYED FOR:</span>
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
                    <span> · PLAYED AGAINST:</span>
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