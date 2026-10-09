import {competitions} from "../../../data/Competitions";
import {formatSeason} from "../../../lib/DateUtils";
import {SearchFilterState} from "../../../types/SearchFilterState";
import {
    HomeOrAwayOptions,
    minuteBasedSortOptions,
    numberOfGamesOrSeasonsSortOptions,
    PenaltyOptions,
    SortOptions,
    StatScope,
} from "../../../types/SearchOptions";

/**
 * Pure title-string builders for the search header
 */
export const sortByTitle = (filterState: SearchFilterState): string => {
    let title = "";
    switch (filterState.sortBy) {
        case SortOptions.GOALS:
            title += "TOP SCORERS ";
            break;
        case SortOptions.ASSISTS:
            title += "MOST ASSISTS ";
            break;
        case SortOptions.GOALS_AND_ASSISTS:
            title += "MOST ASSISTS + GOALS ";
            break;
        case SortOptions.APPEARANCES:
            title += "MOST APPS ";
            break;
        case SortOptions.MINUTES_PLAYED:
            title += "MOST MINS ";
            break;
        case SortOptions.YELLOW_CARDS:
            title += "MOST YELLOWS ";
            break;
        case SortOptions.RED_CARDS:
            title += "MOST REDS ";
            break;
        case SortOptions.MINUTES_PER_GOAL:
            title += "BEST MINS PER GOAL ";
            break;
        case SortOptions.MINUTES_PER_ASSIST:
            title += "BEST MINS PER ASSIST ";
            break;
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            title += "BEST MINS PER GOAL OR ASSIST ";
            break;
        case SortOptions.MINUTES_PER_YELLOW:
            title += "FEWEST MINS PER YELLOW ";
            break;
        case SortOptions.MINUTES_PER_RED:
            title += "FEWEST MINS PER RED ";
            break;
        case SortOptions.NUMBER_OF_GAMES_WITH:
            title += "MOST GAMES WITH ";
            break;
        case SortOptions.NUMBER_OF_SEASONS_WITH:
            title += "MOST SEASONS WITH "
            break;
        default:
            title += "TOP SCORERS ";
    }

    if (minuteBasedSortOptions.includes(filterState.sortBy as SortOptions) &&
        (filterState.minimumAppearances ?? 0) > 0) {
        title += `(AT LEAST ${filterState.minimumAppearances} APPS) `;
    }

    if (numberOfGamesOrSeasonsSortOptions.includes(filterState.sortBy as SortOptions)) {
        const minimumGoals = filterState.minimumGoals ?? 0;
        const maximumGoals = filterState.maximumGoals ?? 0;
        const minimumAssists = filterState.minimumAssists ?? 0;
        const maximumAssists = filterState.maximumAssists ?? 0;
        const minimumGoalsAndAssists = filterState.minimumGoalsAndAssists ?? 0;
        const maximumGoalsAndAssists = filterState.maximumGoalsAndAssists ?? 0;

        if (minimumGoals > 0 && maximumGoals > 0) {
            if (minimumGoals === maximumGoals) {
                title += `EXACTLY ${maximumGoals} GOAL${maximumGoals > 1 ? 'S' : ''} `
            } else {
                title += `BETWEEN ${minimumGoals} AND ${maximumGoals} GOALS `
            }
        } else if (minimumGoals > 0) {
            title += `AT LEAST ${minimumGoals} GOAL${minimumGoals > 1 ? 'S' : ''} `
        } else if (maximumGoals > 0) {
            title += `AT MOST ${maximumGoals} GOAL${maximumGoals > 1 ? 'S' : ''} `
        }

        if ((minimumGoals > 0 || maximumGoals > 0) && (minimumAssists > 0 || maximumAssists > 0)) {
            title += `AND `
        }

        if (minimumAssists > 0 && maximumAssists > 0) {
            if (minimumAssists === maximumAssists) {
                title += `EXACTLY ${maximumAssists} ASSIST${maximumAssists > 1 ? `S` : ''} `
            } else {
                title += `BETWEEN ${minimumAssists} AND ${maximumAssists} ASSISTS `
            }
        } else if (minimumAssists > 0) {
            title += `AT LEAST ${minimumAssists} ASSIST${minimumAssists > 1 ? 'S' : ''} `
        } else if (maximumAssists > 0) {
            title += `AT MOST ${maximumAssists} ASSIST${maximumAssists > 1 ? 'S' : ''} `
        }

        if (minimumGoals > 0 || maximumGoals > 0 || minimumAssists > 0 || maximumAssists > 0) {
            title += `AND `
        }

        if (minimumGoalsAndAssists > 0 && maximumGoalsAndAssists > 0) {
            if (minimumGoalsAndAssists === maximumGoalsAndAssists) {
                title += `EXACTLY ${maximumGoalsAndAssists} GOAL${maximumGoalsAndAssists > 1 ? `S` : ''} AND ASSIST${maximumGoalsAndAssists > 1 ? `S` : ''} `
            }
        } else if (minimumGoalsAndAssists > 0) {
            title += `AT LEAST ${minimumGoalsAndAssists} GOAL${minimumGoalsAndAssists > 1 ? `S` : ''} AND ASSIST${minimumGoalsAndAssists > 1 ? `S` : ''} `
        } else if (maximumAssists > 0) {
            title += `AT MOST ${minimumGoalsAndAssists} GOAL${maximumGoalsAndAssists > 1 ? `S` : ''} AND ASSIST${maximumGoalsAndAssists > 1 ? `S` : ''} `
        }
    }


    if (filterState.statScope === StatScope.SEASON) {
        title += "· SEASON SCOPE "
    }

    if (filterState.statScope === StatScope.GAME) {
        title += "· INDIVIDUAL GAME "
    }

    return title;
}

