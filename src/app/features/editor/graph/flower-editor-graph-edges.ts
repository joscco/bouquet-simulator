import {FlowerDefinition, FlowerNodeDefinition} from '../../../core/models/flower.models';
import {effectiveConnection} from '../../../core/models/flower-connections';
import {GraphEdge, GraphNode, Point} from './flower-editor-graph-types';

export function curvedConnectionPath(start: Point, end: Point): string {
  const distance = Math.abs(end.y - start.y);
  const curve = Math.max(48, distance * 0.46);
  const direction = end.y <= start.y ? -1 : 1;
  const firstControl = {x: start.x, y: start.y + direction * curve};
  const secondControl = {x: end.x, y: end.y - direction * curve};
  return `M ${start.x} ${start.y} C ${firstControl.x} ${firstControl.y}, ${secondControl.x} ${secondControl.y}, ${end.x} ${end.y}`;
}

export function createGraphEdges(definition: FlowerDefinition, graphNodes: GraphNode[]): GraphEdge[] {
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
    if (!from) continue;
    node.connections.forEach((legacyConnection, index) => {
      const connection = effectiveConnection(definition, legacyConnection);
      const to = positions.get(connection.childId);
      if (!to) return;
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

export function componentOutputIds(nodes: FlowerNodeDefinition[], preferred?: string[]): string[] {
  const ids = new Set(nodes.map((node) => node.id));
  if (preferred !== undefined) return preferred.filter((id) => ids.has(id));
  const parents = new Set(nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  return nodes.filter((node) => !parents.has(node.id)).map((node) => node.id);
}

export function createOutputPorts(node: GraphNode): Point[] {
  const count = node.loop && node.memberIds.length
    ? node.outputPortNames.length
    : node.component ? node.componentOutputCount : 1;
  if (count <= 0) return [];
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
