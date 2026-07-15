import {
  FlowerDefinition,
  FlowerNodeComponent,
  FlowerNodeConnection,
  FlowerNodeDefinition,
} from '../../../core/models/flower.models';
import {connectionFromIncoming, normalizeConnectionReferences} from '../../../core/models/flower-connections';
import {FlowerSubtreeDefinition} from '../../../core/models/flower-subtree';
import {Point} from '../graph/flower-editor-graph';

export interface FlowerComponentCatalogEntry {
  key: string;
  source: 'definition' | 'saved';
  availableInBouquet: boolean;
  availableAsComponent: boolean;
  tree: FlowerSubtreeDefinition;
}

export function catalogEntryType(entry: FlowerComponentCatalogEntry): string {
  if (entry.source === 'saved') return 'Extrahierte Komponente';
  if (entry.availableInBouquet && entry.availableAsComponent) return 'Blume + Komponente';
  if (entry.availableInBouquet) return 'Blume';
  if (entry.availableAsComponent) return 'Komponente';
  return 'Nur im Katalog';
}

export function componentOutputCount(tree: FlowerNodeComponent): number {
  const nodes = tree.nodes ?? [];
  const ids = new Set(nodes.map((node) => node.id));
  if (tree.outputNodeIds !== undefined) {
    return tree.outputNodeIds.filter((id) => ids.has(id)).length;
  }
  const parents = new Set(nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  return nodes.filter((node) => !parents.has(node.id)).length;
}

export function definitionWithEditorState(
  definition: FlowerDefinition,
  nodePositions: Record<string, Point>,
): FlowerDefinition {
  return normalizeConnectionReferences({
    ...definition,
    editor: {nodePositions: structuredClone(nodePositions)},
  });
}

export function definitionFromComponent(
  tree: FlowerSubtreeDefinition,
  role: 'flower' | 'component',
  stem: FlowerDefinition['stem'],
): FlowerDefinition {
  const rootPosition = {x: 500, y: 840};
  const relativePositions = tree.editor?.nodePositions ?? {};
  return {
    schemaVersion: 2,
    id: tree.id,
    name: tree.name,
    catalogRole: role,
    availableInBouquet: role === 'flower',
    availableAsComponent: true,
    outputNodeIds: role === 'component' ? structuredClone(tree.outputNodeIds ?? []) : undefined,
    rootNodeId: tree.rootNodeId,
    stem: structuredClone(stem),
    nodes: structuredClone(tree.nodes),
    editor: {
      nodePositions: Object.fromEntries(tree.nodes.map((node) => {
        const relative = relativePositions[node.id] ?? {x: 0, y: 0};
        return [node.id, {x: rootPosition.x + relative.x, y: rootPosition.y + relative.y}];
      })),
    },
  };
}

export function selectedExternalConnections(
  definition: FlowerDefinition,
  memberNodeIds: string[],
): FlowerNodeConnection[] {
  const members = new Set(memberNodeIds);
  const incomingIds = new Set(definition.nodes
    .filter((node) => !!node.incoming)
    .map((node) => node.id));
  return definition.nodes
    .filter((node) => members.has(node.id))
    .flatMap((node) => node.connections.filter((connection) => !members.has(connection.childId)))
    .map((connection) => incomingIds.has(connection.childId)
      ? connectionFromIncoming(connection.childId)
      : structuredClone(connection));
}

export function definitionOutputNodeIds(nodes: FlowerNodeDefinition[]): string[] {
  const ids = new Set(nodes.map((node) => node.id));
  const parents = new Set(nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  return nodes.filter((node) => !parents.has(node.id)).map((node) => node.id);
}

export function nodeBounds(nodes: Array<{x: number; y: number; width: number; height: number}>): Point {
  if (!nodes.length) return {x: 500, y: 330};
  const left = Math.min(...nodes.map((node) => node.x - node.width / 2));
  const right = Math.max(...nodes.map((node) => node.x + node.width / 2));
  const top = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height / 2));
  return {x: (left + right) / 2, y: (top + bottom) / 2};
}

export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

export function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
