import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {BouquetStore} from './bouquet.store';
import {FlowerDefinitionStorage} from './flower-definition-storage.service';

describe('FlowerDefinitionStorage', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    globalThis.localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('restores a valid browser-local catalog when first created', () => {
    const store = TestBed.inject(BouquetStore);
    const definitions = structuredClone(store.definitions());
    definitions[0]!.name = 'Lokal gespeicherte Rose';
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify(definitions),
    );

    const storage = TestBed.inject(FlowerDefinitionStorage);

    expect(storage.restoredFromStorage).toBe(true);
    expect(store.definitions()[0]!.name).toBe('Lokal gespeicherte Rose');
  });

  it('persists the current catalog independently of bouquet projects', () => {
    const store = TestBed.inject(BouquetStore);
    const storage = TestBed.inject(FlowerDefinitionStorage);
    const definitions = structuredClone(store.definitions());
    definitions[0]!.name = 'Gespeicherte Definition';

    storage.saveDefinitions(definitions);

    const persisted = JSON.parse(globalThis.localStorage.getItem(
      FlowerDefinitionStorage.STORAGE_KEY,
    )!) as typeof definitions;
    expect(persisted[0]!.name).toBe('Gespeicherte Definition');
  });

  it('adds new built-in flowers once to an older locally saved catalog', () => {
    const store = TestBed.inject(BouquetStore);
    const oldCatalog = structuredClone(store.definitions())
      .filter((definition) => !['sunflower', 'tulip', 'lavender'].includes(definition.id));
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify(oldCatalog),
    );

    TestBed.inject(FlowerDefinitionStorage);

    expect(store.definitions().filter((definition) =>
      ['sunflower', 'tulip', 'lavender'].includes(definition.id))).toHaveLength(3);
  });

  it('adds new placement settings without overwriting the rest of a local flower', () => {
    const store = TestBed.inject(BouquetStore);
    const oldCatalog = structuredClone(store.definitions());
    const sunflower = oldCatalog.find((definition) => definition.id === 'sunflower')!;
    sunflower.name = 'Meine Sonnenblume';
    delete sunflower.nodes.find((node) => node.id === 'seed-crown')!.incoming!.placement;
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify(oldCatalog),
    );

    TestBed.inject(FlowerDefinitionStorage);

    const restored = store.definitions().find((definition) => definition.id === 'sunflower')!;
    expect(restored.name).toBe('Meine Sonnenblume');
    expect(restored.nodes.find((node) => node.id === 'seed-crown')!.incoming!.placement)
      .toEqual({mode: 'disc', orientation: 'parent'});
  });

  it('removes an invalid stored catalog and keeps built-in defaults', () => {
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify([{schemaVersion: 2, id: 'broken'}]),
    );
    const store = TestBed.inject(BouquetStore);

    const storage = TestBed.inject(FlowerDefinitionStorage);

    expect(storage.restoredFromStorage).toBe(false);
    expect(store.definitions().length).toBeGreaterThan(0);
    expect(globalThis.localStorage.getItem(FlowerDefinitionStorage.STORAGE_KEY)).toBeNull();
  });
});
