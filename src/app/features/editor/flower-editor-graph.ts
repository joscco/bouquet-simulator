import {FlowerDefinition, FlowerNodeDefinition} from '../../core/models/flower.models';
import {effectiveConnection} from '../../core/models/flower-connections';
import {activeLoopOutputNodeIds} from './flower-editor-loops';

export interface Point {
  x: number;
  y: number;
}

export interface GraphNode extends Point {
  id: string;
  name: string;
  root: boolean;
  hasGraphic: boolean;
  component: boolean;
  componentNodeCount: number;
  componentOutputCount: number;
  outputPorts: Point[];
  outputPortNames: string[];
  loop: boolean;
  loopStartName: string;
  loopEndName: string;
  loopMember: boolean;
  memberIds: string[];
  width: number;
  height: number;
}

export interface GraphEdge {
  key: string;
  sourceId: string;
  targetId: string;
  index: number;
  path: string;
  labelX: number;
  labelY: number;
  label: string;
  selectable: boolean;
  color: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export function materializePositions(definition: FlowerDefinition): Record<string, Point> {
  const layout = createGraphLayout(definition, definition.editor?.nodePositions ?? {});
  return Object.fromEntries(layout.nodes.map((node) => [node.id, {x: node.x, y: node.y}]));
}

export function createCompactGraphPositions(definition: FlowerDefinition): Record<string, Point> {
  const baseLayout = createGraphLayout(definition, {});
  const graphNodes = new Map(baseLayout.nodes.map((node) => [node.id, node]));
  const children = childNodesByParent(definition);
  const visited = new Set<string>();
  const positioned = new Map<string, Point>();
  const roots = [
    definition.rootNodeId,
    ...definition.nodes
      .map((node) => node.id)
      .filter((id) => id !== definition.rootNodeId && !hasIncoming(definition, id)),
    ...definition.nodes.map((node) => node.id),
  ].filter((id, index, ids) => ids.indexOf(id) === index);

  const maximumDepth = Math.max(1, ...roots.map((id) => subtreeDepth(id, children, new Set())));
  const levelGap = clamp(850 / maximumDepth, 104, 146);
  let cursor = 70;
  for (const rootId of roots) {
    if (visited.has(rootId) || !graphNodes.has(rootId)) continue;
    const width = measureSubtree(rootId, children, graphNodes, new Set());
    placeSubtree(rootId, 0, cursor, width, levelGap, children, graphNodes, positioned, visited);
    cursor += width + 72;
  }

  const points = [...positioned.values()];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const offsetX = clamp(500 - (minX + maxX) / 2, 80 - minX, 920 - maxX);
  const offsetY = 900;

  return Object.fromEntries([...positioned].map(([id, point]) => [
    id,
    {
      x: clamp(point.x + offsetX, (graphNodes.get(id)?.width ?? 0) / 2 + 20, 980 - (graphNodes.get(id)?.width ?? 0) / 2),
      y: clamp(point.y + offsetY, (graphNodes.get(id)?.height ?? 0) / 2 + 20, 980 - (graphNodes.get(id)?.height ?? 0) / 2),
    },
  ]));
}

export function createGraphLayout(
  definition: FlowerDefinition,
  storedPositions: Record<string, Point>,
): GraphLayout {
  const width = 1000;
  const height = 1000;
  const levels = new Map<string, number>([[definition.rootNodeId, 0]]);
  for (let pass = 0; pass < definition.nodes.length; pass++) {
    for (const node of definition.nodes) {
      const level = levels.get(node.id);
      if (level === undefined) {
        continue;
      }
      if (node.loop?.startNodeId && !levels.has(node.loop.startNodeId)) {
        levels.set(node.loop.startNodeId, level + 1);
      }
      for (const legacyConnection of node.connections) {
        const connection = effectiveConnection(definition, legacyConnection);
        if (!levels.has(connection.childId)) {
          levels.set(connection.childId, level + 1);
        }
      }
    }
  }
  const connectedMax = Math.max(0, ...levels.values());
  for (const node of definition.nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, connectedMax + 1);
    }
  }
  const maxLevel = Math.max(1, ...levels.values());
  const groups = new Map<number, FlowerNodeDefinition[]>();
  for (const node of definition.nodes) {
    const level = levels.get(node.id)!;
    groups.set(level, [...(groups.get(level) ?? []), node]);
  }
  const internalNodeIds = new Set(definition.nodes
    .filter((node) => node.loop)
    .flatMap((node) => loopMemberIds(definition, node)));
  const graphNodes: GraphNode[] = [];
  for (const [level, nodes] of groups) {
    const outerNodes = nodes.filter((node) => !internalNodeIds.has(node.id));
    const gap = width / (outerNodes.length + 1);
    let outerIndex = 0;
    nodes.forEach((node) => {
      const fallbackX = internalNodeIds.has(node.id) ? width / 2 : gap * (++outerIndex);
      const fallback = {x: fallbackX, y: 920 - level * (840 / maxLevel)};
      const position = storedPositions[node.id] ?? fallback;
      const loopOutputIds = node.loop ? activeLoopOutputNodeIds(definition, node) : [];
      graphNodes.push({
        id: node.id,
        name: node.name,
        x: position.x,
        y: position.y,
        root: node.id === definition.rootNodeId,
        hasGraphic: !!node.graphic,
        component: !!node.component,
        componentNodeCount: node.component?.nodes.length ?? 0,
        componentOutputCount: node.component ? componentOutputIds(node.component.nodes, node.component.outputNodeIds).length : 0,
        loop: !!node.loop,
        loopStartName: definition.nodes.find((candidate) =>
          candidate.id === node.loop?.startNodeId)?.name ?? 'Start wählen',
        loopEndName: definition.nodes.find((candidate) =>
          candidate.id === node.loop?.endNodeId)?.name ?? 'Ende wählen',
        loopMember: false,
        memberIds: [],
        width: node.loop ? 260 : node.component ? 196 : 172,
        height: node.loop ? 170 : node.component ? 88 : 78,
        outputPorts: [],
        outputPortNames: loopOutputIds.map((id) =>
          definition.nodes.find((candidate) => candidate.id === id)?.name ?? id),
      });
    });
  }
  for (const definitionNode of definition.nodes.filter((node) => node.loop)) {
    const loopNode = graphNodes.find((node) => node.id === definitionNode.id);
    if (!loopNode || !definitionNode.loop) {
      continue;
    }
    const memberIds = loopMemberIds(definition, definitionNode);
    const members = memberIds
      .map((id) => graphNodes.find((node) => node.id === id))
      .filter((node): node is GraphNode => !!node);
    if (!members.length) {
      continue;
    }
    if (!members.every((member) => !!storedPositions[member.id])) {
      arrangeLoopMembers(definition, definitionNode, loopNode, members, graphNodes, height);
    }
    const paddingX = 42;
    const paddingY = 68;
    const left = Math.min(...members.map((member) => member.x - member.width / 2)) - paddingX;
    const right = Math.max(...members.map((member) => member.x + member.width / 2)) + paddingX;
    const top = Math.min(...members.map((member) => member.y - member.height / 2)) - paddingY;
    const bottom = Math.max(...members.map((member) => member.y + member.height / 2)) + paddingY;
    loopNode.x = (left + right) / 2;
    loopNode.y = (top + bottom) / 2;
    loopNode.width = Math.max(260, right - left);
    loopNode.height = Math.max(180, bottom - top);
    loopNode.memberIds = memberIds;
    members.forEach((member) => member.loopMember = true);
  }
  graphNodes.sort((first, second) => Number(second.loop) - Number(first.loop));
  graphNodes.forEach((node) => {
    node.outputPorts = createOutputPorts(node);
  });
  return {
    nodes: graphNodes,
    edges: createEdges(definition, graphNodes),
    width,
    height,
  };
}

