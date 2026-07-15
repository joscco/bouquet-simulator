import {GraphNode, Point} from './flower-editor-graph-types';

export const COMPACT_LEVEL_GAP = 128;

export function graphDepths(roots: string[], children: Map<string, string[]>): Map<string, number> {
  const depths = new Map<string, number>();
  for (const rootId of roots) {
    if (depths.has(rootId)) continue;
    const pending = [{id: rootId, depth: 0}];
    while (pending.length) {
      const current = pending.pop()!;
      if (depths.has(current.id)) continue;
      depths.set(current.id, current.depth);
      for (const childId of children.get(current.id) ?? []) {
        pending.push({id: childId, depth: current.depth + 1});
      }
    }
  }
  return depths;
}

export function measureSubtree(
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

export function placeSubtree(
  nodeId: string,
  depth: number,
  left: number,
  width: number,
  levelY: Map<number, number>,
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
    y: levelY.get(depth) ?? -depth * COMPACT_LEVEL_GAP,
  });

  const childIds = (children.get(nodeId) ?? []).filter((id) => nodes.has(id) && !visited.has(id));
  if (!childIds.length) return;
  const childWidths = childIds.map((id) => measureSubtree(id, children, nodes, new Set([nodeId])));
  const totalWidth = childWidths.reduce((sum, childWidth) => sum + childWidth, 0) + (childWidths.length - 1) * 34;
  let cursor = left + Math.max(0, (width - totalWidth) / 2);
  childIds.forEach((id, index) => {
    const childWidth = childWidths[index]!;
    placeSubtree(id, depth + 1, cursor, childWidth, levelY, children, nodes, positioned, visited);
    cursor += childWidth + 34;
  });
}
