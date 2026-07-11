import {
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  NodeOffset,
  NumberRange,
} from '../models/flower.models';
import {effectiveConnection} from '../models/flower-connections';

export interface FlowerTreeNode {
  id: string;
  templateId: string;
  parentId: string | null;
  x: number;
  y: number;
  z: number;
  angle: number;
  azimuth: number;
  depth: number;
  draggable: boolean;
}

export interface FlowerTreeEdge {
  from: string;
  to: string;
  connectionSourceId: string;
  connectionIndex: number;
}

export interface FlowerTree {
  rootId: string;
  nodes: FlowerTreeNode[];
  edges: FlowerTreeEdge[];
}

const MAX_GENERATED_NODES = 600;
const MAX_EXPANSION_DEPTH = 24;

/**
 * Expands a procedural node-template graph into a concrete, deterministic tree.
 * Offsets belong to generated nodes and therefore survive random repetition as
 * long as the flower definition and seed stay unchanged.
 */
export function generateFlowerTree(
  definition: FlowerDefinition,
  seed: number,
  offsets: Record<string, NodeOffset> = {},
): FlowerTree {
  const random = mulberry32(Math.floor(seed * 0xffffffff) || 1);
  const templates = new Map(definition.nodes.map((node) => [node.id, node]));
  const rootTemplate = templates.get(definition.rootNodeId);
  if (!rootTemplate) throw new Error(`Basisknoten "${definition.rootNodeId}" fehlt.`);

  const rootOffset = offsets.root ?? {x: 0, y: 0};
  const nodes: FlowerTreeNode[] = [{
    id: 'root',
    templateId: rootTemplate.id,
    parentId: null,
    x: rootOffset.x,
    y: rootOffset.y,
    z: 0,
    angle: 0,
    azimuth: 0,
    depth: 0,
    draggable: rootTemplate.draggable,
  }];
  const edges: FlowerTreeEdge[] = [];
  const counters = new Map<string, number>();

  expandChildren(nodes[0], rootTemplate.id, new Set([rootTemplate.id]), 0);
  return {rootId: 'root', nodes, edges};

  function expandChildren(
    parent: FlowerTreeNode,
    templateId: string,
    ancestors: Set<string>,
    expansionDepth: number,
    excludedConnectionIndex: number | null = null,
  ): void {
    if (expansionDepth >= MAX_EXPANSION_DEPTH || nodes.length >= MAX_GENERATED_NODES) return;
    const template = templates.get(templateId);
    if (!template) return;

    for (const [connectionIndex, legacyConnection] of template.connections.entries()) {
      if (connectionIndex === excludedConnectionIndex) continue;
      const connection = effectiveConnection(definition, legacyConnection);
      const childTemplate = templates.get(connection.childId);
      if (!childTemplate || ancestors.has(childTemplate.id)) continue;
      const count = randomInteger(connection.repeat, random);
      if (childTemplate.loop) {
        for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
          expandLoop(
            parent,
            childTemplate,
            connection,
            template.id,
            connectionIndex,
            new Set([...ancestors, childTemplate.id]),
            expansionDepth + 1,
          );
        }
        continue;
      }
      for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
        const child = addNode(
          parent,
          childTemplate.id,
          connection,
          template.id,
          connectionIndex,
          index,
          count,
        );
        expandChildren(
          child,
          childTemplate.id,
          new Set([...ancestors, childTemplate.id]),
          expansionDepth + 1,
        );
      }
    }
  }

  function expandLoop(
    parent: FlowerTreeNode,
    loopTemplate: FlowerNodeDefinition,
    entryConnection: FlowerNodeConnection,
    entrySourceId: string,
    entryConnectionIndex: number,
    ancestors: Set<string>,
    expansionDepth: number,
  ): void {
    const loop = loopTemplate.loop;
    if (!loop?.startNodeId || !loop.endNodeId) return;
    const path = findPath(loop.startNodeId, loop.endNodeId);
    if (!path) return;
    const repeat = randomInteger(loop.repeat, random);
    let attachment = parent;
    for (let iteration = 0; iteration < repeat && nodes.length < MAX_GENERATED_NODES; iteration++) {
      let current = addNode(
        attachment,
        loop.startNodeId,
        entryConnection,
        entrySourceId,
        entryConnectionIndex,
        iteration,
        repeat,
        true,
      );
      for (const step of path) {
        expandChildren(
          current,
          step.sourceId,
          new Set([...ancestors, step.sourceId]),
          expansionDepth + 1,
          step.connectionIndex,
        );
        current = addNode(
          current,
          step.targetId,
          step.connection,
          step.sourceId,
          step.connectionIndex,
          0,
          1,
        );
      }
      expandChildren(
        current,
        loop.endNodeId,
        new Set([...ancestors, loop.endNodeId]),
        expansionDepth + 1,
      );
      attachment = current;
    }
    expandChildren(
      attachment,
      loopTemplate.id,
      ancestors,
      expansionDepth + 1,
    );
  }

  function findPath(
    startNodeId: string,
    endNodeId: string,
  ): Array<{
    sourceId: string;
    targetId: string;
    connectionIndex: number;
    connection: FlowerNodeConnection;
  }> | null {
    if (startNodeId === endNodeId) return [];
    const visited = new Set<string>();
    function visit(nodeId: string): ReturnType<typeof findPath> {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);
      const template = templates.get(nodeId);
      if (!template || template.loop) return null;
      for (const [connectionIndex, legacyConnection] of template.connections.entries()) {
        const connection = effectiveConnection(definition, legacyConnection);
        if (connection.childId === endNodeId) {
          return [{sourceId: nodeId, targetId: endNodeId, connectionIndex, connection}];
        }
        const remainder = visit(connection.childId);
        if (remainder) {
          return [
            {sourceId: nodeId, targetId: connection.childId, connectionIndex, connection},
            ...remainder,
          ];
        }
      }
      return null;
    }
    return visit(startNodeId);
  }

  function addNode(
    parent: FlowerTreeNode,
    templateId: string,
    connection: FlowerNodeConnection,
    connectionSourceId: string,
    connectionIndex: number,
    repeatIndex: number,
    repeatCount: number,
    forceUpright = false,
  ): FlowerTreeNode {
    const serial = (counters.get(templateId) ?? 0) + 1;
    counters.set(templateId, serial);
    const id = `${templateId}-${serial}`;
    const template = templates.get(templateId)!;
    const randomness = clamp(connection.randomness ?? 0.35, 0, 1);
    const evenLinearUnit = repeatCount > 1 ? repeatIndex / (repeatCount - 1) : 0.5;
    const inclinationUnit = lerp(evenLinearUnit, random(), randomness);
    const inclination = clamp(Math.abs(rangeValue(connection.angle, inclinationUnit)), 0, 180) * Math.PI / 180;
    const azimuthRange = connection.azimuth ?? {min: 0, max: 360};
    const evenCircularUnit = repeatCount > 1 ? repeatIndex / repeatCount : 0.5;
    const azimuthUnit = lerp(evenCircularUnit, random(), randomness);
    const aroundParent = rangeValue(azimuthRange, azimuthUnit) * Math.PI / 180;
    const parentDirection = sphericalDirection(parent.angle, parent.azimuth);
    const reference = Math.abs(parentDirection.y) > 0.98
      ? {x: 1, y: 0, z: 0}
      : {x: 0, y: 1, z: 0};
    const tangent = normalize(cross(reference, parentDirection));
    const bitangent = cross(parentDirection, tangent);
    let direction = normalize({
      x: parentDirection.x * Math.cos(inclination)
        + (tangent.x * Math.cos(aroundParent) + bitangent.x * Math.sin(aroundParent)) * Math.sin(inclination),
      y: parentDirection.y * Math.cos(inclination)
        + (tangent.y * Math.cos(aroundParent) + bitangent.y * Math.sin(aroundParent)) * Math.sin(inclination),
      z: parentDirection.z * Math.cos(inclination)
        + (tangent.z * Math.cos(aroundParent) + bitangent.z * Math.sin(aroundParent)) * Math.sin(inclination),
    });
    if (forceUpright) {
      direction = normalize({x: direction.x * 0.32, y: direction.y * 0.32 + 0.68, z: direction.z * 0.32});
    }
    const angle = Math.acos(clamp(direction.y, -1, 1));
    const azimuth = Math.atan2(direction.z, direction.x);
    const length = Math.max(0, randomRange(connection.length, random));
    const offset = offsets[id] ?? {x: 0, y: 0};
    const node: FlowerTreeNode = {
      id,
      templateId,
      parentId: parent.id,
      x: parent.x + direction.x * length + offset.x,
      y: parent.y - direction.y * length + offset.y,
      z: parent.z + direction.z * length,
      angle,
      azimuth,
      depth: parent.depth + 1,
      draggable: template.draggable,
    };
    nodes.push(node);
    edges.push({from: parent.id, to: id, connectionSourceId, connectionIndex});
    return node;
  }
}

