import {describe, expect, it} from 'vitest';
import {BouquetFlower, BouquetState} from '../../core/models/flower.models';
import {bouquetFlowerRenderSignature} from './bouquet-flower-render-signature';

const FLOWER: BouquetFlower = {
  instanceId: 'flower-1',
  definitionId: 'rose',
  x: 12,
  y: 34,
  z: 56,
  scale: 1.2,
  leanX: 0.1,
  leanZ: 0.2,
  rotationY: 0.3,
  seed: 42,
  cutRatio: 0.15,
  nodeOffsets: {
    blossom: {x: 3, y: -2},
  },
};

describe('bouquetFlowerRenderSignature', () => {
  it('changes for every BouquetFlower property', () => {
    const changes: Record<keyof BouquetFlower, BouquetFlower> = {
      instanceId: {...FLOWER, instanceId: 'flower-2'},
      definitionId: {...FLOWER, definitionId: 'tulip'},
      x: {...FLOWER, x: FLOWER.x + 1},
      y: {...FLOWER, y: FLOWER.y + 1},
      z: {...FLOWER, z: FLOWER.z + 1},
      scale: {...FLOWER, scale: FLOWER.scale + 0.1},
      leanX: {...FLOWER, leanX: FLOWER.leanX! + 0.1},
      leanZ: {...FLOWER, leanZ: FLOWER.leanZ! + 0.1},
      rotationY: {...FLOWER, rotationY: FLOWER.rotationY! + 0.1},
      seed: {...FLOWER, seed: FLOWER.seed + 1},
      cutRatio: {...FLOWER, cutRatio: FLOWER.cutRatio! + 0.1},
      nodeOffsets: {...FLOWER, nodeOffsets: {blossom: {x: 4, y: -2}}},
    };
    const initial = bouquetFlowerRenderSignature([FLOWER]);

    for (const changed of Object.values(changes)) {
      expect(bouquetFlowerRenderSignature([changed])).not.toBe(initial);
    }
  });

  it('is stable for equivalent node-offset maps regardless of insertion order', () => {
    const left = {
      ...FLOWER,
      nodeOffsets: {a: {x: 1, y: 2}, b: {x: 3, y: 4}},
    };
    const right = {
      ...FLOWER,
      nodeOffsets: {b: {x: 3, y: 4}, a: {x: 1, y: 2}},
    };

    expect(bouquetFlowerRenderSignature([left])).toBe(bouquetFlowerRenderSignature([right]));
  });

  it('does not include rotation, background, or scene effects', () => {
    const state: BouquetState = {
      schemaVersion: 2,
      rotation: 0,
      backgroundMode: 'light',
      sceneEffects: {sparkles: false, glowPoints: false, uplight: false},
      flowers: [FLOWER],
    };
    const initial = bouquetFlowerRenderSignature(state.flowers);
    const presentationOnlyChanges: BouquetState[] = [
      {...state, rotation: Math.PI},
      {...state, backgroundMode: 'dark'},
      {...state, sceneEffects: {sparkles: true, glowPoints: true, uplight: true}},
    ];

    for (const changedState of presentationOnlyChanges) {
      expect(bouquetFlowerRenderSignature(changedState.flowers)).toBe(initial);
    }
  });

  it('preserves flower order because it can affect transparent rendering and picking', () => {
    const second = {...FLOWER, instanceId: 'flower-2'};
    expect(bouquetFlowerRenderSignature([FLOWER, second]))
      .not.toBe(bouquetFlowerRenderSignature([second, FLOWER]));
  });

  it('normalizes omitted optional values to their rendering defaults', () => {
    const omitted: BouquetFlower = {
      instanceId: 'flower-optional',
      definitionId: 'rose',
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed: 1,
    };
    const explicitDefaults: BouquetFlower = {
      ...omitted,
      leanX: 0,
      leanZ: 0,
      rotationY: 0,
      cutRatio: 0,
      nodeOffsets: {},
    };

    expect(bouquetFlowerRenderSignature([omitted]))
      .toBe(bouquetFlowerRenderSignature([explicitDefaults]));
  });
});
