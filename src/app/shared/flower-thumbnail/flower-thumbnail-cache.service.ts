import {Injectable, signal} from '@angular/core';
import {DEFAULT_FLOWER_PREVIEWS} from '../../core/data/default-flower-previews';
import {FlowerDefinition} from '../../core/models/flower.models';
import {
  flowerThumbnailDefinitionId,
  flowerThumbnailKey,
} from './flower-thumbnail-key';

export type FlowerThumbnailStatus = 'idle' | 'loading' | 'ready' | 'missing';

interface StoredThumbnail {
  key: string;
  definitionId: string;
  blob: Blob;
}

const DATABASE_NAME = 'bouquet-studio-previews';
const STORE_NAME = 'flower-thumbnails';

@Injectable({providedIn: 'root'})
export class FlowerThumbnailCache {
  private readonly snapshots = signal<Record<string, string>>({});
  private readonly statuses = signal<Record<string, FlowerThumbnailStatus>>({});
  private readonly objectUrls = new Map<string, string>();
  private databasePromise: Promise<IDBDatabase | null> | null = null;

  keyFor(definition: FlowerDefinition): string {
    return flowerThumbnailKey(definition);
  }

  snapshot(key: string): string | null {
    return this.snapshots()[key] ?? null;
  }

  status(key: string): FlowerThumbnailStatus {
    return this.statuses()[key] ?? 'idle';
  }

  load(definition: FlowerDefinition): void {
    const key = this.keyFor(definition);
    if (this.status(key) !== 'idle') return;

    const bundled = DEFAULT_FLOWER_PREVIEWS[definition.id];
    if (bundled?.key === key) {
      this.setSnapshot(key, bundled.url);
      return;
    }

    this.setStatus(key, 'loading');
    void this.readStoredBlob(key).then((blob) => {
      if (!blob) {
        this.setStatus(key, 'missing');
        return;
      }
      this.setSnapshot(key, this.objectUrl(key, blob));
    });
  }

  store(key: string, dataUrl: string): void {
    if (!key || !dataUrl.startsWith('data:image/png')) return;
    const definitionId = flowerThumbnailDefinitionId(key);
    if (!definitionId) return;
    const blob = dataUrlToBlob(dataUrl);
    this.setSnapshot(key, dataUrl);
    void this.persistBlob({key, definitionId, blob});
  }

  storeBlob(definition: FlowerDefinition, blob: Blob): void {
    this.storeBlobByKey(this.keyFor(definition), definition.id, blob);
  }

  async deleteDefinition(definitionId: string): Promise<void> {
    this.removeMemoryEntriesForDefinition(definitionId);
    const database = await this.database();
    if (!database) return;
    await new Promise<void>((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const index = transaction.objectStore(STORE_NAME).index('definitionId');
      const request = index.openKeyCursor(IDBKeyRange.only(definitionId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        transaction.objectStore(STORE_NAME).delete(cursor.primaryKey);
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }

  markMissing(key: string): void {
    const objectUrl = this.objectUrls.get(key);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.objectUrls.delete(key);
    }
    this.snapshots.update((snapshots) => {
      if (!(key in snapshots)) return snapshots;
      const next = {...snapshots};
      delete next[key];
      return next;
    });
    this.setStatus(key, 'missing');
  }

  private storeBlobByKey(key: string, definitionId: string, blob: Blob): void {
    this.setSnapshot(key, this.objectUrl(key, blob));
    void this.persistBlob({key, definitionId, blob});
  }

  private setSnapshot(key: string, url: string): void {
    this.snapshots.update((snapshots) => ({...snapshots, [key]: url}));
    this.setStatus(key, 'ready');
  }

  private setStatus(key: string, status: FlowerThumbnailStatus): void {
    this.statuses.update((statuses) => ({...statuses, [key]: status}));
  }

  private objectUrl(key: string, blob: Blob): string {
    if (typeof URL.createObjectURL !== 'function') return '';
    const previous = this.objectUrls.get(key);
    if (previous) URL.revokeObjectURL(previous);
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(key, url);
    return url;
  }

  private removeMemoryEntriesForDefinition(definitionId: string): void {
    const matchingKeys = new Set([
      ...Object.keys(this.snapshots()),
      ...Object.keys(this.statuses()),
    ].filter((key) => flowerThumbnailDefinitionId(key) === definitionId));
    if (!matchingKeys.size) return;
    for (const key of matchingKeys) {
      const objectUrl = this.objectUrls.get(key);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      this.objectUrls.delete(key);
    }
    this.snapshots.update((snapshots) => withoutKeys(snapshots, matchingKeys));
    this.statuses.update((statuses) => withoutKeys(statuses, matchingKeys));
  }

  private async readStoredBlob(key: string): Promise<Blob | null> {
    const database = await this.database();
    if (!database) return null;
    return new Promise((resolve) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as StoredThumbnail | undefined)?.blob ?? null);
      request.onerror = () => resolve(null);
    });
  }

  private async persistBlob(record: StoredThumbnail): Promise<void> {
    const database = await this.database();
    if (!database) return;
    await new Promise<void>((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('definitionId');
      const cursorRequest = index.openKeyCursor(IDBKeyRange.only(record.definitionId));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          store.put(record);
          return;
        }
        if (cursor.primaryKey !== record.key) store.delete(cursor.primaryKey);
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  }

  private database(): Promise<IDBDatabase | null> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    this.databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE_NAME, {keyPath: 'key'});
        store.createIndex('definitionId', 'definitionId', {unique: false});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return this.databasePromise;
  }
}

function withoutKeys<T>(record: Record<string, T>, keys: ReadonlySet<string>): Record<string, T> {
  const next = {...record};
  for (const key of keys) delete next[key];
  return next;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], {type: mimeType});
}
