import { describe, expect, it } from 'vitest';
import { Sector, type PieSectorShapeProps } from 'recharts';
import { renderPieSector } from './PieChartUtils';

const baseProps = (isActive: boolean): PieSectorShapeProps =>
    ({
        cx: 100,
        cy: 100,
        innerRadius: 60,
        outerRadius: 80,
        startAngle: 0,
        endAngle: 90,
        midAngle: 45,
        fill: 'green',
        payload: {name: 'Win', value: 10},
        percent: 0.5,
        value: 10,
        isActive,
        index: 0,
    } as PieSectorShapeProps);

describe('renderPieSector', () => {
    it('renders the expanded active shape for the hovered slice', () => {
        const element = renderPieSector(baseProps(true)) as React.ReactElement;

        expect(element.type).toBe('g');
    });

    it('renders the default Sector for inactive slices', () => {
        const element = renderPieSector(baseProps(false)) as React.ReactElement;

        expect(element.type).toBe(Sector);
    });
});
