import {FlowerDefinition} from '../../../core/models/flower.models';
import {
  migrateIncomingConnections,
  normalizeConnectionReferences,
} from '../../../core/models/flower-connections';
import {
  isAvailableAsComponent,
  isAvailableInBouquet,
  normalizeFlowerCatalogCapabilities,
} from '../../../core/models/flower-catalog';
import {
  FlowerSubtreeDefinition,
  createFlowerDefinitionComponent,
} from '../../../core/models/flower-subtree';
import {FlowerComponentCatalogEntry, slugify} from './flower-editor-definition';
import {withDerivedFlowerRoot} from './flower-editor-roots';
import {FLOWER_CREATION_DEFAULTS} from '../../../core/models/flower-creation-defaults';
import {upsertFlowerDefinitionById} from '../../../core/models/flower-definition-ids';

export function createFlowerEditorCatalog(
  definitions: readonly FlowerDefinition[],
  savedTrees: readonly FlowerSubtreeDefinition[],
): FlowerComponentCatalogEntry[] {
  return [
    ...definitions.map((definition) => ({
      key: `definition:${definition.id}`,
      source: 'definition' as const,
      availableInBouquet: isAvailableInBouquet(definition),
      availableAsComponent: isAvailableAsComponent(definition),
      tree: createFlowerDefinitionComponent(migrateIncomingConnections(definition)),
    })),
    ...savedTrees.map((tree) => ({
      key: `saved:${tree.id}`,
      source: 'saved' as const,
      availableInBouquet: false,
      availableAsComponent: true,
      tree,
    })),
  ];
}

export function createEmptyFlowerDefinition(id: string): FlowerDefinition {
  const defaults = FLOWER_CREATION_DEFAULTS;
  return {
    schemaVersion: 2,
    id,
    name: defaults.definition.name,
    catalogRole: 'flower',
    availableInBouquet: true,
    availableAsComponent: true,
    rootNodeId: defaults.definition.rootNodeId,
    stem: structuredClone(defaults.definition.stem),
    nodes: [{
      id: defaults.definition.rootNodeId,
      name: defaults.definition.rootNodeName,
      draggable: defaults.node.draggable,
      graphic: null,
      connections: [],
    }],
    editor: {nodePositions: {[defaults.definition.rootNodeId]: {x: 500, y: 840}}},
  };
}

export function duplicateFlowerDefinition(
  source: FlowerDefinition,
  id: string,
): FlowerDefinition {
  return {...structuredClone(source), id, name: `${source.name} Kopie`};
}

export function nextAvailableSlugId(
  seed: string,
  occupiedIds: Iterable<string>,
  fallback: string,
): string {
  const occupied = new Set(occupiedIds);
  const base = slugify(seed) || fallback;
  let id = base;
  let suffix = 2;
  while (occupied.has(id)) id = `${base}-${suffix++}`;
  return id;
}

export function normalizeFlowerDefinitionForEditor(
  definition: FlowerDefinition,
): FlowerDefinition {
  return withDerivedFlowerRoot(
    normalizeFlowerCatalogCapabilities(
      normalizeConnectionReferences(migrateIncomingConnections(definition)),
    ),
    definition.rootNodeId,
  );
}

export function upsertFlowerDefinition(
  definitions: readonly FlowerDefinition[],
  definition: FlowerDefinition,
  previousId?: string,
): FlowerDefinition[] {
  return upsertFlowerDefinitionById(definitions, definition, previousId);
}
