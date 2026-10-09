import {competitions} from "../../../data/Competitions";
import {formatSeason} from "../../../lib/DateUtils";
import {PlayerFilterState} from "../../../types/Player";
import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";

/**
 * Pure title-string builders for the appearances chart header.
 */
export const appearancesCompetitionsTitle = (filterState: PlayerFilterState): string => {
    if (filterState.selectedCompetitions.length === 0) {
        return "ALL COMPS";
    }

    if (filterState.selectedCompetitions.length >= 10) {
        return filterState.selectedCompetitions.length + " COMPS";
    }

    const competitionNames = filterState.selectedCompetitions.map(compName => {
        const leagueComp = competitions.leagues.find(comp => comp.name === compName);
        if (leagueComp) {
            return leagueComp.name.toUpperCase();
        }
        const euroComp = competitions.europeanCompetitions.find(comp => comp.name === compName);
        return euroComp ? euroComp.name.toUpperCase() : compName;
    });
    return competitionNames.join(" + ");
}

export const appearancesSeasonsTitle = (filterState: PlayerFilterState): string => {
    if (filterState.selectedSeasons.length === 0) {
        return "ALL SEASONS";
    }

    if (filterState.selectedSeasons.length === 1) {
        return formatSeason(filterState.selectedSeasons[0]);
    }

    const seasons = [...filterState.selectedSeasons].sort((a, b) => a - b);
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

export const appearancesHomeOrAwayTitle = (filterState: PlayerFilterState): string => {
    if (filterState.selectedHomeOrAway === HomeOrAwayOptions.HOME) {
        return " · AT HOME";
    }

    if (filterState.selectedHomeOrAway === HomeOrAwayOptions.AWAY) {
        return " · AWAY FROM HOME";
    }

    return "";
}

export const appearancesIncludeOnlyTitle = (filterState: PlayerFilterState): string => {
    let title = "";
    if (filterState.selectedAppearanceType === AppearanceTypeOptions.STARTED) {
        title += " · GAMES STARTED";
    } else if (filterState.selectedAppearanceType === AppearanceTypeOptions.SUBBED_ON) {
        title += " · SUBBED ON";
    }

    if (filterState.selectedMinimumMinutesPlayed && filterState.selectedMinimumMinutesPlayed > 0) {
        title += " · AT LEAST " + filterState.selectedMinimumMinutesPlayed + " MINS";
    }

    if (filterState.selectedMaximumMinutesPlayed && filterState.selectedMaximumMinutesPlayed > 0) {
        title += " · AT MOST " + filterState.selectedMaximumMinutesPlayed + " MINS";
    }

    return title;
}

export const constructAppearancesTitle = (playerName: string, filterState: PlayerFilterState): string => {
    let title = playerName.toUpperCase();
    title += (playerName.length > 0 ? " · " : "") + appearancesCompetitionsTitle(filterState);
    title += " · " + appearancesSeasonsTitle(filterState);
    title += appearancesHomeOrAwayTitle(filterState);
    title += appearancesIncludeOnlyTitle(filterState);
    return title;
}
