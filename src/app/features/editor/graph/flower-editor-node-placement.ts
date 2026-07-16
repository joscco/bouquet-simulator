import {Point} from './flower-editor-graph-types';

const HORIZONTAL_GAP = 204;
const VERTICAL_GAP = 118;
const COLLISION_WIDTH = 188;
const COLLISION_HEIGHT = 94;

/**
 * Finds a free position in the immediate neighbourhood of the current node.
 * The sequence is deterministic so adding several nodes builds a compact cluster
 * without stacking cards on top of each other.
 */
export function nextEditorNodePosition(
  positions: Record<string, Point>,
  anchorId: string,
): Point {
  const occupied = Object.values(positions);
  const anchor = positions[anchorId] ?? centerOfPositions(occupied);
  const candidates: Point[] = [];

  for (let ring = 1; ring <= 4; ring++) {
    candidates.push(
      {x: anchor.x + HORIZONTAL_GAP * ring, y: anchor.y},
      {x: anchor.x - HORIZONTAL_GAP * ring, y: anchor.y},
      {x: anchor.x, y: anchor.y - VERTICAL_GAP * ring},
      {x: anchor.x, y: anchor.y + VERTICAL_GAP * ring},
      {x: anchor.x + HORIZONTAL_GAP * ring, y: anchor.y - VERTICAL_GAP},
      {x: anchor.x - HORIZONTAL_GAP * ring, y: anchor.y - VERTICAL_GAP},
    );
  }

  return candidates.find((candidate) => occupied.every((point) =>
    Math.abs(candidate.x - point.x) >= COLLISION_WIDTH
    || Math.abs(candidate.y - point.y) >= COLLISION_HEIGHT,
  )) ?? {x: anchor.x + HORIZONTAL_GAP, y: anchor.y - VERTICAL_GAP * 2};
}

function centerOfPositions(positions: Point[]): Point {
  if (!positions.length) return {x: 500, y: 500};
  return {
    x: positions.reduce((sum, point) => sum + point.x, 0) / positions.length,
    y: positions.reduce((sum, point) => sum + point.y, 0) / positions.length,
  };
}