export const competitionsTitle = (filterState: SearchFilterState): string => {
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

export const seasonsTitle = (filterState: SearchFilterState): string => {
    if (filterState.seasons.length === 0) {
        return "ALL SEASONS";
    }

    if (filterState.seasons.length === 1) {
        return formatSeason(filterState.seasons[0]);
    }

    const seasons = [...filterState.seasons].sort((a, b) => a - b);
    const isConsecutive = seasons.every((season, index, arr) => index === 0 || season - arr[index - 1] === 1);

    if (isConsecutive) {
        return formatSeason(seasons[0]) + "-" + formatSeason(seasons[seasons.length - 1]);
    }

    if (seasons.length >= 10) {
        return seasons.length + " SEASONS";
    }

    const formattedSeasons = seasons.map(season => formatSeason(season));
    return formattedSeasons.join(" · ");
}

export const positionTitle = (filterState: SearchFilterState): string => {
    if (filterState.positions.length === 0) {
        return "";
    }

    return " · " + filterState.positions.join(" · ");
}

export const minsTitle = (filterState: SearchFilterState): string => {
    let minuteString = "";
    if ((filterState.minuteFrom ?? 0) > 0) {
        minuteString += ` · FROM MINUTE ${filterState.minuteFrom}`;
    }

    if ((filterState.minuteTo ?? 0) > 0) {
        minuteString += ` · UP UNTIL MINUTE ${filterState.minuteTo}`;
    }
    return minuteString;
}

export const ageTitle = (filterState: SearchFilterState): string => {
    let ageString = "";
    if ((filterState.minAge ?? 0) > 0) {
        ageString += ` · MIN AGE: ${filterState.minAge}`;
    }

    if ((filterState.maxAge ?? 0) > 0) {
        ageString += ` · MAX AGE: ${filterState.maxAge}`;
    }
    return ageString;
}

export const heightTitle = (filterState: SearchFilterState): string => {
    let heightString = "";
    if ((filterState.minHeight ?? 0) > 0) {
        heightString += ` · MIN HEIGHT: ${filterState.minHeight}CMs`;
    }

    if ((filterState.maxHeight ?? 0) > 0) {
        heightString += ` · MAX HEIGHT: ${filterState.maxHeight}CMs`;
    }
    return heightString;
}

export const namesTitle = (filterState: SearchFilterState): string => {
    if (filterState.playerNames.length === 0) {
        return "";
    }

    return ` · ${filterState.playerNames.map(name => name.toUpperCase()).join(" OR ")}`;
}

export const countriesTitle = (filterState: SearchFilterState): string => {
    if (filterState.playerCountries.length === 0) {
        return "";
    }

    return ` · ${filterState.playerCountries.map(country => country.name.toUpperCase()).join(" OR ")}`;
}

export const subsTitle = (filterState: SearchFilterState): string => {
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

export const pensTitle = (filterState: SearchFilterState): string => {
    if (filterState.penalties === PenaltyOptions.EXCLUDE_PENALTIES) {
        return " · EXCLUDE PENALTIES";
    }

    if (filterState.penalties === PenaltyOptions.ONLY_PENALTIES) {
        return " · ONLY PENALTIES";
    }

    return "";
}

export const homeOrAwayTitle = (filterState: SearchFilterState): string => {
    if (filterState.homeOrAway === HomeOrAwayOptions.HOME) {
        return " · AT HOME";
    }

    if (filterState.homeOrAway === HomeOrAwayOptions.AWAY) {
        return " · AWAY FROM HOME";
    }

    return "";
}

export const constructSearchTitle = (filterState: SearchFilterState): string => {
    let title = sortByTitle(filterState);
    title += "· " + competitionsTitle(filterState);
    title += " · " + seasonsTitle(filterState);
    title += positionTitle(filterState);
    title += minsTitle(filterState);
    title += ageTitle(filterState);
    title += heightTitle(filterState);
    title += namesTitle(filterState);
    title += countriesTitle(filterState);
    title += subsTitle(filterState);
    title += pensTitle(filterState);
    title += homeOrAwayTitle(filterState);

    return title;
}
