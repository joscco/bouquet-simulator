import {describe, expect, it, vi} from 'vitest';
import {FlowerNodeGraphic} from '../models/flower.models';
import {drawGraphicPaint} from './graphic-paint';

describe('graphic patterns', () => {
  it('renders all parametric layer types and preserves legacy paint', () => {
    const mock = mockContext();
    const graphic: FlowerNodeGraphic = {
      primitive: 'leaf-pointed',
      color: '#477b49',
      width: 40,
      height: 80,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 1},
      end: {x: 0.5, y: 0},
      patterns: [
        {id: 'gradient', type: 'gradient', color: '#ffffff', opacity: 0.5},
        {id: 'veins', type: 'veins', color: '#173f2a', opacity: 0.8, density: 3, size: 0.01},
        {id: 'spots', type: 'spots', color: '#7c3aed', opacity: 0.6, density: 4, size: 0.04, seed: 0.4},
        {id: 'edge', type: 'edge', color: '#14532d', opacity: 0.7, width: 0.05},
      ],
      paint: [{x: 0.25, y: 0.75, size: 0.1, color: '#ff0000'}],
    };

    drawGraphicPaint(mock.context, graphic, 100, 200);

    expect(mock.gradientStops).toEqual([[0, 'transparent'], [1, '#ffffff']]);
    expect(mock.stroke).toHaveBeenCalledOnce();
    expect(mock.lineTo).toHaveBeenCalledTimes(7);
    expect(mock.arcs).toHaveLength(5);
    expect(mock.fillRect).toHaveBeenCalledTimes(6);
    expect(mock.context.globalAlpha).toBe(1);
  });

  it('distributes spots deterministically from the serialized seed', () => {
    const graphic: FlowerNodeGraphic = {
      primitive: 'sphere',
      color: '#ffffff',
      width: 20,
      height: 20,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 1},
      end: {x: 0.5, y: 0},
      patterns: [
        {id: 'spots', type: 'spots', color: '#000000', opacity: 1, density: 8, size: 0.04, seed: 0.73},
      ],
    };
    const first = mockContext();
    const second = mockContext();

    drawGraphicPaint(first.context, graphic, 128, 256);
    drawGraphicPaint(second.context, graphic, 128, 256);

    expect(first.arcs).toEqual(second.arcs);
  });

  it('steers side veins toward the tip or the leaf base', () => {
    const towardTip = mockContext();
    const towardBase = mockContext();
    const graphic = (angle: number): FlowerNodeGraphic => ({
      primitive: 'leaf-pointed',
      color: '#477b49',
      width: 40,
      height: 80,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 1},
      end: {x: 0.5, y: 0},
      patterns: [
        {id: 'veins', type: 'veins', color: '#173f2a', opacity: 1, density: 1, angle},
      ],
    });

    drawGraphicPaint(towardTip.context, graphic(35), 100, 200);
    drawGraphicPaint(towardBase.context, graphic(-35), 100, 200);

    expect(towardTip.lineTo.mock.calls[1]![1]).toBeLessThan(100);
    expect(towardBase.lineTo.mock.calls[1]![1]).toBeGreaterThan(100);
  });
});

function mockContext(): {
  context: CanvasRenderingContext2D;
  arcs: number[][];
  gradientStops: Array<[number, string]>;
  fillRect: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
} {
  const arcs: number[][] = [];
  const gradientStops: Array<[number, string]> = [];
  const fillRect = vi.fn();
  const lineTo = vi.fn();
  const stroke = vi.fn();
  const context = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    clearRect: vi.fn(),
    fillRect,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo,
    stroke,
    arc: (x: number, y: number, radius: number, start: number, end: number) => {
      arcs.push([x, y, radius, start, end]);
    },
    fill: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: (offset: number, color: string) => gradientStops.push([offset, color]),
    })),
  } as unknown as CanvasRenderingContext2D;
  return {context, arcs, gradientStops, fillRect, lineTo, stroke};
}
