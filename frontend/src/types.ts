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
    position: string,
    foot: string,
    height_in_cm: number,
    image_url: string
}

export interface SeasonStats {
    player_id: number,
    season: number,
    club_name: string,
    competition_id: string,
    competition_country_code: string,
    competition_name: string,
    competition_type: string,
    competition_country: string,
    competition_country_id: string,
    total_appearances: number,
    total_goals: number,
    total_assists: number,
    total_yellow_cards: number,
    total_red_cards: number,
    total_minutes_played: number,
    mins_per_goal: number | null,
    mins_per_assist: number | null,
    mins_per_yellow_card: number | null,
    mins_per_red_card: number | null
}

export interface PlayerSearchResult {
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
    clubs_played_for: string
}

export interface PlayerWithSeasonStats {
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
    position: string,
    foot: string,
    height_in_cm: number,
    image_url: string,
    season: number,
    club_id: string,
    club_name: string,
    competition_id: string,
    competition_country_code: string,
    competition_name: string,
    competition_type: string,
    competition_country: string,
    competition_country_id: string,
    total_appearances: number,
    total_goals: number,
    total_assists: number,
    total_yellow_cards: number,
    total_red_cards: number,
    total_minutes_played: number,
    mins_per_goal: number | null,
    mins_per_assist: number | null,
    mins_per_yellow_card: number | null,
    mins_per_red_card: number | null
}

export interface Competition {
    id: string,
    name: string,
}

export interface Club {
    club_id: number,
    name: string
}
