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
            title += "Top Scorers ";
            break;
        case SortOptions.ASSISTS:
            title += "Most Assists ";
            break;
        case SortOptions.GOALS_AND_ASSISTS:
            title += "Most Assists + Goals ";
            break;
        case SortOptions.APPEARANCES:
            title += "Most Apps ";
            break;
        case SortOptions.MINUTES_PLAYED:
            title += "Most Mins ";
            break;
        case SortOptions.YELLOW_CARDS:
            title += "Most Yellows ";
            break;
        case SortOptions.RED_CARDS:
            title += "Most Reds ";
            break;
        case SortOptions.MINUTES_PER_GOAL:
            title += "Best Mins Per Goal ";
            break;
        case SortOptions.MINUTES_PER_ASSIST:
            title += "Best Mins Per Assist ";
            break;
        case SortOptions.MINUTES_PER_GOAL_OR_ASSIST:
            title += "Best Mins Per Goal Or Assist ";
            break;
        case SortOptions.MINUTES_PER_YELLOW:
            title += "Fewest Mins Per Yellow ";
            break;
        case SortOptions.MINUTES_PER_RED:
            title += "Fewest Mins Per Red ";
            break;
        case SortOptions.NUMBER_OF_GAMES_WITH:
            title += "Most Games With ";
            break;
        case SortOptions.NUMBER_OF_SEASONS_WITH:
            title += "Most Seasons With "
            break;
        default:
            title += "Top Scorers ";
    }

    if (minuteBasedSortOptions.includes(filterState.sortBy as SortOptions) &&
        (filterState.minimumAppearances ?? 0) > 0) {
        title += `(At Least ${filterState.minimumAppearances} Apps) `;
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
                title += `Exactly ${maximumGoals} Goal${maximumGoals > 1 ? 's' : ''} `
            } else {
                title += `Between ${minimumGoals} And ${maximumGoals} Goals `
            }
        } else if (minimumGoals > 0) {
            title += `At Least ${minimumGoals} Goal${minimumGoals > 1 ? 's' : ''} `
        } else if (maximumGoals > 0) {
            title += `At Most ${maximumGoals} Goal${maximumGoals > 1 ? 's' : ''} `
        }

        if ((minimumGoals > 0 || maximumGoals > 0) && (minimumAssists > 0 || maximumAssists > 0)) {
            title += `And `
        }

        if (minimumAssists > 0 && maximumAssists > 0) {
            if (minimumAssists === maximumAssists) {
                title += `Exactly ${maximumAssists} Assist${maximumAssists > 1 ? `s` : ''} `
            } else {
                title += `Between ${minimumAssists} And ${maximumAssists} Assists `
            }
        } else if (minimumAssists > 0) {
            title += `At Least ${minimumAssists} Assist${minimumAssists > 1 ? 's' : ''} `
        } else if (maximumAssists > 0) {
            title += `At Most ${maximumAssists} Assist${maximumAssists > 1 ? 's' : ''} `
        }

        if (minimumGoals > 0 || maximumGoals > 0 || minimumAssists > 0 || maximumAssists > 0) {
            title += `And `
        }

        if (minimumGoalsAndAssists > 0 && maximumGoalsAndAssists > 0) {
            if (minimumGoalsAndAssists === maximumGoalsAndAssists) {
                title += `Exactly ${maximumGoalsAndAssists} Goal${maximumGoalsAndAssists > 1 ? `s` : ''} And Assist${maximumGoalsAndAssists > 1 ? `s` : ''} `
            }
        } else if (minimumGoalsAndAssists > 0) {
            title += `At Least ${minimumGoalsAndAssists} Goal${minimumGoalsAndAssists > 1 ? `s` : ''} And Assist${minimumGoalsAndAssists > 1 ? `s` : ''} `
        } else if (maximumAssists > 0) {
            title += `At Most ${minimumGoalsAndAssists} Goal${maximumGoalsAndAssists > 1 ? `s` : ''} And Assist${maximumGoalsAndAssists > 1 ? `s` : ''} `
        }
    }


    if (filterState.statScope === StatScope.SEASON) {
        title += "· Season Scope "
    }

    if (filterState.statScope === StatScope.GAME) {
        title += "· Individual Game "
    }

    return title;
}

export const competitionsTitle = (filterState: SearchFilterState): string => {
    if (filterState.competitions.length === 0) {
        return "All Comps";
    }

    if (filterState.competitions.length >= 10) {
        return filterState.competitions.length + " Comps";
    }

    const competitionNames = filterState.competitions.map(compId => {
        const leagueComp = competitions.leagues.find(comp => comp.competitionId === compId);
        if (leagueComp) {
            return leagueComp.name;
        }
        const euroComp = competitions.europeanCompetitions.find(comp => comp.competitionId === compId);
        return euroComp ? euroComp.name : compId;
    });
    return competitionNames.join(" + ");
}

export const seasonsTitle = (filterState: SearchFilterState): string => {
    if (filterState.seasons.length === 0) {
        return "All Seasons";
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
        return seasons.length + " Seasons";
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
        minuteString += ` · From Minute ${filterState.minuteFrom}`;
    }

    if ((filterState.minuteTo ?? 0) > 0) {
        minuteString += ` · Up Until Minute ${filterState.minuteTo}`;
    }
    return minuteString;
}

export const ageTitle = (filterState: SearchFilterState): string => {
    let ageString = "";
    if ((filterState.minAge ?? 0) > 0) {
        ageString += ` · Min Age: ${filterState.minAge}`;
    }

    if ((filterState.maxAge ?? 0) > 0) {
        ageString += ` · Max Age: ${filterState.maxAge}`;
    }
    return ageString;
}

export const heightTitle = (filterState: SearchFilterState): string => {
    let heightString = "";
    if ((filterState.minHeight ?? 0) > 0) {
        heightString += ` · Min Height: ${filterState.minHeight}cms`;
    }

    if ((filterState.maxHeight ?? 0) > 0) {
        heightString += ` · Max Height: ${filterState.maxHeight}cms`;
    }
    return heightString;
}

export const namesTitle = (filterState: SearchFilterState): string => {
    if (filterState.playerNames.length === 0) {
        return "";
    }

    return ` · ${filterState.playerNames.map(name => name).join(" or ")}`;
}

export const countriesTitle = (filterState: SearchFilterState): string => {
    if (filterState.playerCountries.length === 0) {
        return "";
    }

    return ` · ${filterState.playerCountries.map(country => country.name).join(" or ")}`;
}

export const subsTitle = (filterState: SearchFilterState): string => {
    let subString = "";
    if (!filterState.subsOnly) {
        return subString;
    }

    subString += " · Subs Only";

    if ((filterState.earliestSubOnTime ?? 0) > 0) {
        subString += ` · Earliest Sub On Time: ${filterState.earliestSubOnTime}`;
    }

    if ((filterState.latestSubOnTime ?? 0) > 0) {
        subString += ` · Latest Sub On Time: " + ${filterState.latestSubOnTime}`;
    }
    return subString;
}

export const pensTitle = (filterState: SearchFilterState): string => {
    if (filterState.penalties === PenaltyOptions.EXCLUDE_PENALTIES) {
        return " · Exclude Penalties";
    }

    if (filterState.penalties === PenaltyOptions.ONLY_PENALTIES) {
        return " · Only Penalties";
    }

    return "";
}

export const homeOrAwayTitle = (filterState: SearchFilterState): string => {
    if (filterState.homeOrAway === HomeOrAwayOptions.HOME) {
        return " · At Home";
    }

    if (filterState.homeOrAway === HomeOrAwayOptions.AWAY) {
        return " · Away From Home";
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
