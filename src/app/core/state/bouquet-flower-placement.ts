import {DEFAULT_VASE_ID, vaseInsertionRadius} from '../data/vases';
import {BouquetFlower} from '../models/flower.models';
import {clamp} from '../utils/numbers';

export function moveFlowerInsideVase(
  flower: BouquetFlower,
  deltaX: number,
  deltaY: number,
  deltaZ: number,
  bouquetRotation: number,
  insertionRadius = vaseInsertionRadius(DEFAULT_VASE_ID),
): BouquetFlower {
  let x = flower.x + deltaX * 0.32;
  let z = flower.z + deltaZ * 0.32;
  const radius = Math.hypot(x, z);
  if (radius > insertionRadius) {
    x = x / radius * insertionRadius;
    z = z / radius * insertionRadius;
  }

  const depthDrag = deltaY * 0.28;
  const tiltWorldX = deltaX + Math.sin(bouquetRotation) * depthDrag;
  const tiltWorldZ = deltaZ + Math.cos(bouquetRotation) * depthDrag;
  let leanX = (flower.leanX ?? 0) + tiltWorldZ * 0.0028;
  let leanZ = (flower.leanZ ?? 0) - tiltWorldX * 0.0028;
  const maximumLean = 0.42;
  const leanLength = Math.hypot(leanX, leanZ);
  if (leanLength > maximumLean) {
    leanX = leanX / leanLength * maximumLean;
    leanZ = leanZ / leanLength * maximumLean;
  }

  return {
    ...flower,
    x,
    y: clamp(flower.y + deltaY * 0.03, -18, -14),
    z,
    leanX,
    leanZ,
  };
}
