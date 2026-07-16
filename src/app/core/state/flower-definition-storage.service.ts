import {Injectable, inject} from '@angular/core';
import {FlowerDefinition} from '../models/flower.models';
import {ADDITIONAL_DEFAULT_FLOWERS} from '../data/additional-default-flowers';
import {BouquetStore} from './bouquet.store';

@Injectable({providedIn: 'root'})
export class FlowerDefinitionStorage {
  static readonly STORAGE_KEY = 'bouquet-studio.flower-definitions.v1';
  private static readonly CATALOG_VERSION_KEY = 'bouquet-studio.flower-definitions.catalog-version';
  private static readonly CATALOG_VERSION = 3;

  private readonly store = inject(BouquetStore);
  readonly restoredFromStorage = this.restoreDefinitions();

  saveDefinitions(definitions: FlowerDefinition[] = this.store.definitions()): void {
    try {
      const storage = globalThis.localStorage;
      if (!storage) throw new Error('Lokaler Browserspeicher ist nicht verfügbar.');
      storage.setItem(FlowerDefinitionStorage.STORAGE_KEY, JSON.stringify(definitions));
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
      const migrated = storedVersion < FlowerDefinitionStorage.CATALOG_VERSION
        ? withNewCatalogEntries(parsed)
        : parsed;
      if (this.store.restoreDefinitions(migrated)) {
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

function withNewCatalogEntries(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const defaultsById = new Map(ADDITIONAL_DEFAULT_FLOWERS.map((definition) => [definition.id, definition]));
  const migrated = value.map((entry) => withNewPlacementDefaults(entry, defaultsById));
  const existingIds = new Set(migrated
    .filter((entry): entry is {id: unknown} => !!entry && typeof entry === 'object' && 'id' in entry)
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string'));
  return [
    ...migrated,
    ...ADDITIONAL_DEFAULT_FLOWERS
      .filter((definition) => !existingIds.has(definition.id))
      .map((definition) => structuredClone(definition)),
  ];
}

function withNewPlacementDefaults(
  entry: unknown,
  defaultsById: ReadonlyMap<string, FlowerDefinition>,
): unknown {
  if (!isRecord(entry) || typeof entry['id'] !== 'string' || !Array.isArray(entry['nodes'])) return entry;
  const defaultDefinition = defaultsById.get(entry['id']);
  if (!defaultDefinition) return entry;
  const defaultNodes = new Map(defaultDefinition.nodes.map((node) => [node.id, node]));
  return {
    ...entry,
    nodes: entry['nodes'].map((node) => {
      if (!isRecord(node) || typeof node['id'] !== 'string' || !isRecord(node['incoming'])) return node;
      const placement = defaultNodes.get(node['id'])?.incoming?.placement;
      if (!placement || node['incoming']['placement'] !== undefined) return node;
      return {...node, incoming: {...node['incoming'], placement: structuredClone(placement)}};
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
