import {Injectable, inject} from '@angular/core';
import {BouquetStore} from '../../core/state/bouquet.store';

@Injectable({providedIn: 'root'})
export class BouquetProjectStorage {
  private static readonly BOUQUET_STORAGE_KEY = 'bouquet-studio.current-bouquet.v1';

  private readonly store = inject(BouquetStore);

  restoreProject(): void {
    try {
      const serialized = globalThis.localStorage?.getItem(BouquetProjectStorage.BOUQUET_STORAGE_KEY);
      if (!serialized) return;
      const parsed = JSON.parse(serialized) as unknown;
      if (
        !this.store.restoreProjectState(parsed)
        && !this.store.restoreProject(parsed)
        && !this.store.restoreBouquet(parsed)
      ) {
        globalThis.localStorage?.removeItem(BouquetProjectStorage.BOUQUET_STORAGE_KEY);
      }
    } catch {
      this.clearBouquet();
    }
  }

  persistProject(project: unknown): void {
    try {
      globalThis.localStorage?.setItem(
        BouquetProjectStorage.BOUQUET_STORAGE_KEY,
        JSON.stringify(project),
      );
    } catch {
      // The editor remains usable when storage is unavailable or full.
    }
  }

  private clearBouquet(): void {
    try {
      globalThis.localStorage?.removeItem(BouquetProjectStorage.BOUQUET_STORAGE_KEY);
    } catch {
      // LocalStorage may be unavailable, for example in a restricted browser context.
    }
  }
}
