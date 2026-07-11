import {describe, expect, it} from 'vitest';
import {BouquetStore} from './bouquet.store';

describe('bouquet flower placement', () => {
  it('moves and tilts the complete flower while keeping its insertion point in the vase', () => {
    const store = new BouquetStore();
    const before = store.state().flowers[0]!;

    store.moveFlower(before.instanceId, 300, -200, 180);

    const after = store.state().flowers[0]!;
    expect(Math.hypot(after.x, after.z)).toBeLessThanOrEqual(30.001);
    expect(after.y).toBeGreaterThanOrEqual(-18);
    expect(after.y).toBeLessThanOrEqual(-14);
    expect(Math.hypot(after.leanX ?? 0, after.leanZ ?? 0)).toBeLessThanOrEqual(0.421);
    expect(after.leanX).not.toBe(before.leanX);
    expect(after.leanZ).not.toBe(before.leanZ);
    expect(after.nodeOffsets).toEqual(before.nodeOffsets);
  });

  it('arranges all insertion points inside the vase and leans the flowers', () => {
    const store = new BouquetStore();
    store.shuffleBouquet();

    for (const flower of store.state().flowers) {
      expect(Math.hypot(flower.x, flower.z)).toBeLessThanOrEqual(28.001);
      expect(flower.y).toBeGreaterThanOrEqual(-18);
      expect(flower.y).toBeLessThanOrEqual(-14);
    }
    expect(store.state().flowers.some((flower) =>
      Math.abs(flower.leanX ?? 0) + Math.abs(flower.leanZ ?? 0) > 0.05)).toBe(true);
  });
});
