import {PlayerAppearance, PlayerSeasonsCompetitionsAndClubs} from "../../../types/Player";

export interface AppearancesMetadata extends PlayerSeasonsCompetitionsAndClubs {
    finalSeason: number;
}

export const createDefaultMetadata = (): AppearancesMetadata => ({
    finalSeason: 0,
    seasons: [],
    leagueCompetitions: [],
    europeanCompetitions: [],
    clubsPlayedFor: [],
    clubsPlayedAgainst: []
});

/**
 * Derives filter-bar metadata (seasons, competitions, clubs) from the raw
 * game log.
 */
export const extractAppearancesMetadata = (initialData: PlayerAppearance[]): AppearancesMetadata => {
    const finalSeason = initialData[initialData.length - 1].season;
    const seasons = [...new Set(initialData.map(a => a.season))];

    const clubsPlayedForMap = new Map(initialData.map(a => [a.club_id, a.club_id === a.home_club_id ? a.home_club_name : a.away_club_name]));
    const clubsPlayedFor = [...clubsPlayedForMap.entries()];

    const clubsPlayedAgainstMap = new Map(initialData.map(a => [a.club_id === a.home_club_id ? a.away_club_id : a.home_club_id, a.club_id === a.home_club_id ? a.away_club_name : a.home_club_name]));
    const clubsPlayedAgainst = [...clubsPlayedAgainstMap.entries()];

    const leagueCompetitions = [...new Set(initialData
        .filter(a => a.competition_type === 'League')
        .map(a => a.competition_name))];

    const europeanCompetitions = [...new Set(initialData
        .filter(a => a.competition_type === 'Europe')
        .map(a => a.competition_name))];

    return {
        finalSeason,
        seasons,
        leagueCompetitions,
        europeanCompetitions,
        clubsPlayedFor,
        clubsPlayedAgainst
    };
};
