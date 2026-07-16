import {
  FlowerDefinition,
  FlowerNodeDefinition,
  NodeOffset,
  ResolvedFlowerNodeConnection,
} from '../models/flower.models';
import {
  FlowerGraphEdge,
  createFlowerGraph,
  graphLoopStartEdge,
  graphOutgoing,
} from '../models/flower-graph';
import {clamp, lerp} from '../utils/numbers';
import {mulberry32, randomInteger, randomRange, rangeValue} from '../utils/random';
import {
  componentOutputNodeIds,
  componentTemplateKey,
  flattenFlowerTemplates,
} from './flower-tree-templates';
import {cross, normalize, sphericalDirection} from './flower-tree-vectors';

export {flattenFlowerTemplates} from './flower-tree-templates';

export interface FlowerTreeNode {
  id: string;
  templateId: string;
  parentId: string | null;
  x: number;
  y: number;
  z: number;
  angle: number;
  azimuth: number;
  /** Gewählter Azimut um die Elternachse; bleibt auch an den Polen 0°/180° erhalten. */
  attachmentAzimuth?: number;
  /** Individuelle Drehung um die eigene Wachstumsachse, in Radiant. */
  roll?: number;
  /** Zusätzliche Drehung der lokalen Krümmungsebene, in Radiant. */
  bendRotation?: number;
  depth: number;
  draggable: boolean;
}

