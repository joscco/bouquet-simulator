import {Injectable, inject} from '@angular/core';
import {FlowerDefinition} from '../models/flower.models';
import {BouquetStore} from './bouquet.store';
import {
  localFlowerDefinitions,
  withBuiltInFlowerDefinitions,
} from '../data/default-flower-catalog';

@Injectable({providedIn: 'root'})
export class FlowerDefinitionStorage {
  static readonly STORAGE_KEY = 'bouquet-studio.flower-definitions.v1';
  private static readonly CATALOG_VERSION_KEY = 'bouquet-studio.flower-definitions.catalog-version';
  private static readonly CATALOG_VERSION = 7;

  private readonly store = inject(BouquetStore);
  readonly restoredFromStorage = this.restoreDefinitions();

  saveDefinitions(definitions: FlowerDefinition[] = this.store.definitions()): void {
    try {
      const storage = globalThis.localStorage;
      if (!storage) throw new Error('Lokaler Browserspeicher ist nicht verfügbar.');
      storage.setItem(
        FlowerDefinitionStorage.STORAGE_KEY,
        JSON.stringify(localFlowerDefinitions(definitions)),
      );
      storage.setItem(
        FlowerDefinitionStorage.CATALOG_VERSION_KEY,
        String(FlowerDefinitionStorage.CATALOG_VERSION),
      );
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error && error.message
          ? error.message
          : 'Definitionen konnten nicht im Browser gespeichert werden.',
      );
    }
  }

  trySaveDefinitions(definitions: FlowerDefinition[] = this.store.definitions()): boolean {
    try {
      this.saveDefinitions(definitions);
      return true;
    } catch {
      return false;
    }
  }

  private restoreDefinitions(): boolean {
    try {
      const storage = globalThis.localStorage;
      const serialized = storage?.getItem(FlowerDefinitionStorage.STORAGE_KEY);
      if (!serialized) return false;
      const storedVersion = Number(storage?.getItem(FlowerDefinitionStorage.CATALOG_VERSION_KEY) ?? 1);
      const parsed = JSON.parse(serialized) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Ungültiger lokaler Blumenkatalog.');
      const restored = withBuiltInFlowerDefinitions(parsed as FlowerDefinition[]);
      if (this.store.restoreDefinitions(restored)) {
        if (storedVersion < FlowerDefinitionStorage.CATALOG_VERSION) {
          this.saveDefinitions(this.store.definitions());
        }
        return true;
      }
      storage?.removeItem(FlowerDefinitionStorage.STORAGE_KEY);
      storage?.removeItem(FlowerDefinitionStorage.CATALOG_VERSION_KEY);
      return false;
    } catch {
      return false;
    }
  }
}
