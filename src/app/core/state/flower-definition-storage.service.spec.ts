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
