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
