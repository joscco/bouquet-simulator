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
    const local = structuredClone(store.definitions()[0]!);
    local.id = 'meine-rose';
    local.name = 'Lokal gespeicherte Rose';
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify([local]),
    );

    const storage = TestBed.inject(FlowerDefinitionStorage);

    expect(storage.restoredFromStorage).toBe(true);
    expect(store.definitions().find((definition) => definition.id === 'meine-rose')?.name)
      .toBe('Lokal gespeicherte Rose');
    expect(store.definitions().find((definition) => definition.id === DEFAULT_FLOWERS[0]!.id)?.name)
      .toBe(DEFAULT_FLOWERS[0]!.name);
  });

  it('persists the current catalog independently of bouquet projects', () => {
    const store = TestBed.inject(BouquetStore);
    const storage = TestBed.inject(FlowerDefinitionStorage);
    const local = structuredClone(store.definitions()[0]!);
    local.id = 'lokale-definition';
    local.name = 'Gespeicherte Definition';
    const definitions = [...structuredClone(store.definitions()), local];

    storage.saveDefinitions(definitions);

    const persisted = JSON.parse(globalThis.localStorage.getItem(
      FlowerDefinitionStorage.STORAGE_KEY,
    )!) as typeof definitions;
    expect(persisted).toHaveLength(1);
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

  it('keeps built-in defaults authoritative when an older catalog contains modified copies', () => {
    const store = TestBed.inject(BouquetStore);
    const tulip = structuredClone(
      DEFAULT_FLOWERS.find((definition) => definition.id === 'tulip')!,
    );
    tulip.name = 'Meine Tulpe';
    globalThis.localStorage.setItem(
      FlowerDefinitionStorage.STORAGE_KEY,
      JSON.stringify([tulip]),
    );

    TestBed.inject(FlowerDefinitionStorage);

    const restored = store.definitions().find((definition) => definition.id === 'tulip')!;
    expect(restored.name).toBe(DEFAULT_FLOWERS.find((definition) => definition.id === 'tulip')!.name);
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