function randomRange(range: NumberRange, random: () => number): number {
  return rangeValue(range, random());
}

function rangeValue(range: NumberRange, unit: number): number {
  const minimum = Math.min(Number(range.min) || 0, Number(range.max) || 0);
  const maximum = Math.max(Number(range.min) || 0, Number(range.max) || 0);
  return minimum + clamp(unit, 0, 1) * (maximum - minimum);
}

function randomInteger(range: NumberRange, random: () => number): number {
  const minimum = Math.max(0, Math.ceil(Math.min(Number(range.min) || 0, Number(range.max) || 0)));
  const maximum = Math.max(minimum, Math.floor(Math.max(Number(range.min) || 0, Number(range.max) || 0)));
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function sphericalDirection(angle: number, azimuth: number): {x: number; y: number; z: number} {
  return {
    x: Math.sin(angle) * Math.cos(azimuth),
    y: Math.cos(angle),
    z: Math.sin(angle) * Math.sin(azimuth),
  };
}

function cross(
  first: {x: number; y: number; z: number},
  second: {x: number; y: number; z: number},
): {x: number; y: number; z: number} {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function normalize(vector: {x: number; y: number; z: number}): {x: number; y: number; z: number} {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {x: vector.x / length, y: vector.y / length, z: vector.z / length};
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
