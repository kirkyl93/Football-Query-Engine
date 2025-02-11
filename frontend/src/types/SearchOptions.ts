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