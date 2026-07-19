import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {BouquetStore} from './bouquet.store';
import {FlowerDefinitionStorage} from './flower-definition-storage.service';
import {DEFAULT_FLOWERS} from '../data/default-flowers';

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

  it('normalizes legacy spread settings without overwriting the rest of a local flower', () => {
    const store = TestBed.inject(BouquetStore);
    const oldCatalog = structuredClone(store.definitions())
      .filter((definition) => definition.id !== 'tulip');
    const tulip = structuredClone(
      DEFAULT_FLOWERS.find((definition) => definition.id === 'tulip')!,
    );
    tulip.name = 'Meine Tulpe';
    const petal = tulip.nodes.find((node) => node.id === 'outer-petal')!;
    petal.incoming = {
      ...petal.incoming!,
      spread: undefined,
      angle: {min: 17, max: 30},
      azimuth: {min: 0, max: 360},
      randomness: 0.05,
      placement: {mode: 'ring', orientation: 'radial'},
    };
    oldCatalog.push(tulip);
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify(oldCatalog),
    );

    TestBed.inject(FlowerDefinitionStorage);

    const restored = store.definitions().find((definition) => definition.id === 'tulip')!;
    expect(restored.name).toBe('Meine Tulpe');
    expect(restored.nodes.find((node) => node.id === 'outer-petal')!.incoming!.spread)
      .toMatchObject({
        deviation: {min: 90, max: 90},
        revolution: {min: -180, max: 180},
        orientation: 'spread',
      });
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
