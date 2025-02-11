import {HomeOrAwayOptions} from "./SearchOptions";

export interface Player {
    player_id: number,
    first_name: string,
    last_name: string,
    current_club_id: number,
    country_of_birth: string,
    country_of_citizenship: string,
    country_code: string,
    date_of_birth: string,
    age: number,
    sub_position: string,
    foot: string,
    height_in_cm: number,
    image_url: string
}

export interface PlayerAppearance {
    game_number: number,
    club_id: number,
    home_club_id: number,
    home_club_name: string,
    away_club_id: number,
    away_club_name: string,
    competition_id: string,
    competition_name: string,
    competition_type: string,
    date: string,
    season: number,
    goals: number,
    penalty_goals: number,
    assists: number,
    yellow_cards: number,
    red_cards: number,
    played_from_minute: number,
    subbed_off_minute: number,
    home_club_goals: number,
    away_club_goals: number,
    goal_minutes: number[],
    penalty_goal_minutes: number[],
    own_goal_minutes: number[],
    assist_minutes: number[],
    yellow_minutes: number[],
    red_minutes: number[],
    minutes_played: number[],
    result: string
}

export interface PlayerSearchResult {
    rank: number,
    player_id: number,
    player_name: string,
    country_code: string,
    sub_position: string,
    image_url: string,
    total_appearances: number,
    substitute_appearances: number,
    total_goals: number,
    total_assists: number,
    total_yellow_cards: number,
    total_red_cards: number,
    total_minutes_played: number,
    clubs_played_for: string,
    mins_per_goal: number,
    mins_per_assist: number,
    mins_per_goal_or_assist: number,
    mins_per_yellow: number,
    mins_per_red: number,
    season: number
}

export interface PlayerGameSearchResult {
    rank: number,
    player_id: number,
    player_name: string,
    country_of_citizenship: string,
    country_code: string,
    sub_position: string,
    image_url: string,
    club_id: number,
    competition_id: number,
    competition_name: string,
    competition_country_code: string,
    season: number,
    date: string,
    home_club_id: number,
    home_club_name: string,
    home_club_goals: number,
    away_club_id: number,
    away_club_name: string,
    away_club_goals: number,
    minutes_played: number,
    goals: number,
    assists: number,
}

export interface PlayerNumberOfGamesOrSeasonsResult {
    rank: number,
    player_id: number,
    player_name: string,
    country_code: string,
    sub_position: string,
    image_url: string,
    clubs_played_for: string,
    season: number,
    number_of_games: number,
    number_of_seasons: number
}

export interface PlayerSeasonsCompetitionsAndClubs {
    seasons: number[],
    leagueCompetitions: string[],
    europeanCompetitions: string[],
    clubsPlayedFor: [number, string][],
    clubsPlayedAgainst: [number, string][]
}

export interface PlayerFilterState {
    selectedSeasons: number[],
    selectedCompetitions: string[],
    selectedClubsPlayedFor: number[],
    selectedClubsPlayedAgainst: number[],
    selectedHomeOrAway: HomeOrAwayOptions,
    selectedEvents: SelectedEvents
}

export interface PlayerTotals {
    goals: number,
    penalties: number,
    ownGoals: number,
    assists: number,
    yellows: number,
    reds: number
}

export enum EventType {
    Goals = "Goals",
    Penalties = "Penalties",
    OwnGoals = "OwnGoals",
    Assists = "Assists",
    Yellows = "Yellows",
    Reds = "Reds"
}

type SelectedEvents = Record<EventType, boolean>;
