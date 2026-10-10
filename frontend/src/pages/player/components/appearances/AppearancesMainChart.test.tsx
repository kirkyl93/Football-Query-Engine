import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BarShapeProps } from 'recharts';
import type { PlayerAppearance } from '../../../../types/Player';
import { resolveBarFills } from '../../lib/barFillColours';
import { calculateYDomain } from '../../lib/chartSizing';
import { mapAppearanceEvents } from '../../lib/appearancesEventMapper';
import { EventType } from '../../../../types/Player';
import { createAppearanceBarShape } from './appearanceBarShape';
import { ScatterGlyph } from './ScatterEventShape';
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
    goals: n % 3 === 0 ? 1 : 0,
    penalty_goals: 0,
    assists: n % 4 === 0 ? 1 : 0,
    yellow_cards: 0,
    red_cards: 0,
    played_from_minute: 0,
    subbed_off_minute: 0,
    home_club_goals: 2,
    away_club_goals: 0,
    goal_minutes: n % 3 === 0 ? [23] : [],
    penalty_goal_minutes: [],
    own_goal_minutes: [],
    assist_minutes: n % 4 === 0 ? [55] : [],
    yellow_minutes: [],
    red_minutes: [],
    minutes_played: [0, 90],
    result: n % 2 === 0 ? 'Win' : 'Loss',
});

const buildCareer = (count: number): PlayerAppearance[] =>
    Array.from({length: count}, (_, i) => game(i + 1));

const noEvents = (): Record<EventType, boolean> => ({
    [EventType.Goals]: false,
    [EventType.Penalties]: false,
    [EventType.OwnGoals]: false,
    [EventType.Assists]: false,
    [EventType.CleanSheets]: false,
    [EventType.Yellows]: false,
    [EventType.Reds]: false,
});

describe('AppearancesMainChart at scale', () => {
    it('derives fills, events and domain for a 600-game career without blowing up', () => {
        const data = buildCareer(600);

        const started = performance.now();
        const fills = resolveBarFills(data);
        // No events selected => every per-game marker set is included.
        const events = mapAppearanceEvents(data, noEvents(), true);
        const domain = calculateYDomain(data, false);
        const elapsed = performance.now() - started;

        expect(fills).toHaveLength(600);
        // 600 result dots + 200 goals + 150 assists.
        expect(events).toHaveLength(600 + 200 + 150);
        expect(domain).toEqual([0, 90]);
        // Generous guard against pathological (e.g. quadratic) derivations;
        // jsdom timing is noisy so this only catches blowups, not regressions.
        expect(elapsed).toBeLessThan(10000);

        const shape = createAppearanceBarShape({
            zoomedData: data,
            barFills: fills,
            showCleanSheets: true,
            barChartOpacity: 3,
            strokeWidth: 0.002,
        });
        for (let i = 0; i < data.length; i++) {
            const element = shape({index: i, x: i, y: 0, width: 1, height: 90} as BarShapeProps) as React.ReactElement<any>;
            expect(element.type).toBe('rect');
        }
    });

    it('renders the scatter glyph for both marker kinds', () => {
        const {container: rectContainer} = render(
            <svg><ScatterGlyph cx={10} cy={20} payload={{shape: 'rectangle', color: 'blue'}} rectangleWidth={4} rectangleHeight={6} scatterDotRadius={3} strokeWidth={1}/></svg>,
        );
        expect(rectContainer.querySelector('rect')).not.toBeNull();

        const {container: dotContainer} = render(
            <svg><ScatterGlyph cx={10} cy={20} payload={{shape: 'dot', color: 'green'}} rectangleWidth={4} rectangleHeight={6} scatterDotRadius={3} strokeWidth={1}/></svg>,
        );
        expect(dotContainer.querySelector('circle')).not.toBeNull();
    });

    it('mounts with 600 bars without crashing', () => {
        const data = buildCareer(600);
        const ref = {current: null} as React.RefObject<HTMLDivElement | null>;
        const noop = () => {};

        const {container} = render(
            <AppearancesMainChart
                zoomedData={data}
                barFills={resolveBarFills(data)}
                scatterData={mapAppearanceEvents(data, noEvents(), true)}
                sizing={{barChartWidth: 0.7, strokeWidth: 0.002, scatterDotRadius: 2.5, rectangleWidth: 3.5, rectangleHeight: 5, barChartOpacity: 3}}
                yDomain={[0, 90]}
                refAreaLeft={null}
                refAreaRight={null}
                chartRef={ref}
                showCleanSheets
                tooltip={<div/>}
                onMouseDown={noop}
                onMouseMove={noop}
                onMouseUp={noop}
                onZoom={vi.fn()}
                onEnter={noop}
                onLeave={noop}
            />,
        );

        expect(container.firstChild).not.toBeNull();
    });
});
