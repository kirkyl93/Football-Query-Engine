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

export enum UrlFilters {
    SEASONS = 'seasons',
    COMPETITIONS = 'comps',
    POSITIONS = 'positions',
    MINUTE_FROM = 'minfrom',
    MINUTE_TO = 'minto',
    MINIMUM_AGE = 'minage',
    MAXIMUM_AGE = 'maxage',
    MINIMUM_HEIGHT = 'minheight',
    MAXIMUM_HEIGHT = 'maxheight',
    PLAYER_NAMES = 'names',
    CLUBS_PLAYED_FOR = 'clubspf',
    CLUBS_PLAYED_AGAINST = 'clubspa',
    SUBS_ONLY = 'subonly',
    EARLIEST_SUB_ON_TIME = 'earliestsub',
    LATEST_SUB_ON_TIME = 'latestsub',
    PENALTIES = "penalty",
    HOME_OR_AWAY = "home",
    SORT_BY = "sort",
    SCOPE = "scope",
    MINIMUM_APPEARANCES = "ma",
    MINIMUM_GOALS = "ming",
    MAXIMUM_GOALS = "maxg",
    MINIMUM_ASSISTS = "mina",
    MAXIMUM_ASSISTS = "maxa"
}

export enum PenaltyOptions {
    INCLUDE_PENALTIES = 'ip',
    EXCLUDE_PENALTIES = 'ep',
    ONLY_PENALTIES = 'op'
}

export enum HomeOrAwayOptions {
    HOME = 'h',
    AWAY = 'a',
    EITHER = 'e'
}

export enum StatScope {
    OVERALL = 'o',
    SEASON = 's',
    GAME = 'g'
}

export enum SortOptions {
    GOALS = 'g',
    ASSISTS = 'a',
    GOALS_AND_ASSISTS = 'ga',
    APPEARANCES = 'ap',
    MINUTES_PLAYED = 'm',
    YELLOW_CARDS = 'y',
    RED_CARDS = 'r',
    MINUTES_PER_GOAL = 'mpg',
    MINUTES_PER_ASSIST = 'mpa',
    MINUTES_PER_GOAL_OR_ASSIST = 'mpga',
    MINUTES_PER_YELLOW = 'mpy',
    MINUTES_PER_RED = 'mpr',
    NUMBER_OF_GAMES_WITH = 'gw',
    NUMBER_OF_SEASONS_WITH = 'sw'
}

export const minuteBasedSortOptions = [
    SortOptions.MINUTES_PER_GOAL,
    SortOptions.MINUTES_PER_ASSIST,
    SortOptions.MINUTES_PER_GOAL_OR_ASSIST,
    SortOptions.MINUTES_PER_YELLOW,
    SortOptions.MINUTES_PER_RED
]

export const numberOfGamesOrSeasonsSortOptions = [
    SortOptions.NUMBER_OF_GAMES_WITH,
    SortOptions.NUMBER_OF_SEASONS_WITH
]

export const gameOnlySortOptions = [
    SortOptions.GOALS,
    SortOptions.ASSISTS,
    SortOptions.GOALS_AND_ASSISTS
]

export const overallOnlySortOptions = [
    SortOptions.NUMBER_OF_SEASONS_WITH
]

export interface FilterState {
    seasons: number[];
    competitions: string[];
    positions: string[];
    minuteFrom?: number;
    minuteTo?: number;
    minAge?: number;
    maxAge?: number;
    minHeight?: number;
    maxHeight?: number;
    playerNames: string[];
    clubsPlayedFor: number[];
    clubsPlayedAgainst: number[];
    subsOnly: boolean;
    earliestSubOnTime?: number;
    latestSubOnTime?: number;
    penalties: PenaltyOptions;
    homeOrAway: HomeOrAwayOptions;
    statScope: StatScope;
    sortBy: SortOptions;
    minimumAppearances?: number;
    minimumGoals?: number;
    maximumGoals?: number;
    minimumAssists?: number;
    maximumAssists?: number;
    minimumYellows?: number;
    minimumReds?: number;
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
