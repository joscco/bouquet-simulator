import {Injectable} from '@angular/core';

const FLOWER_QUERY_PARAMETER = 'flower';

/** Keeps the currently edited catalog entry shareable without creating history noise. */
@Injectable({providedIn: 'root'})
export class FlowerEditorUrlState {
  readCatalogKey(): string | null {
    const value = new URL(window.location.href).searchParams.get(FLOWER_QUERY_PARAMETER)?.trim();
    if (!value) return null;
    return value.includes(':') ? value : `definition:${value}`;
  }

  writeCatalogKey(catalogKey: string): void {
    const url = new URL(window.location.href);
    const queryValue = catalogKey.startsWith('definition:')
      ? catalogKey.slice('definition:'.length)
      : catalogKey;
    if (!queryValue || url.searchParams.get(FLOWER_QUERY_PARAMETER) === queryValue) return;
    url.searchParams.set(FLOWER_QUERY_PARAMETER, queryValue);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
}
