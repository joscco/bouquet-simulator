import {FlowerDefinition} from './flower.models';

export function isAvailableInBouquet(definition: FlowerDefinition): boolean {
  return definition.availableInBouquet ?? definition.catalogRole !== 'component';
}

export function isAvailableAsComponent(definition: FlowerDefinition): boolean {
  // Definitions were historically all offered by the component catalog,
  // independent of catalogRole. Preserve that behavior during migration.
  return definition.availableAsComponent ?? true;
}

export function normalizeFlowerCatalogCapabilities(definition: FlowerDefinition): FlowerDefinition {
  return {
    ...definition,
    availableInBouquet: isAvailableInBouquet(definition),
    availableAsComponent: isAvailableAsComponent(definition),
  };
}
