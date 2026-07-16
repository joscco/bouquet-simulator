import {Vector3} from 'three';
import {
  FlowerTree,
  FlowerTreeEdge,
  FlowerTreeNode,
} from '../../../core/rendering/flower-tree';

interface StemTopologyEdge {
  from: FlowerTreeNode;
  to: FlowerTreeNode;
}

export function flowerTreePosition(node: FlowerTreeNode): Vector3 {
  return new Vector3(node.x, -node.y, node.z);
}

export function createStemJointTangents(edges: readonly StemTopologyEdge[]): Map<string, Vector3> {
  const incoming = new Map<string, Vector3>();
  const outgoing = new Map<string, Vector3[]>();
  for (const edge of edges) {
    const direction = flowerTreePosition(edge.to).sub(flowerTreePosition(edge.from)).normalize();
    incoming.set(edge.to.id, direction);
    const directions = outgoing.get(edge.from.id) ?? [];
    directions.push(direction);
    outgoing.set(edge.from.id, directions);
  }

  const nodeIds = new Set([...incoming.keys(), ...outgoing.keys()]);
  const tangents = new Map<string, Vector3>();
  for (const nodeId of nodeIds) {
    const incomingDirection = incoming.get(nodeId);
    const outgoingDirections = outgoing.get(nodeId) ?? [];
    if (!incomingDirection) {
      if (outgoingDirections.length) tangents.set(nodeId, outgoingDirections[0].clone());
      continue;
    }
    if (!outgoingDirections.length) {
      tangents.set(nodeId, incomingDirection.clone());
      continue;
    }
    const continuation = outgoingDirections.reduce((best, candidate) =>
      candidate.dot(incomingDirection) > best.dot(incomingDirection) ? candidate : best);
    const blended = incomingDirection.clone().add(continuation);
    tangents.set(nodeId, blended.lengthSq() > 1e-6 ? blended.normalize() : incomingDirection.clone());
  }
  return tangents;
}

export function pruneLowerFlowerBranches(tree: FlowerTree, clearance: number): FlowerTree {
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const childEdges = new Map<string, FlowerTreeEdge[]>();
  for (const edge of tree.edges) {
    childEdges.set(edge.from, [...(childEdges.get(edge.from) ?? []), edge]);
  }

  const mainPathEdges = new Set<string>();
  let currentId = tree.rootId;
  let distanceFromRoot = 0;
  const rootDistances = new Map<string, number>([[tree.rootId, 0]]);
  while (true) {
    const edge = longestChildEdge(currentId);
    if (!edge) break;
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) break;
    mainPathEdges.add(edgeKey(edge));
    distanceFromRoot += nodeDistance(from, to);
    rootDistances.set(edge.to, distanceFromRoot);
    currentId = edge.to;
  }

  const keptIds = new Set<string>([tree.rootId]);
  const visit = (nodeId: string, distance: number): void => {
    for (const edge of childEdges.get(nodeId) ?? []) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const isMainPath = mainPathEdges.has(edgeKey(edge));
      if (!isMainPath && distance < clearance) continue;
      const nextDistance = isMainPath
        ? (rootDistances.get(edge.to) ?? distance + nodeDistance(from, to))
        : distance + nodeDistance(from, to);
      keptIds.add(edge.to);
      visit(edge.to, nextDistance);
    }
  };
  visit(tree.rootId, 0);

  return {
    rootId: tree.rootId,
    nodes: tree.nodes.filter((node) => keptIds.has(node.id)),
    edges: tree.edges.filter((edge) => keptIds.has(edge.from) && keptIds.has(edge.to)),
  };

  function longestChildEdge(nodeId: string): FlowerTreeEdge | null {
    let best: FlowerTreeEdge | null = null;
    let bestLength = -1;
    for (const edge of childEdges.get(nodeId) ?? []) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const length = nodeDistance(from, to) + longestFrom(edge.to);
      if (length > bestLength) {
        best = edge;
        bestLength = length;
      }
    }
    return best;
  }

  function longestFrom(nodeId: string): number {
    return Math.max(0, ...(childEdges.get(nodeId) ?? []).map((edge) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      return from && to ? nodeDistance(from, to) + longestFrom(edge.to) : 0;
    }));
  }
}

function nodeDistance(from: FlowerTreeNode, to: FlowerTreeNode): number {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

function edgeKey(edge: FlowerTreeEdge): string {
  return `${edge.from}->${edge.to}:${edge.connectionSourceId}:${edge.connectionIndex}`;
}
