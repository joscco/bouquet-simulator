import {describe, expect, it} from 'vitest';
import {BouquetStore} from './bouquet.store';
import {detectBouquetFlowerOverlaps} from '../rendering/bouquet-flower-overlaps';
import {DEFAULT_VASE_MATERIAL_ID} from '../data/vases';

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

  it('keeps insertion points inside the narrow bud vase', () => {
    const store = new BouquetStore();

    store.setVase('bud');
    store.shuffleBouquet();
    store.moveFlower(store.state().flowers[0]!.instanceId, 300, 0, 180);

    for (const flower of store.state().flowers) {
      expect(Math.hypot(flower.x, flower.z)).toBeLessThanOrEqual(14.001);
    }
  });

  it('changes and persists the vase material independently from shape and flowers', () => {
    const store = new BouquetStore();
    const vaseId = store.state().vaseId;
    const flowers = structuredClone(store.state().flowers);

    store.setVaseMaterial('glass');
    const exported = store.exportProject();
    const restored = new BouquetStore();
    restored.importProject(structuredClone(exported));

    expect(store.state().vaseMaterialId).toBe('glass');
    expect(store.state().vaseId).toBe(vaseId);
    expect(store.state().flowers).toEqual(flowers);
    expect(exported.bouquet.vaseMaterialId).toBe('glass');
    expect(restored.state().vaseMaterialId).toBe('glass');
  });

  it('migrates bouquets without a material to stoneware', () => {
    const store = new BouquetStore();
    const legacy = structuredClone(store.state());
    delete legacy.vaseMaterialId;

    expect(store.restoreBouquet(legacy)).toBe(true);
    expect(store.state().vaseMaterialId).toBe(DEFAULT_VASE_MATERIAL_ID);
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

  it('automatically separates crowns after copying a flower', () => {
    const store = new BouquetStore();

    store.copyFlower(store.state().flowers[0]!.instanceId);

    expect(detectBouquetFlowerOverlaps(
      store.state(),
      store.materializedDefinitions(),
    ).overlaps).toEqual([]);
  });

  it('clamps flower shortening per instance', () => {
    const store = new BouquetStore();
    const source = store.state().flowers[0]!;

    store.setFlowerCut(source.instanceId, 5);

    expect(store.state().flowers[0]!.cutRatio).toBeCloseTo(0.98);
  });

  it('stores and restores flower rotation on the bouquet instance', () => {
    const store = new BouquetStore();
    const source = store.state().flowers[0]!;

    store.setFlowerRotation(source.instanceId, Math.PI / 3);
    const exported = store.exportProject();
    const restoredStore = new BouquetStore();
    restoredStore.importProject(structuredClone(exported));

    expect(store.state().flowers[0]!.rotationY).toBeCloseTo(Math.PI / 3);
    expect(store.definitions()[0]).not.toHaveProperty('rotationY');
    expect(exported.bouquet.flowers[0]!.rotationY).toBeCloseTo(Math.PI / 3);
    expect(restoredStore.state().flowers[0]!.rotationY).toBeCloseTo(Math.PI / 3);
    expect(restoredStore.definitions()[0]).not.toHaveProperty('rotationY');
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

  it('restores a valid persisted bouquet', () => {
    const store = new BouquetStore();
    const persisted = structuredClone(store.state());
    persisted.rotation = 1.25;
    persisted.flowers[0]!.cutRatio = 0.37;

    expect(store.restoreBouquet(persisted)).toBe(true);
    expect(store.state()).toEqual(persisted);
    expect(store.state()).not.toBe(persisted);
  });

  it('restores persisted project state without replacing current definitions', () => {
    const store = new BouquetStore();
    const persisted = store.exportProject();
    const currentDefinition = structuredClone(store.definitions()[0]!);
    currentDefinition.name = 'Aktuelle Definition';
    persisted.definitions[0] = {
      ...structuredClone(currentDefinition),
      name: 'Veraltete Definition',
    };
    store.definitions.update((definitions) => definitions.map((definition, index) =>
      index === 0 ? currentDefinition : definition));

    expect(store.restoreProjectState(persisted)).toBe(true);

    expect(store.definitions()[0]!.name).toBe('Aktuelle Definition');
    expect(store.state()).toEqual(persisted.bouquet);
  });

  it('keeps compatible bouquet instances when local definitions are authoritative', () => {
    const store = new BouquetStore();
    const persisted = store.exportProject();
    const removedDefinitionId = persisted.bouquet.flowers[0]!.definitionId;
    const remainingInstanceIds = persisted.bouquet.flowers
      .filter((flower) => flower.definitionId !== removedDefinitionId)
      .map((flower) => flower.instanceId);
    store.removeDefinition(removedDefinitionId);

    expect(store.restoreProjectState(persisted, true)).toBe(true);
    expect(store.definitions().some((definition) => definition.id === removedDefinitionId)).toBe(false);
    expect(store.state().flowers.map((flower) => flower.instanceId)).toEqual(remainingInstanceIds);
  });

  it('restores a valid definition catalog without changing the bouquet state', () => {
    const store = new BouquetStore();
    const bouquet = structuredClone(store.state());
    const definitions = structuredClone(store.definitions());
    definitions[0]!.name = 'Browserlokale Rose';

    expect(store.restoreDefinitions(definitions)).toBe(true);
    expect(store.definitions()[0]!.name).toBe('Browserlokale Rose');
    expect(store.state()).toEqual(bouquet);
  });

  it('rejects an invalid definition catalog', () => {
    const store = new BouquetStore();
    const definitions = structuredClone(store.definitions());

    expect(store.restoreDefinitions([])).toBe(false);
    expect(store.restoreDefinitions([{schemaVersion: 2, id: 'broken'}])).toBe(false);
    expect(store.definitions()).toEqual(definitions);
  });

  it('rejects invalid or outdated persisted bouquets', () => {
    const store = new BouquetStore();
    const previous = structuredClone(store.state());
    const unknownDefinition = structuredClone(previous);
    unknownDefinition.flowers[0]!.definitionId = 'missing-definition';

    expect(store.restoreBouquet({schemaVersion: 2, rotation: 'wrong', flowers: []})).toBe(false);
    expect(store.restoreBouquet(unknownDefinition)).toBe(false);
    expect(store.state()).toEqual(previous);
  });

  it('creates up to four named bouquets and switches between their states', () => {
    const store = new BouquetStore();
    const firstBouquetId = store.activeBouquetId();
    const firstFlowerCount = store.flowerCount();

    store.renameActiveBouquet('Sommer');
    store.addBouquet();
    const secondBouquetId = store.activeBouquetId();
    store.renameActiveBouquet('Tisch');

    expect(store.bouquetSummaries()).toEqual([
      expect.objectContaining({id: firstBouquetId, index: 1, name: 'Sommer', flowerCount: firstFlowerCount}),
      expect.objectContaining({id: secondBouquetId, index: 2, name: 'Tisch', flowerCount: 0}),
    ]);

    store.addFlower('garden-rose');
    expect(store.flowerCount()).toBe(1);

    store.selectBouquet(firstBouquetId);
    expect(store.activeBouquetName()).toBe('Sommer');
    expect(store.flowerCount()).toBe(firstFlowerCount);

    store.selectBouquet(secondBouquetId);
    expect(store.activeBouquetName()).toBe('Tisch');
    expect(store.flowerCount()).toBe(1);
  });

  it('limits bouquets to four and exports the active bouquet collection', () => {
    const store = new BouquetStore();
    store.addBouquet();
    store.addBouquet();
    store.addBouquet();
    store.addBouquet();

    expect(store.bouquets()).toHaveLength(4);
    expect(store.canAddBouquet()).toBe(false);

    const exported = store.exportProject();
    expect(exported.bouquets).toHaveLength(4);
    expect(exported.activeBouquetId).toBe(store.activeBouquetId());
    expect(exported.bouquet).toEqual(store.state());
  });

  it('removes bouquets while keeping a valid active bouquet', () => {
    const store = new BouquetStore();
    const firstBouquetId = store.activeBouquetId();
    store.addBouquet();
    const secondBouquetId = store.activeBouquetId();
    store.addFlower('garden-rose');

    store.removeBouquet(secondBouquetId);

    expect(store.bouquets()).toHaveLength(1);
    expect(store.activeBouquetId()).toBe(firstBouquetId);
    expect(store.flowerCount()).toBeGreaterThan(1);

    store.removeBouquet(firstBouquetId);

    expect(store.bouquets()).toHaveLength(1);
    expect(store.activeBouquetId()).toBe(firstBouquetId);
  });
});