export function curvedConnectionPath(start: Point, end: Point): string {
  const distance = Math.abs(end.y - start.y);
  const curve = Math.max(48, distance * 0.46);
  const direction = end.y <= start.y ? -1 : 1;
  const firstControl = {x: start.x, y: start.y + direction * curve};
  const secondControl = {x: end.x, y: end.y - direction * curve};
  return `M ${start.x} ${start.y} C ${firstControl.x} ${firstControl.y}, ${secondControl.x} ${secondControl.y}, ${end.x} ${end.y}`;
}

function arrangeLoopMembers(
  definition: FlowerDefinition,
  definitionNode: FlowerNodeDefinition,
  loopNode: GraphNode,
  members: GraphNode[],
  graphNodes: GraphNode[],
  height: number,
): void {
  const spacing = 108;
  const estimatedHeight = Math.max(180, (members.length - 1) * spacing + 208);
  const incomingNodes = definition.nodes
    .filter((node) => node.connections.some((connection) => connection.childId === definitionNode.id))
    .map((node) => graphNodes.find((candidate) => candidate.id === node.id))
    .filter((node): node is GraphNode => !!node);
  const nearestIncomingY = incomingNodes.length
    ? Math.min(...incomingNodes.map((node) => node.y))
    : height - 20;
  const memberCenterY = clamp(
    Math.min(loopNode.y, nearestIncomingY - estimatedHeight / 2 - 50),
    estimatedHeight / 2 + 20,
    height - estimatedHeight / 2 - 20,
  );
  members.forEach((member, index) => {
    member.x = loopNode.x;
    member.y = memberCenterY + (members.length - 1) * spacing / 2 - index * spacing;
  });
}

