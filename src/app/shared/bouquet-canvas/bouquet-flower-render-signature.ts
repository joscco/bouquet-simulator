import {BouquetFlower} from '../../core/models/flower.models';

/**
 * Captures every flower value that contributes to the Three.js bouquet runtime.
 * The exhaustive `satisfies` check makes a newly added BouquetFlower field a
 * compile-time prompt to decide how it affects rendering.
 */
export function bouquetFlowerRenderSignature(flowers: readonly BouquetFlower[]): string {
  return JSON.stringify(flowers.map((flower) => ({
    instanceId: flower.instanceId,
    definitionId: flower.definitionId,
    x: flower.x,
    y: flower.y,
    z: flower.z,
    scale: flower.scale,
    leanX: flower.leanX ?? 0,
    leanZ: flower.leanZ ?? 0,
    rotationY: flower.rotationY ?? 0,
    seed: flower.seed,
    cutRatio: flower.cutRatio ?? 0,
    nodeOffsets: Object.entries(flower.nodeOffsets ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([nodeId, offset]) => [nodeId, offset.x, offset.y]),
  } satisfies Record<keyof BouquetFlower, unknown>)));
}
