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
  return {
    schemaVersion: 2,
    id,
    name: 'Neue Blume',
    catalogRole: 'flower',
    availableInBouquet: true,
    availableAsComponent: true,
    rootNodeId: 'base',
    stem: {color: '#426f50', highlightColor: '#82a878', width: 8, taper: 1, bend: 0, curve: 14},
    nodes: [{id: 'base', name: 'Basis', draggable: false, graphic: null, connections: []}],
    editor: {nodePositions: {base: {x: 500, y: 840}}},
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
): FlowerDefinition[] {
  return definitions.some((candidate) => candidate.id === definition.id)
    ? definitions.map((candidate) => candidate.id === definition.id ? definition : candidate)
    : [...definitions, definition];
}
