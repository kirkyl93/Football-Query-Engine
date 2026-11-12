import { describe, expect, it, vi } from 'vitest';
import { drawAppearancesChart, type AppearancesDrawModel } from './appearancesCanvasDraw';

const stubCtx = () => ({
    clearRect: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    restore: vi.fn(),
});

const model = (): AppearancesDrawModel => ({
    zoomedData: [],
    barFills: [],
    scatterData: [],
    sizing: {
        barChartWidth: 10,
        strokeWidth: 1,
        scatterDotRadius: 5,
        rectangleWidth: 8,
        rectangleHeight: 8,
        barChartOpacity: 1,
    },
    yDomain: [0, 90],
    refAreaLeft: null,
    refAreaRight: null,
    showCleanSheets: false,
});

describe('drawAppearancesChart chrome', () => {
    it('paints a second-yellow marker with a red top and yellow bottom', () => {
        const fills: {color: string; rect: number[]}[] = [];
        const ctx = {
            ...stubCtx(),
            fillStyle: '',
            fillRect(...rect: number[]) { fills.push({color: this.fillStyle, rect}); },
            strokeRect: vi.fn(),
        };
        const data = model();
        // A zero-height appearance isolates marker drawing from the range bar.
        data.zoomedData = [{game_number: 1, minutes_played: [0, 0]}] as AppearancesDrawModel['zoomedData'];
        data.scatterData = [{game_number: 1, minute: 70, size: 5, color: 'red', bottomColor: 'yellow', shape: 'rectangle'}];
        drawAppearancesChart(ctx as unknown as CanvasRenderingContext2D, 800, 180, data);
        expect(fills).toHaveLength(2);
        const [base, bottom] = fills;
        expect(base.color).toBe('red');
        expect(bottom.color).toBe('yellow');
        const [x, y, width, height] = base.rect;
        expect(bottom.rect).toEqual([x, y + height / 2, width, height / 2]);
        expect(ctx.strokeRect).toHaveBeenCalledTimes(1);
    });

    it('draws axis labels and titles at full height', () => {
        const ctx = stubCtx();
        drawAppearancesChart(ctx as unknown as CanvasRenderingContext2D, 800, 360, model());

        expect(ctx.clearRect).toHaveBeenCalledTimes(1);
        expect(ctx.fillText.mock.calls.length).toBeGreaterThan(0);
    });

    it('skips axis chrome below 250px so previews stay clean', () => {
        const ctx = stubCtx();
        drawAppearancesChart(ctx as unknown as CanvasRenderingContext2D, 800, 180, model());

        expect(ctx.clearRect).toHaveBeenCalledTimes(1);
        expect(ctx.fillText).not.toHaveBeenCalled();
    });
});
