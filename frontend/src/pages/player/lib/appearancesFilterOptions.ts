import {AppearanceTypeOptions, HomeOrAwayOptions} from "../../../types/SearchOptions";
import {EventType} from "../../../types/Player";

export const minutesPlayed = Array.from({length: 120}, (_, i) => i + 1);

export const homeOrAwayOptions = [
    {name: "Either", id: HomeOrAwayOptions.EITHER},
    {name: "Home", id: HomeOrAwayOptions.HOME},
    {name: "Away", id: HomeOrAwayOptions.AWAY}
];

export const appearanceTypeOptions = [
    {name: "Either", id: AppearanceTypeOptions.EITHER},
    {name: "Started", id: AppearanceTypeOptions.STARTED},
    {name: "Subbed on", id: AppearanceTypeOptions.SUBBED_ON}
];

export const eventTypeOptions = [
    {eventType: EventType.Goals, colour: "blue", name: "Goals"},
    {eventType: EventType.Penalties, colour: "gold", name: "Penalties"},
    {eventType: EventType.Assists, colour: "green", name: "Assists"},
    {eventType: EventType.CleanSheets, colour: "green", name: "Clean sheets"},
    {eventType: EventType.OwnGoals, colour: "pink", name: "Own goals"},
    {eventType: EventType.Yellows, colour: "yellow", name: "Yellows"},
    {eventType: EventType.Reds, colour: "red", name: "Reds"},
];