export interface FlowerTreeEdge {
  from: string;
  to: string;
  connectionSourceId: string;
  connectionIndex: number;
  connection: ResolvedFlowerNodeConnection;
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
  const templates = flattenFlowerTemplates(definition);
  const graph = createFlowerGraph(templates.values());
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
    attachmentAzimuth: 0,
    roll: 0,
    bendRotation: 0,
    depth: 0,
    draggable: rootTemplate.draggable,
  }];
  const edges: FlowerTreeEdge[] = [];
  const counters = new Map<string, number>();

  const rootEntryEdge: FlowerGraphEdge = {
    sourceId: rootTemplate.id,
    targetId: rootTemplate.id,
    connectionIndex: -1,
    connection: {
      childId: rootTemplate.id,
      repeat: {min: 1, max: 1},
      length: {min: 0, max: 0},
      angle: {min: 0, max: 0},
      azimuth: {min: 0, max: 0},
      roll: {min: 0, max: 0},
      randomness: 0,
    },
  };
  if (rootTemplate.component) {
    expandComponent(nodes[0], rootTemplate, rootEntryEdge, new Set([rootTemplate.id]), 0);
  } else if (rootTemplate.loop) {
    expandLoop(nodes[0], rootTemplate, rootEntryEdge, new Set([rootTemplate.id]), 0);
  } else {
    expandChildren(nodes[0], rootTemplate.id, new Set([rootTemplate.id]), 0);
  }
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

    for (const edge of graphOutgoing(graph, templateId)) {
      if (edge.connectionIndex === excludedConnectionIndex) continue;
      const connection = edge.connection;
      const childTemplate = templates.get(edge.targetId);
      if (!childTemplate || ancestors.has(childTemplate.id)) continue;
      const count = randomInteger(connection.repeat, random);
      if (childTemplate.component) {
        for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
          expandComponent(
            parent,
            childTemplate,
            edge,
            new Set([...ancestors, childTemplate.id]),
            expansionDepth + 1,
          );
        }
        continue;
      }
      if (childTemplate.loop) {
        for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
          expandLoop(
            parent,
            childTemplate,
            edge,
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
          edge,
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

  function expandComponent(
    parent: FlowerTreeNode,
    componentTemplate: FlowerNodeDefinition,
    entryEdge: FlowerGraphEdge,
    ancestors: Set<string>,
    expansionDepth: number,
  ): void {
    const component = componentTemplate.component;
    if (!component?.rootNodeId || !component.nodes || expansionDepth >= MAX_EXPANSION_DEPTH || nodes.length >= MAX_GENERATED_NODES) return;
    const rootKey = componentTemplateKey(componentTemplate.id, component.rootNodeId);
    if (!templates.has(rootKey)) return;
    const firstInternalIndex = nodes.length;
    const root = addNode(
      parent,
      rootKey,
      {
        ...entryEdge,
        targetId: rootKey,
        connection: {...entryEdge.connection, childId: rootKey},
      },
      0,
      1,
    );
    expandChildren(root, rootKey, new Set([...ancestors, rootKey]), expansionDepth + 1);
    const outputIds = componentOutputNodeIds(componentTemplate);
    if (component.outputNodeIds !== undefined && outputIds.length === 0) return;
    const outputKeys = new Set(outputIds.map((id) =>
      componentTemplateKey(componentTemplate.id, id)));
    const outputNodes = nodes
      .slice(firstInternalIndex)
      .filter((node) => outputKeys.has(node.templateId));
    expandComponentExternalChildren(
      outputNodes.length ? outputNodes : [root],
      componentTemplate.id,
      ancestors,
      expansionDepth + 1,
    );
  }

  function expandComponentExternalChildren(
    parents: FlowerTreeNode[],
    componentTemplateId: string,
    ancestors: Set<string>,
    expansionDepth: number,
  ): void {
    const template = templates.get(componentTemplateId);
    if (!template) return;
    for (const edge of graphOutgoing(graph, componentTemplateId)) {
      const connection = edge.connection;
      const childTemplate = templates.get(edge.targetId);
      if (!childTemplate || ancestors.has(childTemplate.id)) continue;
      const count = randomInteger(connection.repeat, random);
      for (const parent of parents) {
        for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
          if (childTemplate.component) {
            expandComponent(
              parent,
              childTemplate,
              edge,
              new Set([...ancestors, childTemplate.id]),
              expansionDepth + 1,
            );
            continue;
          }
          const child = addNode(
            parent,
            childTemplate.id,
            edge,
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
  }

  function expandLoop(
    parent: FlowerTreeNode,
    loopTemplate: FlowerNodeDefinition,
    entryEdge: FlowerGraphEdge,
    ancestors: Set<string>,
    expansionDepth: number,
    enclosingMemberIds: Set<string> | null = null,
    logicalLoopEndpoints: Map<string, FlowerTreeNode[]> = new Map(),
  ): FlowerTreeNode[] {
    const loop = loopTemplate.loop;
    if (!loop?.startNodeId || !loop.endNodeId) return [];
    if (loop.memberNodeIds?.length) {
      return expandMemberLoop(
        parent,
        loopTemplate,
        entryEdge,
        ancestors,
        expansionDepth,
        enclosingMemberIds,
        logicalLoopEndpoints,
      );
    }
    const path = findPath(loop.startNodeId, loop.endNodeId);
    if (!path) return [];
    const repeat = randomInteger(loop.repeat, random);
    let attachment = parent;
    const startEdge = graphLoopStartEdge(graph, loopTemplate, entryEdge);
    for (let iteration = 0; iteration < repeat && nodes.length < MAX_GENERATED_NODES; iteration++) {
      let current = addNode(
        attachment,
        loop.startNodeId,
        startEdge,
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
          step.edge,
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
    if (enclosingMemberIds) {
      expandMemberChildren(
        attachment,
        loopTemplate.id,
        enclosingMemberIds,
        ancestors,
        expansionDepth + 1,
        logicalLoopEndpoints,
      );
    } else {
      expandChildren(
        attachment,
        loopTemplate.id,
        ancestors,
        expansionDepth + 1,
      );
    }
    return [attachment];
  }

  function expandMemberLoop(
    parent: FlowerTreeNode,
    loopTemplate: FlowerNodeDefinition,
    entryEdge: FlowerGraphEdge,
    ancestors: Set<string>,
    expansionDepth: number,
    enclosingMemberIds: Set<string> | null = null,
    logicalLoopEndpoints: Map<string, FlowerTreeNode[]> = new Map(),
  ): FlowerTreeNode[] {
    const loop = loopTemplate.loop;
    if (!loop?.startNodeId) return [];
    const memberIds = new Set(loop.memberNodeIds ?? []);
    if (!memberIds.has(loop.startNodeId)) return [];
    const outputIds = loop.continuationOutputNodeIds?.filter((id) => memberIds.has(id)).length
      ? loop.continuationOutputNodeIds.filter((id) => memberIds.has(id))
      : memberOutputNodeIds(memberIds);
    const repeat = randomInteger(loop.repeat, random);
    let attachments = [parent];
    const startEdge = graphLoopStartEdge(graph, loopTemplate, entryEdge);
    for (let iteration = 0; iteration < repeat && nodes.length < MAX_GENERATED_NODES; iteration++) {
      const nextAttachments: FlowerTreeNode[] = [];
      for (const attachment of attachments) {
        const firstGeneratedIndex = nodes.length;
        const startTemplate = templates.get(loop.startNodeId);
        if (startTemplate?.loop) {
          const endpoints = expandLoop(
            attachment,
            startTemplate,
            startEdge,
            new Set([...ancestors, loop.startNodeId]),
            expansionDepth + 1,
            memberIds,
            logicalLoopEndpoints,
          );
          logicalLoopEndpoints.set(loop.startNodeId, [
            ...(logicalLoopEndpoints.get(loop.startNodeId) ?? []),
            ...endpoints,
          ]);
        } else {
          const root = addNode(
            attachment,
            loop.startNodeId,
            startEdge,
            iteration,
            repeat,
            true,
          );
          expandMemberChildren(
            root,
            loop.startNodeId,
            memberIds,
            new Set([...ancestors, loop.startNodeId]),
            expansionDepth + 1,
            logicalLoopEndpoints,
          );
        }
        const generatedOutputs = nodes
          .slice(firstGeneratedIndex)
          .filter((node) => outputIds.includes(node.templateId));
        const nestedOutputs = outputIds.flatMap((id) => logicalLoopEndpoints.get(id) ?? []);
        nextAttachments.push(...uniqueTreeNodes([...generatedOutputs, ...nestedOutputs]));
      }
      attachments = nextAttachments.length ? nextAttachments : attachments;
    }
    const loopEndpoints = attachments;
    for (const attachment of attachments) {
      if (enclosingMemberIds) {
        expandMemberChildren(
          attachment,
          loopTemplate.id,
          enclosingMemberIds,
          ancestors,
          expansionDepth + 1,
          logicalLoopEndpoints,
        );
      } else {
        expandChildren(attachment, loopTemplate.id, ancestors, expansionDepth + 1);
      }
    }
    return loopEndpoints;
  }

  function expandMemberChildren(
    parent: FlowerTreeNode,
    templateId: string,
    memberIds: Set<string>,
    ancestors: Set<string>,
    expansionDepth: number,
    logicalLoopEndpoints: Map<string, FlowerTreeNode[]> = new Map(),
  ): void {
    const template = templates.get(templateId);
    if (!template || expansionDepth >= MAX_EXPANSION_DEPTH || nodes.length >= MAX_GENERATED_NODES) return;
    for (const edge of graphOutgoing(graph, templateId)) {
      const connection = edge.connection;
      if (!memberIds.has(edge.targetId) || ancestors.has(edge.targetId)) continue;
      const count = randomInteger(connection.repeat, random);
      const childTemplate = templates.get(edge.targetId);
      if (childTemplate?.loop) {
        const endpoints: FlowerTreeNode[] = [];
        for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
          endpoints.push(...expandLoop(
            parent,
            childTemplate,
            edge,
            new Set([...ancestors, edge.targetId]),
            expansionDepth + 1,
            memberIds,
            logicalLoopEndpoints,
          ));
        }
        logicalLoopEndpoints.set(edge.targetId, [
          ...(logicalLoopEndpoints.get(edge.targetId) ?? []),
          ...endpoints,
        ]);
        continue;
      }
      for (let index = 0; index < count && nodes.length < MAX_GENERATED_NODES; index++) {
        const child = addNode(parent, edge.targetId, edge, index, count);
        expandMemberChildren(
          child,
          edge.targetId,
          memberIds,
          new Set([...ancestors, edge.targetId]),
          expansionDepth + 1,
          logicalLoopEndpoints,
        );
      }
    }
  }

  function uniqueTreeNodes(candidates: FlowerTreeNode[]): FlowerTreeNode[] {
    return [...new Map(candidates.map((node) => [node.id, node])).values()];
  }

  function memberOutputNodeIds(memberIds: Set<string>): string[] {
    const internalParents = new Set<string>();
    for (const id of memberIds) {
      const template = templates.get(id);
      if (!template) continue;
      for (const edge of graphOutgoing(graph, id)) {
        if (memberIds.has(edge.targetId)) internalParents.add(id);
      }
    }
    return [...memberIds].filter((id) => !internalParents.has(id));
  }

  function descendantOf(node: FlowerTreeNode, rootId: string): boolean {
    let current: FlowerTreeNode | undefined = node;
    while (current) {
      if (current.id === rootId) return true;
      current = current.parentId ? nodes.find((candidate) => candidate.id === current!.parentId) : undefined;
    }
    return false;
  }

  function findPath(
    startNodeId: string,
    endNodeId: string,
  ): Array<{
    sourceId: string;
    targetId: string;
    connectionIndex: number;
    edge: FlowerGraphEdge;
  }> | null {
    if (startNodeId === endNodeId) return [];
    const visited = new Set<string>();
    function visit(nodeId: string): ReturnType<typeof findPath> {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);
      const template = templates.get(nodeId);
      if (!template || template.loop) return null;
      for (const edge of graphOutgoing(graph, nodeId)) {
        if (edge.targetId === endNodeId) {
          return [{sourceId: nodeId, targetId: endNodeId, connectionIndex: edge.connectionIndex, edge}];
        }
        const remainder = visit(edge.targetId);
        if (remainder) {
          return [
            {sourceId: nodeId, targetId: edge.targetId, connectionIndex: edge.connectionIndex, edge},
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
    edge: FlowerGraphEdge,
    repeatIndex: number,
    repeatCount: number,
    forceUpright = false,
  ): FlowerTreeNode {
    const serial = (counters.get(templateId) ?? 0) + 1;
    counters.set(templateId, serial);
    const id = `${templateId}-${serial}`;
    const template = templates.get(templateId)!;
    const connection = edge.connection;
    const randomness = clamp(connection.randomness ?? 0.35, 0, 1);
    const evenLinearUnit = repeatCount > 1 ? repeatIndex / (repeatCount - 1) : 0.5;
    const azimuthRange = connection.azimuth ?? {min: 0, max: 360};
    const evenCircularUnit = repeatCount > 1 ? repeatIndex / repeatCount : 0.5;
    const parentDirection = sphericalDirection(parent.angle, parent.azimuth);
    const reference = Math.abs(parentDirection.y) > 0.98
      ? {x: 1, y: 0, z: 0}
      : {x: 0, y: 1, z: 0};
    const tangent = normalize(cross(reference, parentDirection));
    const bitangent = cross(parentDirection, tangent);
    const placementMode = connection.placement?.mode ?? 'directional';
    let aroundParent: number;
    let length: number;
    let positionDirection: ReturnType<typeof sphericalDirection>;
    let direction: ReturnType<typeof sphericalDirection>;

    if (placementMode === 'directional') {
      const inclinationUnit = lerp(evenLinearUnit, random(), randomness);
      const inclination = clamp(rangeValue(connection.angle, inclinationUnit), -180, 180) * Math.PI / 180;
      const azimuthUnit = lerp(evenCircularUnit, random(), randomness);
      aroundParent = rangeValue(azimuthRange, azimuthUnit) * Math.PI / 180;
      const radialDirection = directionInPlane(tangent, bitangent, aroundParent);
      direction = normalize({
        x: parentDirection.x * Math.cos(inclination) + radialDirection.x * Math.sin(inclination),
        y: parentDirection.y * Math.cos(inclination) + radialDirection.y * Math.sin(inclination),
        z: parentDirection.z * Math.cos(inclination) + radialDirection.z * Math.sin(inclination),
      });
      positionDirection = direction;
    } else {
      const baseAzimuthUnit = placementMode === 'ring'
        ? evenCircularUnit
        : fractional((repeatIndex + 0.5) * 0.618033988749895);
      const azimuthUnit = lerp(baseAzimuthUnit, random(), randomness);
      aroundParent = rangeValue(azimuthRange, azimuthUnit) * Math.PI / 180;
      const radialDirection = directionInPlane(tangent, bitangent, aroundParent);
      if (placementMode === 'sphere') {
        const polarUnit = lerp((repeatIndex + 0.5) / repeatCount, random(), randomness);
        const axisAmount = 1 - 2 * polarUnit;
        const radialAmount = Math.sqrt(Math.max(0, 1 - axisAmount * axisAmount));
        positionDirection = normalize({
          x: parentDirection.x * axisAmount + radialDirection.x * radialAmount,
          y: parentDirection.y * axisAmount + radialDirection.y * radialAmount,
          z: parentDirection.z * axisAmount + radialDirection.z * radialAmount,
        });
      } else {
        positionDirection = radialDirection;
      }
      direction = connection.placement?.orientation === 'parent'
        ? parentDirection
        : positionDirection;
    }
    const roll = connection.roll
      ? rangeValue(connection.roll, lerp(evenCircularUnit, random(), randomness)) * Math.PI / 180
      : 0;
    const bendRotation = connection.stem?.bendRotation
      ? rangeValue(connection.stem.bendRotation, lerp(evenCircularUnit, random(), randomness)) * Math.PI / 180
      : 0;
    if (forceUpright) {
      direction = normalize({x: direction.x * 0.32, y: direction.y * 0.32 + 0.68, z: direction.z * 0.32});
    }
    const angle = Math.acos(clamp(direction.y, -1, 1));
    const azimuth = Math.atan2(direction.z, direction.x);
    if (placementMode === 'directional') {
      length = Math.max(0, randomRange(connection.length, random));
    } else {
      const radiusUnit = lerp((repeatIndex + 0.5) / repeatCount, random(), randomness);
      const minimumRadius = Math.max(0, Math.min(connection.length.min, connection.length.max));
      const maximumRadius = Math.max(0, connection.length.min, connection.length.max);
      length = placementMode === 'disc'
        ? Math.sqrt(minimumRadius ** 2 + (maximumRadius ** 2 - minimumRadius ** 2) * radiusUnit)
        : lerp(minimumRadius, maximumRadius, radiusUnit);
    }
    const offset = offsets[id] ?? {x: 0, y: 0};
    const node: FlowerTreeNode = {
      id,
      templateId,
      parentId: parent.id,
      x: parent.x + positionDirection.x * length + offset.x,
      y: parent.y - positionDirection.y * length + offset.y,
      z: parent.z + positionDirection.z * length,
      angle,
      azimuth,
      attachmentAzimuth: aroundParent,
      roll,
      bendRotation,
      depth: parent.depth + 1,
      draggable: template.draggable,
    };
    nodes.push(node);
    edges.push({
      from: parent.id,
      to: id,
      connectionSourceId: edge.sourceId,
      connectionIndex: edge.connectionIndex,
      connection: structuredClone(connection),
    });
    return node;
  }
}

function directionInPlane(
  tangent: {x: number; y: number; z: number},
  bitangent: {x: number; y: number; z: number},
  angle: number,
): {x: number; y: number; z: number} {
  return normalize({
    x: tangent.x * Math.cos(angle) + bitangent.x * Math.sin(angle),
    y: tangent.y * Math.cos(angle) + bitangent.y * Math.sin(angle),
    z: tangent.z * Math.cos(angle) + bitangent.z * Math.sin(angle),
  });
}

function fractional(value: number): number {
  return value - Math.floor(value);
}
