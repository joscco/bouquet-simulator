import {describe, expect, it} from 'vitest';
import {projectFlower, viewDeltaToWorld} from './projection';

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
});
