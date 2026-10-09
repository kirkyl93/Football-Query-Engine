import {
    HomeOrAwayOptions,
    PenaltyOptions,
    SortOptions,
    StatScope,
} from "../../../types/SearchOptions";

export const seasons = [
    2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009,
    2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992,
];

export const positions: string[] = ["GK", "LB", "RB", "CB", "CDM", "LM", "RM", "CM", "CAM", "LW", "RW", "SS", "CF"];

export const ages = Array.from({length: 37}, (_, i) => i + 14);

export const minutes = Array.from({length: 120}, (_, i) => i + 1);

export const heights = Array.from({length: 120}, (_, i) => i + 120);

export const appearances = Array.from({length: 249}, (_, i) => i + 2);

export const season_goals_or_assists = Array.from({length: 50}, (_, i) => i + 1);

export const game_goals_or_assists = Array.from({length: 8}, (_, i) => i + 1);

export const penaltyOptions = [
    {name: "Include penalties", id: PenaltyOptions.INCLUDE_PENALTIES},
    {name: "Exclude penalties", id: PenaltyOptions.EXCLUDE_PENALTIES},
    {name: "Only penalties", id: PenaltyOptions.ONLY_PENALTIES}
];

export const homeOrAwayOptions = [
    {name: "Either", id: HomeOrAwayOptions.EITHER},
    {name: "Home", id: HomeOrAwayOptions.HOME},
    {name: "Away", id: HomeOrAwayOptions.AWAY}
];

export const sortTypes = [
    {name: "Goals", id: SortOptions.GOALS},
    {name: "Assists", id: SortOptions.ASSISTS},
    {name: "Goals and Assists", id: SortOptions.GOALS_AND_ASSISTS},
    {name: "Appearances", id: SortOptions.APPEARANCES},
    {name: "Minutes played", id: SortOptions.MINUTES_PLAYED},
    {name: "Yellow cards", id: SortOptions.YELLOW_CARDS},
    {name: "Red cards", id: SortOptions.RED_CARDS},
    {name: "Minutes per goal", id: SortOptions.MINUTES_PER_GOAL},
    {name: "Minutes per assist", id: SortOptions.MINUTES_PER_ASSIST},
    {name: "Minutes per goal or assist", id: SortOptions.MINUTES_PER_GOAL_OR_ASSIST},
    {name: "Minutes per yellow card", id: SortOptions.MINUTES_PER_YELLOW},
    {name: "Minutes per red card", id: SortOptions.MINUTES_PER_RED},
    {name: "Number of games with", id: SortOptions.NUMBER_OF_GAMES_WITH},
    {name: "Number of seasons with", id: SortOptions.NUMBER_OF_SEASONS_WITH}
];

export const statScopes = [
    {name: "Overall", id: StatScope.OVERALL},
    {name: "Season", id: StatScope.SEASON},
    {name: "Game", id: StatScope.GAME}
];
