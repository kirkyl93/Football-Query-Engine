import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAppearance } from '../../../../types/Player';
import { resolveBarFills } from '../../lib/barFillColours';
import { mapAppearanceEvents } from '../../lib/appearancesEventMapper';
import { EventType } from '../../../../types/Player';
import AppearancesMainChart from './AppearancesMainChart';

const captured = vi.hoisted(() => ({lastXAxisProps: null as any}));

// Capture the XAxis element's props: jsdom has no ResizeObserver, so
// ResponsiveContainer never mounts children without a stub. The stub below
// reports a fixed size; the XAxis stub records props instead of rendering.
vi.mock('recharts', async (importOriginal) => {
    const mod: any = await importOriginal();
    return {
        ...mod,
        XAxis: (props: any) => {
            captured.lastXAxisProps = props;
            return null;
        },
    };
});

class MockResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }
    observe(target: Element) {
        this.callback(
            [{contentRect: {width: 1200, height: 360}} as ResizeObserverEntry],
            this as unknown as ResizeObserver,
        );
    }
    unobserve() {}
    disconnect() {}
}

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
    home_club_goals: 1,
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

const noEvents: Record<EventType, boolean> = ({
    [EventType.Goals]: false,
    [EventType.Penalties]: false,
    [EventType.OwnGoals]: false,
    [EventType.Assists]: false,
    [EventType.CleanSheets]: false,
    [EventType.Yellows]: false,
    [EventType.Reds]: false,
} as unknown) as Record<EventType, boolean>;

describe('AppearancesMainChart XAxis', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses a deduplicated category axis so hover lookup holds one entry per game', () => {
        // The scatter overlay registers one hover entry per marker (several
        // per game). On a numeric axis those duplicates poisoned Recharts'
        // tooltip lookup: hovering between bars could show a much earlier
        // game. A deduplicated category axis keeps exactly one entry per
        // game, so the tooltip always matches the cursor.
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        const data = Array.from({length: 10}, (_, i) => game(i + 1));
        const noop = () => {};

        render(
            <AppearancesMainChart
                zoomedData={data}
                barFills={resolveBarFills(data)}
                scatterData={mapAppearanceEvents(data, noEvents, true)}
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

        expect(captured.lastXAxisProps).not.toBeNull();
        expect(captured.lastXAxisProps.dataKey).toBe('game_number');
        expect(captured.lastXAxisProps.type).toBe('category');
        expect(captured.lastXAxisProps.allowDuplicatedCategory).toBe(false);
    });
});
