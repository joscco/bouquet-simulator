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

  it('copies a flower instance including instance-level settings', () => {
    const store = new BouquetStore();
    const source = store.state().flowers[0]!;

    store.setFlowerCut(source.instanceId, 0.42);
    store.copyFlower(source.instanceId);

    const flowers = store.state().flowers.filter((flower) => flower.definitionId === source.definitionId);
    expect(flowers).toHaveLength(2);
    expect(flowers[1]!.instanceId).not.toBe(source.instanceId);
    expect(flowers[1]!.cutRatio).toBeCloseTo(0.42);
    expect(flowers[1]!.seed).toBe(source.seed);
  });

  it('clamps flower shortening per instance', () => {
    const store = new BouquetStore();
    const source = store.state().flowers[0]!;

    store.setFlowerCut(source.instanceId, 5);

    expect(store.state().flowers[0]!.cutRatio).toBeCloseTo(0.98);
  });

  it('reports bouquet and embedded-component usage of a definition', () => {
    const store = new BouquetStore();
    const target = store.definitions()[0]!;
    const consumer = structuredClone(store.definitions()[1]!);
    consumer.id = 'component-consumer';
    consumer.name = 'Komponenten-Nutzer';
    consumer.nodes[0]!.component = {
      schemaVersion: 1,
      id: 'embedded-target',
      name: 'Eingebettete Komponente',
      rootNodeId: 'inner-root',
      sourceDefinitionId: target.id,
      nodes: [{
        id: 'inner-root',
        name: 'Intern',
        draggable: false,
        graphic: null,
        connections: [],
      }],
    };
    store.definitions.set([target, consumer]);

    const usage = store.definitionUsage(target.id);

    expect(usage.bouquetInstances).toBeGreaterThan(0);
    expect(usage.componentDefinitions).toEqual([
      {id: consumer.id, name: consumer.name},
    ]);
    expect(store.componentUsage('embedded-target')).toEqual([
      {id: consumer.id, name: consumer.name},
    ]);
  });

  it('removes a definition together with its bouquet instances', () => {
    const store = new BouquetStore();
    const targetId = store.state().flowers[0]!.definitionId;

    store.removeDefinition(targetId);

    expect(store.definitions().some((definition) => definition.id === targetId)).toBe(false);
    expect(store.state().flowers.some((flower) => flower.definitionId === targetId)).toBe(false);
  });
});
