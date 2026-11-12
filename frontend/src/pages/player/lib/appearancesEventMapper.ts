import {secondYellowMinute} from "./appearanceMinuteWindow";
import {PlayerAppearance} from "../../../types/Player";
import {EventType} from "../../../types/Player";

export interface ScatterEvent {
    game_number: number;
    minute: number;
    size: number;
    color: string;
    bottomColor?: string;
    shape: string;
}

export type EventSelection = Record<EventType, boolean>;

export const areNoEventsSelected = (selectedEvents: EventSelection): boolean => {
    return !selectedEvents.Goals && !selectedEvents.Penalties && !selectedEvents.OwnGoals
        && !selectedEvents.Assists && !selectedEvents.CleanSheets && !selectedEvents.Yellows && !selectedEvents.Reds;
};

/**
 * Maps zoomed appearances to scatter-plot event markers (goals, cards,
 * result dots).
 */
export const mapAppearanceEvents = (
    zoomedData: PlayerAppearance[],
    selectedEvents: EventSelection,
    noEventFiltersSelected: boolean,
): ScatterEvent[] => {
    return zoomedData.flatMap((item) => {
        const events: ScatterEvent[] = [];

        // Add goal events
        if (noEventFiltersSelected || selectedEvents.Goals) {
            item.goal_minutes.forEach((minute) => {
                events.push({game_number: item.game_number, minute, size: 5, color: 'blue', shape: 'rectangle'});
            });
        }

        if (noEventFiltersSelected || selectedEvents.Penalties) {
            item.penalty_goal_minutes.forEach((minute) => {
                events.push({game_number: item.game_number, minute, size: 5, color: 'gold', shape: 'rectangle'});
            })
        }

        if (noEventFiltersSelected || selectedEvents.OwnGoals) {
            item.own_goal_minutes.forEach((minute) => {
                events.push({game_number: item.game_number, minute, size: 5, color: 'pink', shape: 'rectangle'});
            })
        }

        // Add assist events
        if (noEventFiltersSelected || selectedEvents.Assists) {
            item.assist_minutes.forEach((minute) => {
                events.push({game_number: item.game_number, minute, size: 5, color: 'green', shape: 'rectangle'});
            });
        }

        // Keep second-yellow dismissals visible under either card filter.
        const dismissal = secondYellowMinute(item);
        if (noEventFiltersSelected || selectedEvents.Yellows || (selectedEvents.Reds && dismissal !== null)) {
            item.yellow_minutes.forEach((minute) => {
                events.push({
                    game_number: item.game_number, minute, size: 5, shape: 'rectangle',
                    color: minute === dismissal ? 'red' : 'yellow',
                    ...(minute === dismissal ? {bottomColor: 'yellow'} : {}),
                });
            });
            if (dismissal !== null && !item.yellow_minutes.includes(dismissal)) {
                events.push({game_number: item.game_number, minute: dismissal, size: 5, color: 'red', bottomColor: 'yellow', shape: 'rectangle'});
            }
        }

        // Add red card events
        if (noEventFiltersSelected || selectedEvents.Reds) {
            item.red_minutes.forEach((minute) => {
                events.push({game_number: item.game_number, minute, size: 5, color: 'red', shape: 'rectangle'});
            });
        }

        // Add appearance event
        if (item.result === "Win") {
            events.push({game_number: item.game_number, minute: -10, size: 5, color: 'green', shape: 'rectangle'});
        }

        if (item.result === "Draw") {
            events.push({game_number: item.game_number, minute: -10, size: 5, color: 'yellow', shape: 'rectangle'});
        }

        if (item.result === "Loss") {
            events.push({game_number: item.game_number, minute: -10, size: 5, color: 'red', shape: 'rectangle'});
        }

        return events;
    });
};
