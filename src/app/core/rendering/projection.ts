import {BouquetFlower} from '../models/flower.models';
import {clamp} from '../utils/numbers';

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

export interface ProjectedLocalPoint {
  x: number;
  y: number;
  depth: number;
}

export function viewDeltaToWorld(deltaX: number, rotation: number): Pick<BouquetFlower, 'x' | 'z'> {
  return {
    x: deltaX * Math.cos(rotation),
    z: -deltaX * Math.sin(rotation),
  };
}

export function projectLocalPoint(x: number, y: number, rotation: number): ProjectedLocalPoint {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const depth = x * sine;
  return {
    x: x * cosine,
    y: y + depth * 0.1,
    depth,
  };
}

export function projectLocalAngle(angle: number, rotation: number): number {
  const sine = Math.sin(rotation);
  const cosine = Math.cos(rotation);
  const dx = Math.sin(angle) * cosine;
  const dy = -Math.cos(angle) + Math.sin(angle) * sine * 0.1;
  return Math.atan2(dx, -dy);
}

export function viewDeltaToLocalOffset(deltaX: number, deltaY: number, rotation: number): {x: number; y: number} {
  const cosine = Math.cos(rotation);
  const safeCosine = Math.sign(cosine || 1) * Math.max(Math.abs(cosine), 0.35);
  const localX = deltaX / safeCosine;
  return {
    x: localX,
    y: deltaY - localX * Math.sin(rotation) * 0.1,
  };
}
