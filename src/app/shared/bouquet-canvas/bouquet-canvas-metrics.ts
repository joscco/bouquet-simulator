export const BOUQUET_FIT_PADDING = 48;
export const BOUQUET_FIT_MARGIN = 1.08;
export const BOUQUET_ORBIT_LIMIT = Math.PI * 0.46;

export type BouquetCanvasViewMode = 'pan' | 'rotate';

export function pointerDistance(points: ReadonlyMap<number, {x: number; y: number}>): number {
  const [first, second] = [...points.values()];
  return Math.hypot(second!.x - first!.x, second!.y - first!.y);
}

export function pointerCenter(
  points: ReadonlyMap<number, {x: number; y: number}>,
): {x: number; y: number} {
  const [first, second] = [...points.values()];
  return {
    x: (first!.x + second!.x) / 2,
    y: (first!.y + second!.y) / 2,
  };
}
