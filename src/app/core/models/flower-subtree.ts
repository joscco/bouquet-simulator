import {
  FlowerDefinition,
  FlowerNodeComponent,
  FlowerNodeDefinition,
  FlowerNodeIncomingConnection,
} from './flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  connectionFromIncoming,
  nodeIncomingOrDefault,
} from './flower-connections';
import {clamp} from '../utils/numbers';

export interface FlowerSubtreeDefinition extends FlowerNodeComponent {
  schemaVersion: 1;
  id: string;
  name: string;
  rootNodeId: string;
  createdAt: string;
  sourceDefinitionId?: string;
  nodes: FlowerNodeDefinition[];
  editor?: {
    /** Position relativ zum Wurzelknoten der Komponente. */
    nodePositions: Record<string, { x: number; y: number }>;
  };
}

export interface FlowerSubtreeSelection {
  rootNodeId: string;
  nodeIds: Set<string>;
}

export interface InsertedFlowerSubtree {
  definition: FlowerDefinition;
  nodePositions: Record<string, { x: number; y: number }>;
  insertedNodeId: string;
}

/**
 * Ermittelt den kleinsten zusammenhängenden Baum, der alle markierten Knoten enthält.
 * Die Verbindungen einer FlowerDefinition bilden durch die Validierung einen gerichteten Baum.
 */
export function resolveFlowerSubtreeSelection(
  definition: FlowerDefinition,
  anchorIds: Iterable<string>,
): FlowerSubtreeSelection | null {
  const nodeIds = new Set(definition.nodes.map((node) => node.id));
  const anchors = [...new Set(anchorIds)].filter((id) => nodeIds.has(id));
  if (!anchors.length) {
    return null;
  }

  const parentByChild = new Map<string, string>();
  for (const node of definition.nodes) {
    for (const connection of node.connections) {
      if (!parentByChild.has(connection.childId)) {
        parentByChild.set(connection.childId, node.id);
      }
    }
  }

  const rootPaths = anchors.map((id) => pathFromRoot(id, parentByChild));
  const rootNodeId = lowestCommonAncestor(rootPaths);
  if (!rootNodeId) {
    return null;
  }

  const selected = new Set<string>();
  for (const path of rootPaths) {
    const rootIndex = path.indexOf(rootNodeId);
    if (rootIndex < 0) {
      return null;
    }
    for (const id of path.slice(rootIndex)) {
      selected.add(id);
    }
  }
  includeNestedLoopMembers(definition, selected);
  return {rootNodeId, nodeIds: selected};
}

/**
 * Eine Schleife ist im Editor ein einzelner sichtbarer Strukturknoten, besitzt
 * aber fachlich weitere Knoten. Sobald der Schleifenknoten Teil einer Auswahl
 * ist, gehören deshalb auch seine Mitglieder und die Mitglieder darin
 * verschachtelter Schleifen zur selben Auswahl.
 */
function includeNestedLoopMembers(
  definition: FlowerDefinition,
  selectedIds: Set<string>,
): void {
  const nodesById = new Map(definition.nodes.map((node) => [node.id, node]));
  const pending = [...selectedIds];
  const visitedLoops = new Set<string>();

  while (pending.length) {
    const id = pending.pop()!;
    const node = nodesById.get(id);
    if (!node?.loop || visitedLoops.has(id)) continue;
    visitedLoops.add(id);

    for (const memberId of node.loop.memberNodeIds ?? []) {
      if (!nodesById.has(memberId)) continue;
      if (!selectedIds.has(memberId)) {
        selectedIds.add(memberId);
      }
      pending.push(memberId);
    }
  }
}

