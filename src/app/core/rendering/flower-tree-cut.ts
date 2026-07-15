import {FlowerTree, FlowerTreeNode} from './flower-tree';

/**
 * Removes the lower part of the longest stem path while preserving the crown.
 * The resulting tree is rooted at the new cut point, matching the bouquet renderer.
 */
export function cutFlowerTree(tree: FlowerTree, cutRatio: number): FlowerTree {
  const ratio = clamp(cutRatio, 0, 0.98);
  if (ratio <= 0.001) return tree;

  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const childEdges = new Map<string, typeof tree.edges>();
  for (const edge of tree.edges) {
    const edges = childEdges.get(edge.from) ?? [];
    edges.push(edge);
    childEdges.set(edge.from, edges);
  }

  const longestCache = new Map<string, number>();
  const longestFrom = (nodeId: string): number => {
    const cached = longestCache.get(nodeId);
    if (cached !== undefined) return cached;
    const length = Math.max(0, ...(childEdges.get(nodeId) ?? []).map((edge) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      return from && to ? nodeDistance(from, to) + longestFrom(edge.to) : 0;
    }));
    longestCache.set(nodeId, length);
    return length;
  };

  const totalLength = longestFrom(tree.rootId);
  if (totalLength <= 0) return tree;

  let remaining = totalLength * ratio;
  let currentId = tree.rootId;
  let cutEdge = longestChildEdge(currentId);
  while (cutEdge) {
    const from = nodes.get(cutEdge.from);
    const to = nodes.get(cutEdge.to);
    if (!from || !to) break;
    const length = nodeDistance(from, to);
    if (remaining <= length) break;
    remaining -= length;
    currentId = cutEdge.to;
    cutEdge = longestChildEdge(currentId);
  }
  if (!cutEdge) return tree;

  const from = nodes.get(cutEdge.from);
  const to = nodes.get(cutEdge.to);
  if (!from || !to) return tree;
  const amount = nodeDistance(from, to) > 0 ? clamp(remaining / nodeDistance(from, to), 0, 1) : 1;
  const cutPoint = {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
    z: lerp(from.z, to.z, amount),
  };
  const keptIds = collectDescendants(cutEdge.to);
  const depthOffset = Math.max(0, to.depth - 1);
  const root = {...tree.nodes.find((node) => node.id === tree.rootId)!, x: 0, y: 0, z: 0, depth: 0};
  const cutNodes = tree.nodes
    .filter((node) => keptIds.has(node.id))
    .map((node) => ({
      ...node,
      parentId: node.id === cutEdge.to ? tree.rootId : node.parentId,
      x: node.x - cutPoint.x,
      y: node.y - cutPoint.y,
      z: node.z - cutPoint.z,
      depth: Math.max(1, node.depth - depthOffset),
    }));

  return {
    rootId: tree.rootId,
    nodes: [root, ...cutNodes],
    edges: [
      {
        from: tree.rootId,
        to: cutEdge.to,
        connectionSourceId: cutEdge.connectionSourceId,
        connectionIndex: cutEdge.connectionIndex,
        connection: structuredClone(cutEdge.connection),
      },
      ...tree.edges.filter((edge) => keptIds.has(edge.from) && keptIds.has(edge.to)),
    ],
  };

  function longestChildEdge(nodeId: string): FlowerTree['edges'][number] | null {
    const candidates = childEdges.get(nodeId) ?? [];
    let best: FlowerTree['edges'][number] | null = null;
    let bestLength = -1;
    for (const edge of candidates) {
      const edgeFrom = nodes.get(edge.from);
      const edgeTo = nodes.get(edge.to);
      if (!edgeFrom || !edgeTo) continue;
      const length = nodeDistance(edgeFrom, edgeTo) + longestFrom(edge.to);
      if (length > bestLength) {
        best = edge;
        bestLength = length;
      }
    }
    return best;
  }

  function collectDescendants(nodeId: string): Set<string> {
    const ids = new Set<string>([nodeId]);
    for (const edge of childEdges.get(nodeId) ?? []) {
      for (const childId of collectDescendants(edge.to)) ids.add(childId);
    }
    return ids;
  }
}

function nodeDistance(from: FlowerTreeNode, to: FlowerTreeNode): number {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
