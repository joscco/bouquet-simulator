import type {FlowerDefinition} from '../models/flower.models';
import {DEFAULT_FLOWERS} from './default-flowers';

const DEFAULT_FLOWER_IDS = new Set(DEFAULT_FLOWERS.map((definition) => definition.id));

/** Returns whether an id belongs to a flower definition bundled with the application. */
export function isDefaultFlowerDefinitionId(id: string): boolean {
  return DEFAULT_FLOWER_IDS.has(id);
}

/** Keeps only browser-local flower definitions; bundled defaults are never persisted. */
export function localFlowerDefinitions(definitions: readonly FlowerDefinition[]): FlowerDefinition[] {
  return definitions
    .filter((definition) => !isDefaultFlowerDefinitionId(definition.id))
    .map((definition) => structuredClone(definition));
}

/**
 * Rebuilds the runtime catalog from authoritative bundled defaults plus local definitions.
 * Local data using a reserved default id is intentionally ignored so stale browser copies
 * cannot overwrite a newer bundled default.
 */
export function withBuiltInFlowerDefinitions(
  localDefinitions: readonly FlowerDefinition[],
): FlowerDefinition[] {
  return [
    ...DEFAULT_FLOWERS.map((definition) => structuredClone(definition)),
    ...localFlowerDefinitions(localDefinitions),
  ];
}
/**
 * Builds the source catalog written by the local authoring server. Only the current
 * definition is added/replaced; unrelated browser-local flowers are not promoted.
 */
export function upsertBuiltInFlowerDefinition(
  definition: FlowerDefinition,
  previousId = definition.id,
): FlowerDefinition[] {
  const defaults = DEFAULT_FLOWERS.map((entry) => structuredClone(entry));
  const index = defaults.findIndex((entry) => entry.id === previousId);
  if (index >= 0) defaults[index] = structuredClone(definition);
  else defaults.push(structuredClone(definition));
  return defaults;
}
