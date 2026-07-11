import {
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeIncomingConnection,
} from './flower.models';

export const DEFAULT_INCOMING_CONNECTION: FlowerNodeIncomingConnection = {
  repeat: {min: 1, max: 1},
  length: {min: 50, max: 70},
  angle: {min: 0, max: 10},
  azimuth: {min: 0, max: 360},
  randomness: 0.25,
};

export interface IncomingConnectionReference {
  sourceId: string;
  index: number;
  connection: FlowerNodeConnection;
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
): FlowerNodeConnection {
  const incoming = definition.nodes.find((node) => node.id === legacyConnection.childId)?.incoming;
  return incoming
    ? {...structuredClone(incoming), childId: legacyConnection.childId}
    : legacyConnection;
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
    if (node.id === clone.rootNodeId || node.incoming) return node;
    const legacy = incomingByTarget.get(node.id)?.[0];
    return legacy ? {...node, incoming: withoutChildId(legacy)} : node;
  });
  return clone;
}

export function connectionFromIncoming(
  childId: string,
  incoming: FlowerNodeIncomingConnection,
): FlowerNodeConnection {
  return {...structuredClone(incoming), childId};
}

export function withoutChildId(connection: FlowerNodeConnection): FlowerNodeIncomingConnection {
  const {childId: _childId, ...incoming} = structuredClone(connection);
  return incoming;
}

export function nodeIncomingOrDefault(node: FlowerNodeDefinition): FlowerNodeIncomingConnection {
  return structuredClone(node.incoming ?? DEFAULT_INCOMING_CONNECTION);
}
