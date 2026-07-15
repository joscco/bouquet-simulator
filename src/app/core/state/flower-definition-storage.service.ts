import {Injectable, inject} from '@angular/core';
import {FlowerDefinition} from '../models/flower.models';
import {BouquetStore} from './bouquet.store';

@Injectable({providedIn: 'root'})
export class FlowerDefinitionStorage {
  static readonly STORAGE_KEY = 'bouquet-studio.flower-definitions.v1';

  private readonly store = inject(BouquetStore);
  readonly restoredFromStorage = this.restoreDefinitions();

  saveDefinitions(definitions: FlowerDefinition[] = this.store.definitions()): void {
    try {
      const storage = globalThis.localStorage;
      if (!storage) throw new Error('Lokaler Browserspeicher ist nicht verfügbar.');
      storage.setItem(FlowerDefinitionStorage.STORAGE_KEY, JSON.stringify(definitions));
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
      if (this.store.restoreDefinitions(JSON.parse(serialized))) return true;
      storage?.removeItem(FlowerDefinitionStorage.STORAGE_KEY);
      return false;
    } catch {
      return false;
    }
  }
}
