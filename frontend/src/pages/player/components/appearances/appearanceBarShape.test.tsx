import { describe, expect, it } from 'vitest';
import { Rectangle, type BarShapeProps } from 'recharts';
import { getColour } from '../../../../lib/ColourUtils';
import type { PlayerAppearance } from '../../../../types/Player';
import { createAppearanceBarShape } from './appearanceBarShape';

const game = (overrides: Partial<PlayerAppearance> = {}): PlayerAppearance => ({
    game_number: 1,
    club_id: 1,
    home_club_id: 1,
    home_club_name: 'Home',
    away_club_id: 2,
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
    ...overrides,
});

const shapeProps = (index: number): BarShapeProps =>
    ({index, x: 10, y: 20, width: 30, height: 40} as BarShapeProps);

describe('createAppearanceBarShape', () => {
    it('colours bars by club with a clean-sheet opacity boost', () => {
        const shape = createAppearanceBarShape({
            zoomedData: [game()],
            showCleanSheets: true,
            barChartOpacity: 1,
            strokeWidth: 1,
        });

        const element = shape(shapeProps(0)) as React.ReactElement<any>;

        expect(element.type).toBe(Rectangle);
        expect(element.props.fill).toBe(getColour(1));
        expect(element.props.fillOpacity).toBe(1.35);
        expect(element.props.x).toBe(10);
    });

    it('renders nothing for an out-of-range index instead of throwing', () => {
        const shape = createAppearanceBarShape({
            zoomedData: [],
            showCleanSheets: true,
            barChartOpacity: 1,
            strokeWidth: 1,
        });

        expect(() => shape(shapeProps(0))).not.toThrow();
        expect(shape(shapeProps(0))).toBeNull();
    });

    it('uses base opacity without a clean sheet', () => {
        const shape = createAppearanceBarShape({
            zoomedData: [game({away_club_goals: 2})],
            showCleanSheets: true,
            barChartOpacity: 1,
            strokeWidth: 1,
        });

        const element = shape(shapeProps(0)) as React.ReactElement<any>;

        expect(element.props.fillOpacity).toBe(1);
    });
});
