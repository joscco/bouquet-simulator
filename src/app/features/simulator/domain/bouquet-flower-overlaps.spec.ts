import {describe, expect, it} from 'vitest';
import {BouquetFlower, BouquetState, FlowerDefinition} from '../../../core/models/flower.models';
import {
  autoCorrectBouquetFlowerOverlaps,
  detectBouquetFlowerOverlaps,
} from '../../../core/rendering/bouquet-flower-overlaps';

const DEFINITION: FlowerDefinition = {
  schemaVersion: 2,
  id: 'test-flower',
  name: 'Testblume',
  rootNodeId: 'bloom',
  stem: {color: '#008000', highlightColor: '#00a000', width: 4, taper: 0.8},
  nodes: [{
    id: 'bloom',
    name: 'Blüte',
    draggable: false,
    graphic: {
      primitive: 'sphere',
      color: '#ff0000',
      width: 40,
      height: 40,
      depth: 40,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 1},
      end: {x: 0.5, y: 0},
    },
    connections: [],
  }],
};

describe('bouquet flower overlap detection', () => {
  it('reports strongly intersecting flower crowns', () => {
    const result = detectBouquetFlowerOverlaps(state([
      flower('first', 0),
      flower('second', 18),
    ]), [DEFINITION]);

    expect(result.overlaps).toEqual([{firstInstanceId: 'first', secondInstanceId: 'second'}]);
    expect([...result.flowerIds]).toEqual(['first', 'second']);
  });

  it('ignores crowns with enough space between them', () => {
    const result = detectBouquetFlowerOverlaps(state([
      flower('first', 0),
      flower('second', 80),
    ]), [DEFINITION]);

    expect(result.overlaps).toEqual([]);
    expect(result.flowerIds.size).toBe(0);
  });

  it('ignores instances without an available definition', () => {
    const result = detectBouquetFlowerOverlaps(state([
      flower('known', 0),
      {...flower('unknown', 0), definitionId: 'missing'},
    ]), [DEFINITION]);

    expect(result.overlaps).toEqual([]);
  });

  it('automatically separates strongly intersecting crowns', () => {
    const initial = state([flower('first', 0), flower('second', 0)]);

    const corrected = autoCorrectBouquetFlowerOverlaps(initial, [DEFINITION], 100);

    expect(detectBouquetFlowerOverlaps(corrected, [DEFINITION]).overlaps).toEqual([]);
    expect(corrected.flowers[0]!.x).not.toBe(initial.flowers[0]!.x);
    expect(corrected.flowers[1]!.x).not.toBe(initial.flowers[1]!.x);
  });
});

function state(flowers: BouquetFlower[]): BouquetState {
  return {schemaVersion: 2, rotation: 0, flowers};
}

function flower(instanceId: string, x: number): BouquetFlower {
  return {
    instanceId,
    definitionId: DEFINITION.id,
    x,
    y: 0,
    z: 0,
    scale: 1,
    seed: 0.5,
  };
}
