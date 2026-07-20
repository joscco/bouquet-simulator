import {
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeIncomingConnection,
  ResolvedFlowerNodeConnection,
} from './flower.models';
import {FLOWER_CREATION_DEFAULTS} from './flower-creation-defaults';

export const DEFAULT_INCOMING_CONNECTION: FlowerNodeIncomingConnection =
  FLOWER_CREATION_DEFAULTS.incoming;

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
  return {
    ...normalizeIncomingConnection(incoming ?? incomingFromConnection(legacyConnection)),
    childId: legacyConnection.childId,
  };
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
    if (node.incoming) return {...node, incoming: materializeLocalStem(clone, node.incoming)};
    if (node.id === clone.rootNodeId) return node;
    const legacy = incomingByTarget.get(node.id)?.[0];
    return legacy ? {...node, incoming: materializeLocalStem(clone, incomingFromConnection(legacy))} : node;
  });
  return clone;
}

/** Materializes inherited legacy stem values so every editable incoming connection is self-contained. */
export function materializeLocalStem(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): FlowerNodeIncomingConnection {
  const normalized = normalizeIncomingConnection(incoming);
  const stem = normalized.stem;
  const legacyWidth = stem?.width ?? definition.stem.width;
  const startWidth = stem?.startWidth ?? legacyWidth;
  const endWidth = stem?.endWidth
    ?? (stem?.startWidth !== undefined ? startWidth : legacyWidth * definition.stem.taper);
  return {
    ...normalized,
    stem: {
      color: stem?.color ?? definition.stem.color,
      width: startWidth,
      startWidth,
      endWidth,
      bend: stem?.bend ?? definition.stem.bend ?? 0,
      curve: stem?.curve
        ?? definition.stem.curve
        ?? FLOWER_CREATION_DEFAULTS.incoming.stem!.curve
        ?? 0,
      bendRotation: structuredClone(stem?.bendRotation ?? {min: 0, max: 0}),
    },
  };
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
  return normalizeIncomingConnection(node.incoming ?? DEFAULT_INCOMING_CONNECTION);
}

export function normalizeIncomingConnection(
  incoming: FlowerNodeIncomingConnection,
): FlowerNodeIncomingConnection {
  const clone = structuredClone(incoming);
  const legacyMode = clone.placement?.mode ?? 'directional';
  const defaultSpread = DEFAULT_INCOMING_CONNECTION.spread!;
  const legacyDeviation = legacyMode === 'sphere'
    ? {min: 0, max: 180}
    : legacyMode === 'ring' || legacyMode === 'disc'
      ? {min: 90, max: 90}
      : clone.angle ?? defaultSpread.deviation;
  const spread = clone.spread;
  const direction = normalizedMainDirection(clone.direction);
  const normalized: FlowerNodeIncomingConnection = {
    repeat: structuredClone(clone.repeat ?? DEFAULT_INCOMING_CONNECTION.repeat),
    length: structuredClone(clone.length ?? DEFAULT_INCOMING_CONNECTION.length),
    originOffset: clone.originOffset ? normalizedOriginOffset(clone.originOffset) : undefined,
    direction,
    spread: {
      deviation: normalizedDeviation(spread?.deviation ?? legacyDeviation),
      revolution: normalizedRevolution(spread?.revolution ?? clone.azimuth ?? defaultSpread.revolution),
      roll: structuredClone(spread?.roll ?? clone.roll ?? defaultSpread.roll),
      randomness: finiteOr(spread?.randomness, clone.randomness ?? defaultSpread.randomness),
      orientation: spread?.orientation
        ?? (clone.placement?.orientation === 'parent' ? 'main' : 'spread'),
    },
    stem: clone.stem ? structuredClone(clone.stem) : undefined,
  };
  return normalized;
}

function normalizedOriginOffset(
  offset: FlowerNodeIncomingConnection['originOffset'],
): NonNullable<FlowerNodeIncomingConnection['originOffset']> {
  return {
    x: finiteOr(offset?.x, 0),
    y: finiteOr(offset?.y, 0),
    z: finiteOr(offset?.z, 0),
  };
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
  return normalizeIncomingConnection({
    ...incoming,
    repeat: structuredClone(incoming.repeat ?? DEFAULT_INCOMING_CONNECTION.repeat),
    length: structuredClone(incoming.length ?? DEFAULT_INCOMING_CONNECTION.length),
  });
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizedRevolution(range: {min: number; max: number}): {min: number; max: number} {
  return Math.abs(range.max - range.min) >= 360 - 0.0001
    ? {min: -180, max: 180}
    : structuredClone(range);
}

function normalizedDeviation(range: {min: number; max: number}): {min: number; max: number} {
  const minimum = Math.min(range.min, range.max);
  const maximum = Math.max(range.min, range.max);
  return {
    min: minimum <= 0 && maximum >= 0 ? 0 : Math.min(Math.abs(minimum), Math.abs(maximum)),
    max: Math.max(Math.abs(minimum), Math.abs(maximum)),
  };
}

function normalizedMainDirection(
  direction: FlowerNodeIncomingConnection['direction'],
): NonNullable<FlowerNodeIncomingConnection['direction']> {
  if (
    Number.isFinite(direction?.x)
    || Number.isFinite(direction?.y)
    || Number.isFinite(direction?.z)
  ) {
    return {
      x: finiteOr(direction?.x, 0),
      y: finiteOr(direction?.y, 0),
      z: finiteOr(direction?.z, 0),
    };
  }

  const inclination = finiteOr(direction?.inclination, 0) * Math.PI / 180;
  const azimuth = finiteOr(direction?.azimuth, 0) * Math.PI / 180;
  const localX = Math.sin(inclination) * Math.cos(azimuth);
  const localY = Math.cos(inclination);
  const localZ = Math.sin(inclination) * Math.sin(azimuth);
  return {
    x: Math.asin(Math.max(-1, Math.min(1, localZ))) * 180 / Math.PI,
    y: finiteOr(direction?.roll, 0),
    z: Math.atan2(-localX, localY) * 180 / Math.PI,
  };
}
