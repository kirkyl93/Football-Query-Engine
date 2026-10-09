import {PlayerAppearance, PlayerFilterState} from "../../../types/Player";
import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";

/**
 * Pure appearance filtering + game-number assignment.
 */
export const filterAppearances = (
    data: PlayerAppearance[],
    playerFilterState: PlayerFilterState,
): PlayerAppearance[] => {
    return data.filter(a => {
        if (playerFilterState.selectedAppearanceType === AppearanceTypeOptions.STARTED) {
            if (a.played_from_minute > 1) {
                return false;
            }
        } else if (playerFilterState.selectedAppearanceType === AppearanceTypeOptions.SUBBED_ON) {
            if (a.played_from_minute <= 1) {
                return false;
            }
        }

        if (playerFilterState.selectedMaximumMinutesPlayed || playerFilterState.selectedMinimumMinutesPlayed) {
            const minutesPlayed = a.minutes_played[1] - a.minutes_played[0];

            if (playerFilterState.selectedMinimumMinutesPlayed && playerFilterState.selectedMinimumMinutesPlayed > minutesPlayed) {
                return false;
            }

            if (playerFilterState.selectedMaximumMinutesPlayed && playerFilterState.selectedMaximumMinutesPlayed < minutesPlayed) {
                return false;
            }
        }

        const matchesSeasons = playerFilterState.selectedSeasons.length === 0 ||
            playerFilterState.selectedSeasons.includes(a.season);

        if (!matchesSeasons) {
            return false;
        }

        const matchesCompetitions = playerFilterState.selectedCompetitions.length === 0 ||
            playerFilterState.selectedCompetitions.includes(a.competition_name);

        if (!matchesCompetitions) {
            return false;
        }

        const matchesClubsPlayedFor = playerFilterState.selectedClubsPlayedFor.length === 0 ||
            playerFilterState.selectedClubsPlayedFor.includes(a.club_id);

        if (!matchesClubsPlayedFor) {
            return false;
        }
        const matchesClubsPlayedAgainst = playerFilterState.selectedClubsPlayedAgainst.length === 0 ||
            playerFilterState.selectedClubsPlayedAgainst.includes(a.club_id === a.home_club_id ? a.away_club_id : a.home_club_id);

        if (!matchesClubsPlayedAgainst) {
            return false;
        }

        return !playerFilterState.selectedHomeOrAway || playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.EITHER ||
            (playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.HOME && a.club_id === a.home_club_id) ||
            (playerFilterState.selectedHomeOrAway === HomeOrAwayOptions.AWAY && a.club_id === a.away_club_id);
    }).map((a, index) => ({
        ...a,
        game_number: index + 1
    }));
};
