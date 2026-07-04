import {BouquetFlower} from '../models/flower.models';

export interface ProjectedFlower extends BouquetFlower {
  viewX: number;
  viewY: number;
  depth: number;
  perspective: number;
}

export function projectFlower(flower: BouquetFlower, rotation: number): ProjectedFlower {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const viewX = flower.x * cosine - flower.z * sine;
  const depth = flower.x * sine + flower.z * cosine;

  return {
    ...flower,
    viewX,
    viewY: flower.y + depth * 0.1,
    depth,
    perspective: clamp(1 + depth / 1500, 0.82, 1.18),
  };
}

export function viewDeltaToWorld(deltaX: number, rotation: number): Pick<BouquetFlower, 'x' | 'z'> {
  return {
    x: deltaX * Math.cos(rotation),
    z: -deltaX * Math.sin(rotation),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