export function createFlowerSubtree(
  definition: FlowerDefinition,
  positions: Record<string, { x: number; y: number }>,
  selection: FlowerSubtreeSelection,
  metadata: { id: string; name: string; createdAt?: string },
): FlowerSubtreeDefinition {
  const selectedIds = selection.nodeIds;
  const rootPosition = positions[selection.rootNodeId] ?? {x: 0, y: 0};
  const selectedNodes = definition.nodes.filter((node) => selectedIds.has(node.id));
  const nodes = selectedNodes.map((node) =>
    sanitizeExportedNode(node, selectedIds, node.id === selection.rootNodeId));

  return {
    schemaVersion: 1,
    id: metadata.id,
    name: metadata.name,
    rootNodeId: selection.rootNodeId,
    outputNodeIds: componentOutputNodeIds(selectedNodes),
    createdAt: metadata.createdAt ?? new Date().toISOString(),
    sourceDefinitionId: definition.id,
    nodes,
    editor: {
      nodePositions: Object.fromEntries(nodes.map((node) => {
        const position = positions[node.id] ?? rootPosition;
        return [node.id, {
          x: position.x - rootPosition.x,
          y: position.y - rootPosition.y,
        }];
      })),
    },
  };
}

export function createFlowerDefinitionComponent(
  definition: FlowerDefinition,
): FlowerSubtreeDefinition {
  const component = createFlowerSubtree(
    definition,
    definition.editor?.nodePositions ?? {},
    {
      rootNodeId: definition.rootNodeId,
      nodeIds: new Set(definition.nodes.map((node) => node.id)),
    },
    {
      id: definition.id,
      name: definition.name,
      createdAt: 'catalog',
    },
  );
  if (definition.outputNodeIds !== undefined) {
    component.outputNodeIds = componentOutputNodeIds(definition.nodes, definition.outputNodeIds);
  }
  return component;
}

export function insertFlowerSubtree(
  definition: FlowerDefinition,
  positions: Record<string, { x: number; y: number }>,
  subtree: FlowerSubtreeDefinition,
  parentId: string,
): InsertedFlowerSubtree {
  subtree = normalizedFlowerSubtree(subtree);
  if (!definition.nodes.some((node) => node.id === parentId)) {
    throw new Error('Der Zielknoten für die Komponente existiert nicht mehr.');
  }
  if (!subtree.nodes.some((node) => node.id === subtree.rootNodeId)) {
    throw new Error('Die gespeicherte Komponente besitzt keinen gültigen Wurzelknoten.');
  }

  const occupiedIds = new Set(definition.nodes.map((node) => node.id));
  const insertedNodeId = uniqueId(slugify(subtree.id || subtree.name) || 'komponente', occupiedIds);
  const root = subtree.nodes.find((node) => node.id === subtree.rootNodeId)!;
  const rootIncoming: FlowerNodeIncomingConnection = nodeIncomingOrDefault(root);
  const parentPosition = positions[parentId] ?? {x: 500, y: 760};
  const insertedPosition = {
    x: clamp(parentPosition.x, 100, 900),
    y: clamp(parentPosition.y - 150, 80, 900),
  };
  const componentNode: FlowerNodeDefinition = {
    id: insertedNodeId,
    name: subtree.name,
    draggable: false,
    graphic: null,
    incoming: structuredClone(rootIncoming),
    connections: [],
    component: structuredClone(subtree),
  };

  const nextNodes = definition.nodes.map((node) => node.id === parentId
    ? {
      ...node,
      connections: [
        ...node.connections,
        connectionFromIncoming(insertedNodeId),
      ],
    }
    : node);

  return {
    definition: {
      ...definition,
      nodes: [...nextNodes, componentNode],
    },
    nodePositions: {...positions, [insertedNodeId]: insertedPosition},
    insertedNodeId,
  };
}

