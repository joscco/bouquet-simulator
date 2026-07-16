import {FlowerDefinition} from '../../../core/models/flower.models';
import {Point} from '../graph/flower-editor-graph';

export function wouldCreateFlowerCycle(
  definition: FlowerDefinition,
  sourceId: string,
  targetId: string,
): boolean {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const pending = [targetId];
  const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === sourceId) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(nodes.get(id)?.connections.map((connection) => connection.childId) ?? []));
  }
  return false;
}

export function nestedGraphNodeIds(
  nodes: Array<{id: string; memberIds: string[]}>,
  rootId: string,
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const result: string[] = [];
  const pending = [rootId];
  const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    pending.push(...(byId.get(id)?.memberIds ?? []));
  }
  return result;
}

export function centerOfGraphPositions(positions: Record<string, Point>): Point {
  const points = Object.values(positions);
  if (!points.length) return {x: 500, y: 500};
  return {
    x: (Math.min(...points.map((point) => point.x)) + Math.max(...points.map((point) => point.x))) / 2,
    y: (Math.min(...points.map((point) => point.y)) + Math.max(...points.map((point) => point.y))) / 2,
  };
}

export function graphPointerDistance(points: ReadonlyMap<number, Point>): number {
  const [first, second] = [...points.values()];
  return Math.hypot(second!.x - first!.x, second!.y - first!.y);
}
