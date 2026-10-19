import {PlayerFilterState} from "../../../types/Player";
import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";
import {
    cap,
    describeCompetitions,
    describeSeasons,
    describeSpan,
    findCompetitionNameByName,
    joinClauses,
} from "../../../lib/titleUtils";

/**
 * Pure title-string builders for the appearances chart header.
 * Each builder returns a bare clause; `constructAppearancesTitle` joins them
 * under the player-name headline: "Mohamed Salah: Premier League, 2020/21–2023/24".
 */

export const appearancesCompetitionsTitle = (filterState: PlayerFilterState): string =>
    describeCompetitions(filterState.selectedCompetitions.map(findCompetitionNameByName));

export const appearancesSeasonsTitle = (filterState: PlayerFilterState): string =>
    describeSeasons(filterState.selectedSeasons);

export const appearancesHomeOrAwayTitle = (filterState: PlayerFilterState): string => {
    if (filterState.selectedHomeOrAway === HomeOrAwayOptions.HOME) {
        return "home matches";
    }

    if (filterState.selectedHomeOrAway === HomeOrAwayOptions.AWAY) {
        return "away matches";
    }

    return "";
};

export const appearancesIncludeOnlyTitle = (filterState: PlayerFilterState): string => {
    let appearanceType = "";
    if (filterState.selectedAppearanceType === AppearanceTypeOptions.STARTED) {
        appearanceType = "starts";
    } else if (filterState.selectedAppearanceType === AppearanceTypeOptions.SUBBED_ON) {
        appearanceType = "sub appearances";
    }

    return joinClauses(
        appearanceType,
        describeSpan(filterState.selectedMinimumMinutesPlayed, filterState.selectedMaximumMinutesPlayed, "minutes"),
    );
};

export const constructAppearancesTitle = (playerName: string, filterState: PlayerFilterState): string => {
    const headline = playerName.trim();
    const criteria = joinClauses(
        appearancesCompetitionsTitle(filterState),
        appearancesSeasonsTitle(filterState),
        appearancesHomeOrAwayTitle(filterState),
        appearancesIncludeOnlyTitle(filterState),
    );

    return headline ? `${headline}: ${criteria}` : cap(criteria);
}