export function insertFlowerDefinitionReference(
  definition: FlowerDefinition,
  positions: Record<string, { x: number; y: number }>,
  sourceDefinition: FlowerDefinition,
  parentId: string,
): InsertedFlowerSubtree {
  if (!definition.nodes.some((node) => node.id === parentId)) {
    throw new Error('Der Zielknoten für die Komponente existiert nicht mehr.');
  }
  const root = sourceDefinition.nodes.find((node) => node.id === sourceDefinition.rootNodeId);
  if (!root) {
    throw new Error('Die referenzierte Komponente besitzt keinen gültigen Wurzelknoten.');
  }

  const occupiedIds = new Set(definition.nodes.map((node) => node.id));
  const insertedNodeId = uniqueId(slugify(sourceDefinition.id || sourceDefinition.name) || 'komponente', occupiedIds);
  const rootIncoming: FlowerNodeIncomingConnection = nodeIncomingOrDefault(root);
  const parentPosition = positions[parentId] ?? {x: 500, y: 760};
  const insertedPosition = {
    x: clamp(parentPosition.x, 100, 900),
    y: clamp(parentPosition.y - 150, 80, 900),
  };
  const componentNode: FlowerNodeDefinition = {
    id: insertedNodeId,
    name: sourceDefinition.name,
    draggable: false,
    graphic: null,
    incoming: structuredClone(rootIncoming),
    connections: [],
    component: {
      schemaVersion: 1,
      id: sourceDefinition.id,
      name: sourceDefinition.name,
      sourceDefinitionId: sourceDefinition.id,
    },
  };

  const nextNodes = definition.nodes.map((node) => node.id === parentId
    ? {
      ...node,
      connections: [
        ...node.connections,
        connectionFromIncoming(insertedNodeId),
      ],
    }
    : node);

  return {
    definition: {
      ...definition,
      nodes: [...nextNodes, componentNode],
    },
    nodePositions: {...positions, [insertedNodeId]: insertedPosition},
    insertedNodeId,
  };
}

export function extractFlowerSubtreeComponent(
  definition: FlowerDefinition,
  positions: Record<string, { x: number; y: number }>,
  selection: FlowerSubtreeSelection,
  metadata: { id: string; name: string; createdAt?: string },
): InsertedFlowerSubtree & { subtree: FlowerSubtreeDefinition } {
  const subtree = createFlowerSubtree(definition, positions, selection, metadata);
  const selectedIds = selection.nodeIds;
  const root = definition.nodes.find((node) => node.id === selection.rootNodeId);
  if (!root) {
    throw new Error('Der Startknoten der Auswahl existiert nicht mehr.');
  }

  const occupiedIds = new Set(definition.nodes
    .filter((node) => !selectedIds.has(node.id))
    .map((node) => node.id));
  const componentNodeId = uniqueId(slugify(metadata.id || metadata.name) || 'komponente', occupiedIds);
  const rootIncoming = nodeIncomingOrDefault(root);
  const externalConnections = definition.nodes
    .filter((node) => selectedIds.has(node.id))
    .flatMap((node) => node.connections.filter((connection) => !selectedIds.has(connection.childId)));
  const parentReference = incomingParent(definition, selection.rootNodeId);
  const componentNode: FlowerNodeDefinition = {
    id: componentNodeId,
    name: metadata.name,
    draggable: false,
    graphic: null,
    incoming: selection.rootNodeId === definition.rootNodeId ? undefined : structuredClone(rootIncoming),
    connections: structuredClone(externalConnections),
    component: subtree,
  };

  const nextNodes: FlowerNodeDefinition[] = [];
  for (const node of definition.nodes) {
    if (node.id === selection.rootNodeId) {
      nextNodes.push(componentNode);
      continue;
    }
    if (selectedIds.has(node.id)) {
      continue;
    }
    nextNodes.push({
      ...node,
      connections: node.connections
        .filter((connection) => !selectedIds.has(connection.childId) || connection.childId === selection.rootNodeId)
        .map((connection) => connection.childId === selection.rootNodeId
          ? connectionFromIncoming(componentNodeId)
          : connection),
      loop: node.loop ? {
        ...node.loop,
        startNodeId: node.loop.startNodeId === selection.rootNodeId
          ? componentNodeId
          : selectedIds.has(node.loop.startNodeId ?? '') ? null : node.loop.startNodeId,
        endNodeId: node.loop.endNodeId === selection.rootNodeId
          ? componentNodeId
          : selectedIds.has(node.loop.endNodeId ?? '') ? null : node.loop.endNodeId,
      } : undefined,
    });
  }

  if (selection.rootNodeId !== definition.rootNodeId && !parentReference) {
    throw new Error('Die Auswahl hat keine Eingangsverbindung und kann nicht ersetzt werden.');
  }

  const nodePositions = {...positions};
  for (const id of selectedIds) {
    delete nodePositions[id];
  }
  nodePositions[componentNodeId] = positions[selection.rootNodeId] ?? {x: 500, y: 500};

  return {
    definition: {
      ...definition,
      rootNodeId: selection.rootNodeId === definition.rootNodeId
        ? componentNodeId
        : definition.rootNodeId,
      nodes: nextNodes,
    },
    nodePositions,
    insertedNodeId: componentNodeId,
    subtree,
  };
}

