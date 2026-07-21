import {
  FlowerDefinition,
  FlowerNodeMainDirection,
  FlowerNodeDefinition,
  NodeOffset,
  NumberRange,
  ResolvedFlowerNodeConnection,
} from '../models/flower.models';
import {
  FlowerGraphEdge,
  createFlowerGraph,
  graphLoopStartEdge,
  graphOutgoing,
} from '../models/flower-graph';
import {clamp, lerp} from '../utils/numbers';
import {mulberry32, randomInteger, rangeValue} from '../utils/random';
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

const MAX_GENERATED_NODES = 1000;
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
      direction: {x: 0, y: 0, z: 0},
      spread: {
        deviation: {min: 0, max: 0},
        revolution: {min: 0, max: 0},
        roll: {min: 0, max: 0},
        randomness: 0,
        orientation: 'spread',
      },
    },
  };
  if (rootTemplate.component) {
    expandComponent(nodes[0], rootTemplate, rootEntryEdge, new Set([rootTemplate.id]), 0, 0, 1);
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
            index,
            count,
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
    repeatIndex: number,
    repeatCount: number,
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
      repeatIndex,
      repeatCount,
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
              index,
              count,
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
    const continuedStartEdge = edgeWithoutOriginOffset(startEdge);
    for (let iteration = 0; iteration < repeat && nodes.length < MAX_GENERATED_NODES; iteration++) {
      let current = addNode(
        attachment,
        loop.startNodeId,
        iteration === 0 ? startEdge : continuedStartEdge,
        iteration,
        repeat,
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
    const continuedStartEdge = edgeWithoutOriginOffset(startEdge);
    for (let iteration = 0; iteration < repeat && nodes.length < MAX_GENERATED_NODES; iteration++) {
      const nextAttachments: FlowerTreeNode[] = [];
      for (const attachment of attachments) {
        const firstGeneratedIndex = nodes.length;
        const startTemplate = templates.get(loop.startNodeId);
        if (startTemplate?.loop) {
          const endpoints = expandLoop(
            attachment,
            startTemplate,
            iteration === 0 ? startEdge : continuedStartEdge,
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
            iteration === 0 ? startEdge : continuedStartEdge,
            iteration,
            repeat,
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

  function edgeWithoutOriginOffset(edge: FlowerGraphEdge): FlowerGraphEdge {
    if (!edge.connection.originOffset) return edge;
    return {
      ...edge,
      connection: {...edge.connection, originOffset: undefined},
    };
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
  ): FlowerTreeNode {
    const serial = (counters.get(templateId) ?? 0) + 1;
    counters.set(templateId, serial);
    const id = `${templateId}-${serial}`;
    const template = templates.get(templateId)!;
    const connection = edge.connection;
    const spread = connection.spread ?? {
      deviation: connection.angle ?? {min: 0, max: 10},
      revolution: connection.azimuth ?? {min: 0, max: 360},
      roll: connection.roll ?? {min: 0, max: 0},
      randomness: connection.randomness ?? 0,
      orientation: connection.placement?.orientation === 'parent' ? 'main' as const : 'spread' as const,
    };
    const main = connection.direction ?? {x: 0, y: 0, z: 0};
    const randomness = clamp(spread.randomness, 0, 1);
    const evenLinearUnit = repeatCount > 1 ? repeatIndex / (repeatCount - 1) : 0.5;
    const evenCircularUnit = repeatCount > 1 ? repeatIndex / repeatCount : 0.5;
    const {axis: parentDirection, tangent, bitangent} = flowerTreeNodeFrame(parent);
    const mainDirection = directionFromLocalRotations(
      parentDirection,
      tangent,
      bitangent,
      main,
    );
    const mainFrame = directionFrame(mainDirection, tangent, bitangent);
    let positionDirection: {x: number; y: number; z: number};
    let revolution: number;
    if (coversFullSphere(spread.deviation, spread.revolution)) {
      const evenLocal = maximallySeparatedSphereDirection(repeatIndex, repeatCount);
      const randomLocal = uniformSphereDirection(random(), random());
      const local = normalize({
        x: lerp(evenLocal.x, randomLocal.x, randomness),
        y: lerp(evenLocal.y, randomLocal.y, randomness),
        z: lerp(evenLocal.z, randomLocal.z, randomness),
      });
      positionDirection = directionFromLocalFrame(
        mainDirection,
        mainFrame.tangent,
        mainFrame.bitangent,
        local,
      );
      revolution = Math.atan2(local.z, local.x);
    } else {
      const deviationUnit = lerp(evenLinearUnit, random(), randomness);
      const deviation = angularRangeValue(spread.deviation, deviationUnit);
      const deviationVaries = Math.abs(spread.deviation.max - spread.deviation.min) > 0.0001;
      const revolutionSpan = Math.abs(spread.revolution.max - spread.revolution.min);
      const evenRevolutionUnit = deviationVaries
        ? fractional((repeatIndex + 0.5) * 0.618033988749895)
        : revolutionSpan >= 360 - 0.0001
          ? evenCircularUnit
          : evenLinearUnit;
      const revolutionUnit = lerp(evenRevolutionUnit, random(), randomness);
      revolution = rangeValue(spread.revolution, revolutionUnit) * Math.PI / 180;
      positionDirection = directionFromAxis(
        mainDirection,
        mainFrame.tangent,
        mainFrame.bitangent,
        deviation,
        revolution,
      );
    }
    const direction = spread.orientation === 'main' ? mainDirection : positionDirection;
    const aroundParent = Math.atan2(
      dot(mainDirection, bitangent),
      dot(mainDirection, tangent),
    ) + revolution;
    const rollUnit = lerp(
      fractional((repeatIndex + 0.5) * 0.7548776662466927),
      random(),
      randomness,
    );
    const roll = (main.y + rangeValue(spread.roll, rollUnit)) * Math.PI / 180;
    const bendRotation = connection.stem?.bendRotation
      ? rangeValue(connection.stem.bendRotation, lerp(evenCircularUnit, random(), randomness)) * Math.PI / 180
      : 0;
    const angle = Math.acos(clamp(direction.y, -1, 1));
    const azimuth = Math.atan2(direction.z, direction.x);
    const evenLengthUnit = decorrelatedEvenUnit(repeatIndex, repeatCount);
    const lengthUnit = lerp(evenLengthUnit, random(), randomness);
    const length = rangeValue(connection.length, lengthUnit);
    const originOffset = connection.originOffset ?? {x: 0, y: 0, z: 0};
    const originTangent = directionInPlane(
      mainFrame.tangent,
      mainFrame.bitangent,
      main.y * Math.PI / 180,
    );
    const originDelta = vectorFromLocalFrame(
      mainDirection,
      originTangent,
      cross(mainDirection, originTangent),
      originOffset,
    );
    const offset = offsets[id] ?? {x: 0, y: 0};
    const node: FlowerTreeNode = {
      id,
      templateId,
      parentId: parent.id,
      // The offset uses the connection's shared main-direction frame. It
      // follows a rotated component, while the individual spread directions
      // cannot pull repeated outgrowths into different translations.
      x: parent.x + positionDirection.x * length + originDelta.x + offset.x,
      y: parent.y - positionDirection.y * length - originDelta.y + offset.y,
      z: parent.z + positionDirection.z * length + originDelta.z,
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

function vectorFromLocalFrame(
  axis: {x: number; y: number; z: number},
  tangent: {x: number; y: number; z: number},
  bitangent: {x: number; y: number; z: number},
  local: {x: number; y: number; z: number},
): {x: number; y: number; z: number} {
  return {
    x: tangent.x * local.x + axis.x * local.y + bitangent.x * local.z,
    y: tangent.y * local.x + axis.y * local.y + bitangent.y * local.z,
    z: tangent.z * local.x + axis.z * local.y + bitangent.z * local.z,
  };
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

/** Resolves the editable X/Y/Z main rotation into the concrete direction at a generated parent. */
export function flowerConnectionMainDirection(
  parent: FlowerTreeNode,
  connection: ResolvedFlowerNodeConnection,
): {x: number; y: number; z: number} {
  const {axis: parentDirection, tangent, bitangent} = flowerTreeNodeFrame(parent);
  return directionFromLocalRotations(
    parentDirection,
    tangent,
    bitangent,
    connection.direction ?? {x: 0, y: 0, z: 0},
  );
}

/** Direction of the incoming/base axis before the selected connection applies its X/Y/Z rotation. */
export function flowerTreeNodeDirection(
  node: FlowerTreeNode,
): {x: number; y: number; z: number} {
  return sphericalDirection(node.angle, node.azimuth);
}

function flowerTreeNodeFrame(node: FlowerTreeNode): {
  axis: {x: number; y: number; z: number};
  tangent: {x: number; y: number; z: number};
  bitangent: {x: number; y: number; z: number};
} {
  const axis = flowerTreeNodeDirection(node);
  const reference = Math.abs(axis.y) > 0.98
    ? {x: 1, y: 0, z: 0}
    : {x: 0, y: 1, z: 0};
  const baseTangent = normalize(cross(reference, axis));
  const baseBitangent = cross(axis, baseTangent);
  const tangent = directionInPlane(baseTangent, baseBitangent, node.roll ?? 0);
  return {axis, tangent, bitangent: cross(axis, tangent)};
}

function directionFromLocalRotations(
  axis: {x: number; y: number; z: number},
  tangent: {x: number; y: number; z: number},
  bitangent: {x: number; y: number; z: number},
  rotation: FlowerNodeMainDirection,
): {x: number; y: number; z: number} {
  const x = clamp(rotation.x, -180, 180) * Math.PI / 180;
  const z = clamp(rotation.z, -180, 180) * Math.PI / 180;
  // Start on local +Y, rotate around local X and then local Z. Y is the axial roll.
  const local = {
    x: -Math.cos(x) * Math.sin(z),
    y: Math.cos(x) * Math.cos(z),
    z: Math.sin(x),
  };
  return normalize({
    x: tangent.x * local.x + axis.x * local.y + bitangent.x * local.z,
    y: tangent.y * local.x + axis.y * local.y + bitangent.y * local.z,
    z: tangent.z * local.x + axis.z * local.y + bitangent.z * local.z,
  });
}

function directionFromAxis(
  axis: {x: number; y: number; z: number},
  tangent: {x: number; y: number; z: number},
  bitangent: {x: number; y: number; z: number},
  deviation: number,
  revolution: number,
): {x: number; y: number; z: number} {
  const radial = directionInPlane(tangent, bitangent, revolution);
  return normalize({
    x: axis.x * Math.cos(deviation) + radial.x * Math.sin(deviation),
    y: axis.y * Math.cos(deviation) + radial.y * Math.sin(deviation),
    z: axis.z * Math.cos(deviation) + radial.z * Math.sin(deviation),
  });
}

function directionFromLocalFrame(
  axis: {x: number; y: number; z: number},
  tangent: {x: number; y: number; z: number},
  bitangent: {x: number; y: number; z: number},
  local: {x: number; y: number; z: number},
): {x: number; y: number; z: number} {
  return normalize({
    x: tangent.x * local.x + axis.x * local.y + bitangent.x * local.z,
    y: tangent.y * local.x + axis.y * local.y + bitangent.y * local.z,
    z: tangent.z * local.x + axis.z * local.y + bitangent.z * local.z,
  });
}

function coversFullSphere(deviation: NumberRange, revolution: NumberRange): boolean {
  const minimum = Math.min(deviation.min, deviation.max);
  const maximum = Math.max(deviation.min, deviation.max);
  const reachesBothPoles = (minimum <= 0 && maximum >= 180)
    || (minimum <= -180 && maximum >= 0);
  return reachesBothPoles && Math.abs(revolution.max - revolution.min) >= 360 - 0.0001;
}

function maximallySeparatedSphereDirection(
  index: number,
  count: number,
): {x: number; y: number; z: number} {
  if (count <= 1) return {x: 0, y: 1, z: 0};
  if (count === 2) return index === 0
    ? {x: 0, y: 1, z: 0}
    : {x: 0, y: -1, z: 0};
  if (count === 3) return [
    {x: 0, y: 1, z: 0},
    {x: 1, y: 0, z: 0},
    {x: 0, y: 0, z: 1},
  ][index]!;
  if (count === 4) {
    if (index === 0) return {x: 0, y: 1, z: 0};
    const y = -1 / 3;
    const radius = Math.sqrt(1 - y * y);
    const revolution = (index - 1) * Math.PI * 2 / 3;
    return {x: radius * Math.cos(revolution), y, z: radius * Math.sin(revolution)};
  }

  const y = 1 - 2 * index / (count - 1);
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const revolution = index * Math.PI * (3 - Math.sqrt(5));
  return {x: radius * Math.cos(revolution), y, z: radius * Math.sin(revolution)};
}

function uniformSphereDirection(
  verticalUnit: number,
  revolutionUnit: number,
): {x: number; y: number; z: number} {
  const y = 1 - 2 * verticalUnit;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const revolution = revolutionUnit * Math.PI * 2;
  return {x: radius * Math.cos(revolution), y, z: radius * Math.sin(revolution)};
}

function directionFrame(
  axis: {x: number; y: number; z: number},
  preferredTangent: {x: number; y: number; z: number},
  preferredBitangent: {x: number; y: number; z: number},
): {
  tangent: {x: number; y: number; z: number};
  bitangent: {x: number; y: number; z: number};
} {
  const axisProjection = dot(preferredTangent, axis);
  let projected = {
    x: preferredTangent.x - axis.x * axisProjection,
    y: preferredTangent.y - axis.y * axisProjection,
    z: preferredTangent.z - axis.z * axisProjection,
  };
  if (Math.hypot(projected.x, projected.y, projected.z) < 0.0001) {
    const fallbackProjection = dot(preferredBitangent, axis);
    projected = {
      x: preferredBitangent.x - axis.x * fallbackProjection,
      y: preferredBitangent.y - axis.y * fallbackProjection,
      z: preferredBitangent.z - axis.z * fallbackProjection,
    };
  }
  const tangent = normalize(projected);
  return {tangent, bitangent: cross(axis, tangent)};
}

function angularRangeValue(range: NumberRange, unit: number): number {
  const minimum = Math.min(range.min, range.max);
  const maximum = Math.max(range.min, range.max);
  if (minimum >= 0 && maximum <= 180) {
    const minimumRadians = minimum * Math.PI / 180;
    const maximumRadians = maximum * Math.PI / 180;
    return Math.acos(clamp(lerp(
      Math.cos(minimumRadians),
      Math.cos(maximumRadians),
      clamp(unit, 0, 1),
    ), -1, 1));
  }
  return rangeValue(range, unit) * Math.PI / 180;
}

function dot(
  first: {x: number; y: number; z: number},
  second: {x: number; y: number; z: number},
): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function fractional(value: number): number {
  return value - Math.floor(value);
}

function decorrelatedEvenUnit(index: number, count: number): number {
  if (count <= 1) return 0.5;
  const order = Array.from({length: count}, (_, candidate) => candidate)
    .sort((first, second) => radicalInverse(first) - radicalInverse(second));
  return order.indexOf(index) / (count - 1);
}

function radicalInverse(value: number): number {
  let result = 0;
  let fraction = 0.5;
  let remaining = value;
  while (remaining > 0) {
    result += (remaining % 2) * fraction;
    remaining = Math.floor(remaining / 2);
    fraction *= 0.5;
  }
  return result;
}