function createEdges(definition: FlowerDefinition, graphNodes: GraphNode[]): GraphEdge[] {
  const positions = new Map(graphNodes.map((node) => [node.id, node]));
  const edges: GraphEdge[] = [];
  for (const node of definition.nodes.filter((candidate) => candidate.loop)) {
    if (node.loop?.memberNodeIds?.length) continue;
    const loopNode = positions.get(node.id);
    const startNode = node.loop?.startNodeId ? positions.get(node.loop.startNodeId) : null;
    const endNode = node.loop?.endNodeId ? positions.get(node.loop.endNodeId) : null;
    if (loopNode && startNode) {
      edges.push(boundaryEdge(
        `${node.id}-loop-start`,
        node.id,
        {x: loopNode.x, y: loopNode.y + loopNode.height / 2},
        {x: startNode.x, y: startNode.y + startNode.height / 2},
        '',
        '#059669',
        -1,
      ));
    }
    if (loopNode && endNode) {
      edges.push(boundaryEdge(
        `${node.id}-loop-end`,
        node.id,
        {x: endNode.x, y: endNode.y - endNode.height / 2},
        {x: loopNode.x, y: loopNode.y - loopNode.height / 2},
        '',
        '#d97706',
        -2,
      ));
    }
  }
  for (const node of definition.nodes) {
    const from = positions.get(node.id);
    if (!from) {
      continue;
    }
    node.connections.forEach((legacyConnection, index) => {
      const connection = effectiveConnection(definition, legacyConnection);
      const to = positions.get(connection.childId);
      if (!to) {
        return;
      }
      const start = outputPortForConnection(from, index);
      const end = {x: to.x, y: to.y + to.height / 2};
      edges.push({
        key: `${node.id}-${connection.childId}-${index}`,
        sourceId: node.id,
        targetId: connection.childId,
        index,
        path: curvedConnectionPath(start, end),
        labelX: (start.x + end.x) / 2,
        labelY: (start.y + end.y) / 2,
        label: `${connection.repeat.min}–${connection.repeat.max}`,
        selectable: true,
        color: '#a8a29e',
      });
    });
  }
  return edges;
}

function boundaryEdge(
  key: string,
  sourceId: string,
  start: Point,
  end: Point,
  label: string,
  color: string,
  index: number,
): GraphEdge {
  return {
    key,
    sourceId,
    targetId: sourceId,
    index,
    path: curvedConnectionPath(start, end),
    labelX: (start.x + end.x) / 2,
    labelY: (start.y + end.y) / 2,
    label,
    selectable: false,
    color,
  };
}

function componentOutputIds(
  nodes: FlowerNodeDefinition[],
  preferred: string[] = [],
): string[] {
  const ids = new Set(nodes.map((node) => node.id));
  const validPreferred = preferred.filter((id) => ids.has(id));
  if (validPreferred.length) {
    return validPreferred;
  }
  const parents = new Set(nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  return nodes.filter((node) => !parents.has(node.id)).map((node) => node.id);
}

function createOutputPorts(node: GraphNode): Point[] {
  const count = Math.max(1,
    node.loop && node.memberIds.length
      ? node.outputPortNames.length
      : node.component ? node.componentOutputCount : 1);
  const spacing = 28;
  const maxSpan = Math.max(0, node.width - 74);
  const span = Math.min(maxSpan, (count - 1) * spacing);
  const startX = node.x - span / 2;
  return Array.from({length: count}, (_, index) => {
    const progress = count <= 1 ? 0 : index / (count - 1);
    return {
      x: startX + (count === 1 ? 0 : span * progress),
      y: node.y - node.height / 2,
    };
  });
}

function outputPortForConnection(node: GraphNode, connectionIndex: number): Point {
  const ports = node.outputPorts.length ? node.outputPorts : createOutputPorts(node);
  if (ports.length <= 1) return ports[0] ?? {x: node.x, y: node.y - node.height / 2};
  return ports[Math.min(connectionIndex, ports.length - 1)]!;
}

function childNodesByParent(definition: FlowerDefinition): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const ids = new Set(definition.nodes.map((node) => node.id));
  for (const node of definition.nodes) {
    const children = [
      ...(node.loop?.startNodeId && ids.has(node.loop.startNodeId) ? [node.loop.startNodeId] : []),
      ...node.connections
        .map((legacyConnection) => effectiveConnection(definition, legacyConnection).childId)
        .filter((id) => ids.has(id)),
    ];
    result.set(node.id, [...new Set(children)]);
  }
  return result;
}