export function isFlowerSubtreeDefinition(value: unknown): value is FlowerSubtreeDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<FlowerSubtreeDefinition>;
  return candidate.schemaVersion === 1
    && typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.rootNodeId === 'string'
    && Array.isArray(candidate.nodes)
    && candidate.nodes.some((node) => node?.id === candidate.rootNodeId);
}

export function normalizedFlowerSubtree(tree: FlowerSubtreeDefinition): FlowerSubtreeDefinition {
  const clone = structuredClone(tree);
  clone.outputNodeIds = componentOutputNodeIds(clone.nodes, clone.outputNodeIds);
  return clone;
}

function sanitizeExportedNode(
  node: FlowerNodeDefinition,
  selectedIds: Set<string>,
  root: boolean,
): FlowerNodeDefinition {
  const clone = structuredClone(node);
  clone.connections = clone.connections.filter((connection) => selectedIds.has(connection.childId));
  if (clone.loop) {
    clone.loop = {
      ...clone.loop,
      startNodeId: clone.loop.startNodeId && selectedIds.has(clone.loop.startNodeId)
        ? clone.loop.startNodeId
        : null,
      endNodeId: clone.loop.endNodeId && selectedIds.has(clone.loop.endNodeId)
        ? clone.loop.endNodeId
        : null,
      memberNodeIds: clone.loop.memberNodeIds?.filter((id) => selectedIds.has(id)),
      continuationOutputNodeIds: clone.loop.continuationOutputNodeIds?.filter((id) => selectedIds.has(id)),
    };
  }
  if (root && !clone.incoming) {
    clone.incoming = structuredClone(DEFAULT_INCOMING_CONNECTION);
  }
  return clone;
}

function componentOutputNodeIds(
  nodes: FlowerNodeDefinition[],
  preferred?: string[],
): string[] {
  const ids = new Set(nodes.map((node) => node.id));
  if (preferred !== undefined) {
    return [...new Set(preferred)].filter((id) => ids.has(id));
  }
  const externalParents = nodes
    .filter((node) => node.connections.some((connection) => !ids.has(connection.childId)))
    .map((node) => node.id);
  const parents = new Set(nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  const leaves = nodes
    .filter((node) => !parents.has(node.id))
    .map((node) => node.id);
  return [...new Set([...externalParents, ...leaves])];
}

function incomingParent(
  definition: FlowerDefinition,
  childId: string,
): { sourceId: string; index: number } | null {
  for (const source of definition.nodes) {
    const index = source.connections.findIndex((connection) => connection.childId === childId);
    if (index >= 0) {
      return {sourceId: source.id, index};
    }
  }
  return null;
}

function pathFromRoot(id: string, parentByChild: Map<string, string>): string[] {
  const reversed = [id];
  const visited = new Set<string>(reversed);
  let current = id;
  while (parentByChild.has(current)) {
    current = parentByChild.get(current)!;
    if (visited.has(current)) {
      break;
    }
    visited.add(current);
    reversed.push(current);
  }
  return reversed.reverse();
}

function lowestCommonAncestor(paths: string[][]): string | null {
  if (!paths.length) {
    return null;
  }
  const shortestLength = Math.min(...paths.map((path) => path.length));
  let common: string | null = null;
  for (let index = 0; index < shortestLength; index++) {
    const candidate = paths[0]![index]!;
    if (!paths.every((path) => path[index] === candidate)) {
      break;
    }
    common = candidate;
  }
  return common;
}

function uniqueId(seed: string, occupiedIds: Set<string>): string {
  let id = seed;
  let suffix = 2;
  while (occupiedIds.has(id)) {
    id = `${seed}-${suffix++}`;
  }
  occupiedIds.add(id);
  return id;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
