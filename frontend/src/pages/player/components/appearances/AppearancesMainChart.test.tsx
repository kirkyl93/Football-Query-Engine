import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAppearance } from '../../../../types/Player';
import { resolveBarFills } from '../../lib/barFillColours';
import { mapAppearanceEvents } from '../../lib/appearancesEventMapper';
import { EventType } from '../../../../types/Player';
import AppearancesMainChart from './AppearancesMainChart';

const game = (n: number): PlayerAppearance => ({
    game_number: n,
    club_id: 5,
    home_club_id: 5,
    home_club_name: 'Home',
    away_club_id: 6,
    away_club_name: 'Away',
    competition_id: 'GB1',
    competition_name: 'Premier League',
    competition_type: 'League',
    date: '2025-08-01',
    season: 2025,
    goals: 0,
    penalty_goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 2,
    away_club_goals: 0,
    goal_minutes: [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: 'Win',
});

const noEvents = (): Record<EventType, boolean> => ({
    [EventType.Goals]: false,
    [EventType.Penalties]: false,
    [EventType.OwnGoals]: false,
    [EventType.Assists]: false,
    [EventType.CleanSheets]: false,
    [EventType.Yellows]: false,
    [EventType.Reds]: false,
});

const renderChart = (count = 10) => {
    const data = Array.from({length: count}, (_, i) => game(i + 1));
    const noop = () => {};
    return render(
        <AppearancesMainChart
            zoomedData={data}
            barFills={resolveBarFills(data)}
            scatterData={mapAppearanceEvents(data, noEvents(), true)}
            sizing={{barChartWidth: 10, strokeWidth: 1, scatterDotRadius: 5, rectangleWidth: 8, rectangleHeight: 8, barChartOpacity: 1}}
            yDomain={[0, 90]}
            refAreaLeft={null}
            refAreaRight={null}
            showCleanSheets
            tooltip={<div/>}
            onMouseDown={noop}
            onMouseMove={noop}
            onMouseUp={noop}
        />,
    );
};

describe('AppearancesMainChart', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('mounts a canvas without crashing where there is no layout engine', () => {
        // jsdom provides neither ResizeObserver nor a 2d context: the
        // component must render its canvas shell without throwing.
        const {container} = renderChart();

        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('forwards drag-zoom gestures with the hovered game number', () => {
        // jsdom reports zero sizes; stub layout so hit-testing sees a plot.
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
            x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 360, width: 1000, height: 360,
            toJSON: () => {},
        } as DOMRect);
        const onMouseDown = vi.fn();
        const onMouseMove = vi.fn();
        const onMouseUp = vi.fn();
        const data = Array.from({length: 10}, (_, i) => game(i + 1));
        const {container} = render(
            <AppearancesMainChart
                zoomedData={data}
                barFills={resolveBarFills(data)}
                scatterData={mapAppearanceEvents(data, noEvents(), true)}
                sizing={{barChartWidth: 10, strokeWidth: 1, scatterDotRadius: 5, rectangleWidth: 8, rectangleHeight: 8, barChartOpacity: 1}}
                yDomain={[0, 90]}
                refAreaLeft={null}
                refAreaRight={null}
                showCleanSheets
                tooltip={<div/>}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
            />,
        );

        const surface = container.firstElementChild?.firstElementChild as HTMLElement;
        fireEvent.mouseDown(surface, {clientX: 100});
        fireEvent.mouseMove(surface, {clientX: 150});
        fireEvent.mouseUp(surface);

        // Without layout the wrapper has no width, so every pixel clamps to
        // the first game — but the gesture plumbing must still fire.
        expect(onMouseDown).toHaveBeenCalledWith({activeLabel: 1});
        expect(onMouseMove).toHaveBeenCalledWith({activeLabel: 1});
        expect(onMouseUp).toHaveBeenCalled();
    });
});