function hasIncoming(definition: FlowerDefinition, nodeId: string): boolean {
  return definition.nodes.some((node) =>
    node.connections.some((connection) => effectiveConnection(definition, connection).childId === nodeId)
    || node.loop?.startNodeId === nodeId);
}

function measureSubtree(
  nodeId: string,
  children: Map<string, string[]>,
  nodes: Map<string, GraphNode>,
  stack: Set<string>,
): number {
  const node = nodes.get(nodeId);
  if (!node || stack.has(nodeId)) return 0;
  const nextStack = new Set(stack).add(nodeId);
  const childWidths = (children.get(nodeId) ?? [])
    .map((childId) => measureSubtree(childId, children, nodes, nextStack))
    .filter((width) => width > 0);
  const childrenWidth = childWidths.length
    ? childWidths.reduce((sum, width) => sum + width, 0) + (childWidths.length - 1) * 34
    : 0;
  return Math.max(node.width + 46, childrenWidth);
}

function placeSubtree(
  nodeId: string,
  depth: number,
  left: number,
  width: number,
  levelGap: number,
  children: Map<string, string[]>,
  nodes: Map<string, GraphNode>,
  positioned: Map<string, Point>,
  visited: Set<string>,
): void {
  const node = nodes.get(nodeId);
  if (!node || visited.has(nodeId)) return;
  visited.add(nodeId);
  positioned.set(nodeId, {
    x: left + width / 2,
    y: -depth * levelGap,
  });

  const childIds = (children.get(nodeId) ?? []).filter((id) => nodes.has(id) && !visited.has(id));
  if (!childIds.length) return;
  const childWidths = childIds.map((id) => measureSubtree(id, children, nodes, new Set([nodeId])));
  const totalWidth = childWidths.reduce((sum, childWidth) => sum + childWidth, 0) + (childWidths.length - 1) * 34;
  let cursor = left + Math.max(0, (width - totalWidth) / 2);
  childIds.forEach((id, index) => {
    const childWidth = childWidths[index]!;
    placeSubtree(id, depth + 1, cursor, childWidth, levelGap, children, nodes, positioned, visited);
    cursor += childWidth + 34;
  });
}

function subtreeDepth(nodeId: string, children: Map<string, string[]>, stack: Set<string>): number {
  if (stack.has(nodeId)) return 0;
  const childIds = children.get(nodeId) ?? [];
  if (!childIds.length) return 0;
  const nextStack = new Set(stack).add(nodeId);
  return 1 + Math.max(0, ...childIds.map((id) => subtreeDepth(id, children, nextStack)));
}

function templatePath(
  definition: FlowerDefinition,
  startNodeId: string,
  endNodeId: string,
): string[] {
  if (startNodeId === endNodeId) {
    return [startNodeId];
  }
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const visit = (id: string): string[] | null => {
    if (visited.has(id)) {
      return null;
    }
    visited.add(id);
    for (const legacyConnection of nodes.get(id)?.connections ?? []) {
      const connection = effectiveConnection(definition, legacyConnection);
      if (connection.childId === endNodeId) {
        return [id, endNodeId];
      }
      const remainder = visit(connection.childId);
      if (remainder) {
        return [id, ...remainder];
      }
    }
    return null;
  };
  return visit(startNodeId) ?? [];
}

function loopMemberIds(definition: FlowerDefinition, node: FlowerNodeDefinition): string[] {
  if (!node.loop) return [];
  const ids = new Set(definition.nodes.map((candidate) => candidate.id));
  const members = [...new Set(node.loop.memberNodeIds ?? [])].filter((id) => ids.has(id));
  if (members.length) return members;
  if (node.loop.startNodeId && node.loop.endNodeId) {
    return templatePath(definition, node.loop.startNodeId, node.loop.endNodeId);
  }
  return [];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
