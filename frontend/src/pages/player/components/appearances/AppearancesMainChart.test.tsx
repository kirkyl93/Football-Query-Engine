import type {ComponentProps} from 'react';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAppearance } from '../../../../types/Player';
import { resolveBarFills } from '../../lib/barFillColours';
import { mapAppearanceEvents } from '../../lib/appearancesEventMapper';
import { EventType } from '../../../../types/Player';
import AppearancesMainChart from './AppearancesMainChart';
import {plotFrameForSize} from './appearancesCanvasGeometry';

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

const renderChart = (count = 10, overrides: Partial<ComponentProps<typeof AppearancesMainChart>> = {}) => {
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
            {...overrides}
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
    it.each([[2, 4], [89, 90]])('keeps a tall tooltip within the plot for minutes %s–%s', (from, to) => {
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this: Element) {
            const tooltip = this.getAttribute('role') === 'tooltip';
            const width = tooltip ? 180 : 1000;
            const height = tooltip ? 210 : 360;
            return {x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => {}} as DOMRect;
        });
        const {container, getByRole} = renderChart(10, {
            zoomedData: Array.from({length: 10}, (_, i) => ({...game(i + 1), minutes_played: [from, to]})),
            tooltip: <div style={{height: 210, width: 180}}>Full game details</div>,
        });
        const surface = container.querySelector('canvas')!.parentElement!;
        const frame = plotFrameForSize(1000, 360);
        for (const clientX of [70, 500, 990]) {
            fireEvent.mouseMove(surface, {clientX});
            const tooltip = getByRole('tooltip');
            expect(parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(frame.plotTop);
            expect(parseFloat(tooltip.style.top) + 210).toBeLessThanOrEqual(frame.plotTop + frame.plotHeight);
            expect(parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(frame.plotLeft);
            expect(parseFloat(tooltip.style.left) + 180).toBeLessThanOrEqual(frame.plotLeft + frame.plotWidth);
            // The full-size tooltip is outside the chart/modal scroll tree.
            expect(tooltip.parentElement).toBe(document.body);
            expect(tooltip.style.position).toBe('fixed');
            expect(surface.style.height).toBe('360px');
        }
        fireEvent.mouseLeave(surface);
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('positions a full-height tooltip above short bars without shrinking or clipping it', () => {
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this: Element) {
            const tooltip = this.getAttribute('role') === 'tooltip';
            return {x: 0, y: tooltip ? 0 : 200, left: 0, top: tooltip ? 0 : 200,
                right: tooltip ? 180 : 1000, bottom: tooltip ? 360 : 560,
                width: tooltip ? 180 : 1000, height: 360, toJSON: () => {}} as DOMRect;
        });
        const {container, getByRole} = renderChart(1, {
            zoomedData: [{...game(1), minutes_played: [2, 4]}],
            tooltip: <div style={{height: 360, width: 180}}>Original tooltip spacing</div>,
        });
        fireEvent.mouseMove(container.querySelector('canvas')!.parentElement!, {clientX: 500});
        const tooltip = getByRole('tooltip');
        const frame = plotFrameForSize(1000, 360);
        expect(parseFloat(tooltip.style.top) + 360).toBe(200 + frame.plotTop + frame.plotHeight);
        expect(parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(4);
        expect(tooltip.style.maxHeight).toBe('');
        expect(tooltip.style.overflow).toBe('');
        expect(tooltip.parentElement).toBe(document.body);
        fireEvent.scroll(window);
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('keeps compact preview tooltips inside the appearances card', () => {
        const card = document.createElement('div');
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this: Element) {
            if (this === card) return {left: 0, right: 1000, top: 100, bottom: 480, width: 1000, height: 380} as DOMRect;
            if (this.getAttribute('role') === 'tooltip') return {left: 0, right: 180, top: 0, bottom: 321, width: 180, height: 321} as DOMRect;
            return {left: 20, right: 980, top: 160, bottom: 440, width: 960, height: 280} as DOMRect;
        });
        const {container, getByRole} = renderChart(1, {
            height: 280,
            tooltipBoundaryRef: {current: card},
            tooltip: <div style={{height: 321}}>Original full-size tooltip</div>,
        });
        fireEvent.mouseMove(container.querySelector('canvas')!.parentElement!, {clientX: 500});
        const tooltip = getByRole('tooltip');
        expect(parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(104);
        expect(parseFloat(tooltip.style.top) + 321).toBeLessThanOrEqual(476);
        expect(parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(4);
        expect(parseFloat(tooltip.style.left) + 180).toBeLessThanOrEqual(996);
        expect(tooltip.style.maxHeight).toBe('');
    });

});
