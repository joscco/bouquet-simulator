import {describe, expect, it} from 'vitest';
import {projectFlower, projectLocalAngle, projectLocalPoint, viewDeltaToLocalOffset, viewDeltaToWorld} from './projection';

const flower = {
  instanceId: 'one',
  definitionId: 'rose',
  x: 100,
  y: 20,
  z: 0,
  scale: 1,
  seed: 1,
};

describe('bouquet projection', () => {
  it('rotates world coordinates around the vertical bouquet axis', () => {
    expect(projectFlower(flower, Math.PI / 2).viewX).toBeCloseTo(0);
    expect(projectFlower(flower, Math.PI / 2).depth).toBeCloseTo(100);
  });

  it('maps a screen drag back into the currently rotated world', () => {
    const delta = viewDeltaToWorld(50, Math.PI / 2);
    expect(delta.x).toBeCloseTo(0);
    expect(delta.z).toBeCloseTo(-50);
  });

  it('rotates local node coordinates inside a flower', () => {
    const point = projectLocalPoint(80, -120, Math.PI / 2);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(-112);
    expect(point.depth).toBeCloseTo(80);
  });

  it('projects local growth angles with the same bouquet rotation', () => {
    const angle = projectLocalAngle(Math.PI / 2, Math.PI);
    expect(Math.sin(angle)).toBeLessThan(0);
  });

  it('maps a displayed node drag back into local flower offsets', () => {
    const delta = viewDeltaToLocalOffset(20, 5, 0);
    expect(delta.x).toBeCloseTo(20);
    expect(delta.y).toBeCloseTo(5);
  });
});
