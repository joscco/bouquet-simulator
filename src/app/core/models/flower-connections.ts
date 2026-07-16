import {
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeIncomingConnection,
  ResolvedFlowerNodeConnection,
} from './flower.models';

export const DEFAULT_INCOMING_CONNECTION: FlowerNodeIncomingConnection = {
  repeat: {min: 1, max: 1},
  length: {min: 50, max: 70},
  angle: {min: 0, max: 10},
  azimuth: {min: 0, max: 360},
  roll: {min: 0, max: 0},
  randomness: 0.25,
};

export interface IncomingConnectionReference {
  sourceId: string;
  index: number;
  connection: ResolvedFlowerNodeConnection;
}

export function incomingConnectionReference(
  definition: FlowerDefinition,
  targetId: string,
): IncomingConnectionReference | null {
  for (const source of definition.nodes) {
    const index = source.connections.findIndex((connection) => connection.childId === targetId);
    if (index >= 0) {
      return {
        sourceId: source.id,
        index,
        connection: effectiveConnection(definition, source.connections[index]!),
      };
    }
  }
  return null;
}

export function effectiveConnection(
  definition: FlowerDefinition,
  legacyConnection: FlowerNodeConnection,
): ResolvedFlowerNodeConnection {
  const incoming = definition.nodes.find((node) => node.id === legacyConnection.childId)?.incoming;
  return incoming
    ? {...structuredClone(incoming), childId: legacyConnection.childId}
    : {...incomingFromConnection(legacyConnection), childId: legacyConnection.childId};
}

export function migrateIncomingConnections(definition: FlowerDefinition): FlowerDefinition {
  const clone = structuredClone(definition);
  const incomingByTarget = new Map<string, FlowerNodeConnection[]>();
  for (const source of clone.nodes) {
    for (const connection of source.connections) {
      incomingByTarget.set(connection.childId, [
        ...(incomingByTarget.get(connection.childId) ?? []),
        connection,
      ]);
    }
  }
  clone.nodes = clone.nodes.map((node) => {
    if (node.id === clone.rootNodeId || node.incoming) {
      return node;
    }
    const legacy = incomingByTarget.get(node.id)?.[0];
    return legacy ? {...node, incoming: incomingFromConnection(legacy)} : node;
  });
  return clone;
}

export function connectionFromIncoming(
  childId: string,
): FlowerNodeConnection {
  return {childId};
}

export function normalizeConnectionReferences(definition: FlowerDefinition): FlowerDefinition {
  const clone = migrateIncomingConnections(definition);
  const nodesWithIncoming = new Set(clone.nodes
    .filter((node) => !!node.incoming)
    .map((node) => node.id));
  return {
    ...clone,
    nodes: clone.nodes.map((node) => ({
      ...node,
      connections: node.connections.map((connection) =>
        nodesWithIncoming.has(connection.childId)
          ? {childId: connection.childId}
          : structuredClone(connection)),
    })),
  };
}

export function withoutChildId(connection: FlowerNodeConnection): FlowerNodeIncomingConnection {
  return incomingFromConnection(connection);
}

export function nodeIncomingOrDefault(node: FlowerNodeDefinition): FlowerNodeIncomingConnection {
  return structuredClone(node.incoming ?? DEFAULT_INCOMING_CONNECTION);
}

export function resolvedStemWidths(
  definition: FlowerDefinition,
  connection: ResolvedFlowerNodeConnection,
  fromDepth: number,
  toDepth: number,
): { startWidth: number; endWidth: number } {
  const stem = connection.stem;
  const legacyWidth = stem?.width ?? definition.stem.width;
  if (stem?.startWidth !== undefined || stem?.endWidth !== undefined) {
    const startWidth = stem.startWidth ?? legacyWidth;
    return {
      startWidth,
      endWidth: stem.endWidth ?? startWidth,
    };
  }
  return {
    startWidth: legacyWidth * Math.max(0.18, definition.stem.taper ** fromDepth),
    endWidth: legacyWidth * Math.max(0.18, definition.stem.taper ** toDepth),
  };
}

function incomingFromConnection(connection: FlowerNodeConnection): FlowerNodeIncomingConnection {
  const {childId: _childId, ...incoming} = structuredClone(connection);
  return {
    ...structuredClone(DEFAULT_INCOMING_CONNECTION),
    ...incoming,
  };
}
