import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  isAvailableAsComponent,
  isAvailableInBouquet,
  normalizeFlowerCatalogCapabilities,
} from './flower-catalog';

describe('flower catalog capabilities', () => {
  it('migrates a historical flower to both catalogs', () => {
    const definition = {...structuredClone(DEFAULT_FLOWERS[0]!), catalogRole: 'flower' as const};

    expect(isAvailableInBouquet(definition)).toBe(true);
    expect(isAvailableAsComponent(definition)).toBe(true);
    expect(normalizeFlowerCatalogCapabilities(definition)).toEqual(expect.objectContaining({
      availableInBouquet: true,
      availableAsComponent: true,
    }));
  });

  it('keeps a historical component out of the bouquet while allowing references', () => {
    const definition = {...structuredClone(DEFAULT_FLOWERS[0]!), catalogRole: 'component' as const};

    expect(isAvailableInBouquet(definition)).toBe(false);
    expect(isAvailableAsComponent(definition)).toBe(true);
  });

  it('honors explicit independent capabilities', () => {
    const definition = {
      ...structuredClone(DEFAULT_FLOWERS[0]!),
      catalogRole: 'component' as const,
      availableInBouquet: true,
      availableAsComponent: false,
    };

    expect(isAvailableInBouquet(definition)).toBe(true);
    expect(isAvailableAsComponent(definition)).toBe(false);
  });
});
