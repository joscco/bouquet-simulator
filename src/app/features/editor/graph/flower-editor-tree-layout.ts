import {FlowerDefinition} from '../../../core/models/flower.models';
import {effectiveConnection} from '../../../core/models/flower-connections';
import {createGraphLayout} from './flower-editor-graph-layout';
import {Point} from './flower-editor-graph-types';
import {loopMemberIds} from './flower-editor-loop-layout';
import {graphDepths, measureSubtree, placeSubtree} from './flower-editor-tree-geometry';

export function createCompactGraphPositions(definition: FlowerDefinition): Record<string, Point> {
  const baseLayout = createGraphLayout(definition, {});
  const graphNodes = new Map(baseLayout.nodes.map((node) => [node.id, node]));
  const internalIds = new Set(definition.nodes
    .filter((node) => node.loop)
    .flatMap((node) => loopMemberIds(definition, node)));
  const outerIds = new Set(definition.nodes
    .map((node) => node.id)
    .filter((id) => !internalIds.has(id)));
  const children = outerChildNodesByParent(definition, outerIds);
  const incoming = new Set([...children.values()].flat());
  const visited = new Set<string>();
  const positioned = new Map<string, Point>();
  const roots = [
    definition.rootNodeId,
    ...outerIds,
  ].filter((id) => outerIds.has(id) && (id === definition.rootNodeId || !incoming.has(id)))
    .concat([...outerIds])
    .filter((id, index, ids) => ids.indexOf(id) === index);
  const depths = graphDepths(roots, children);
  const maximumDepth = Math.max(0, ...depths.values());
  const levelHeights = new Map<number, number>();
  for (const id of outerIds) {
    const depth = depths.get(id) ?? 0;
    levelHeights.set(depth, Math.max(levelHeights.get(depth) ?? 0, graphNodes.get(id)?.height ?? 78));
  }
  const levelY = new Map<number, number>([[0, 0]]);
  for (let depth = 1; depth <= maximumDepth; depth++) {
    const previousHeight = levelHeights.get(depth - 1) ?? 78;
    const currentHeight = levelHeights.get(depth) ?? 78;
    levelY.set(depth, levelY.get(depth - 1)! - previousHeight / 2 - 70 - currentHeight / 2);
  }

  let cursor = 70;
  for (const rootId of roots) {
    if (visited.has(rootId) || !graphNodes.has(rootId)) continue;
    const subtreeWidth = measureSubtree(rootId, children, graphNodes, new Set());
    const previouslyPositioned = new Set(positioned.keys());
    placeSubtree(rootId, 0, cursor, subtreeWidth, levelY, children, graphNodes, positioned, visited);
    const componentIds = [...positioned.keys()].filter((id) => !previouslyPositioned.has(id));
    cursor = Math.max(cursor + subtreeWidth, ...componentIds.map((id) =>
      positioned.get(id)!.x + (graphNodes.get(id)?.width ?? 0) / 2)) + 72;
  }

  const baseNodes = new Map(baseLayout.nodes.map((node) => [node.id, node]));
  for (const loopId of outerIds) {
    const loop = definition.nodes.find((node) => node.id === loopId && node.loop);
    const placedLoop = positioned.get(loopId);
    const baseLoop = baseNodes.get(loopId);
    if (!loop || !placedLoop || !baseLoop) continue;
    const delta = {x: placedLoop.x - baseLoop.x, y: placedLoop.y - baseLoop.y};
    for (const memberId of nestedLoopMemberIds(definition, loopId)) {
      const member = baseNodes.get(memberId);
      if (member) positioned.set(memberId, {x: member.x + delta.x, y: member.y + delta.y});
    }
  }
  for (const node of baseLayout.nodes) {
    if (!positioned.has(node.id)) positioned.set(node.id, {x: node.x, y: node.y});
  }

  const entries = [...positioned];
  const minimumLeft = Math.min(...entries.map(([id, point]) =>
    point.x - (graphNodes.get(id)?.width ?? 0) / 2));
  const maximumRight = Math.max(...entries.map(([id, point]) =>
    point.x + (graphNodes.get(id)?.width ?? 0) / 2));
  const minimumTop = Math.min(...entries.map(([id, point]) =>
    point.y - (graphNodes.get(id)?.height ?? 0) / 2));
  const offsetX = 500 - (minimumLeft + maximumRight) / 2;
  const offsetY = 60 - minimumTop;

  return Object.fromEntries(entries.map(([id, point]) => [
    id,
    {x: point.x + offsetX, y: point.y + offsetY},
  ]));
}

function outerChildNodesByParent(
  definition: FlowerDefinition,
  outerIds: Set<string>,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const node of definition.nodes) {
    if (!outerIds.has(node.id)) continue;
    const children = node.connections
      .map((legacyConnection) => effectiveConnection(definition, legacyConnection).childId)
      .filter((id) => outerIds.has(id));
    result.set(node.id, [...new Set(children)]);
  }
  return result;
}

function nestedLoopMemberIds(definition: FlowerDefinition, loopId: string): string[] {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const result: string[] = [];
  const pending = [...(nodes.get(loopId)?.loop?.memberNodeIds ?? [])];
  const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    pending.push(...(nodes.get(id)?.loop?.memberNodeIds ?? []));
  }
  return result;
}
