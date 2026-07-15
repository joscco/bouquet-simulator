import {Euler, Vector3} from 'three';
import {BouquetFlower, BouquetState, FlowerDefinition} from '../models/flower.models';
import {graphicOrientationQuaternion} from './graphic-orientation';
import {flattenFlowerTemplates, generateFlowerTree} from './flower-tree';
import {cutFlowerTree} from './flower-tree-cut';

const STRONG_OVERLAP_THRESHOLD = 0.7;
const MINIMUM_CROWN_RADIUS = 6;
const MAXIMUM_LEAN = 0.42;
const MAXIMUM_CORRECTION_PASSES = 18;

export interface BouquetFlowerOverlap {
  firstInstanceId: string;
  secondInstanceId: string;
}

export interface BouquetFlowerOverlapResult {
  overlaps: BouquetFlowerOverlap[];
  flowerIds: ReadonlySet<string>;
}

interface CrownHull {
  instanceId: string;
  center: Vector3;
  horizontalRadius: number;
  verticalRadius: number;
  heightAboveInsertion: number;
}

interface CrownPart {
  center: Vector3;
  radius: number;
}

export function detectBouquetFlowerOverlaps(
  state: BouquetState,
  definitions: FlowerDefinition[],
): BouquetFlowerOverlapResult {
  const hulls = createCrownHulls(state, definitions);
  const overlaps: BouquetFlowerOverlap[] = [];
  const flowerIds = new Set<string>();

  for (let firstIndex = 0; firstIndex < hulls.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < hulls.length; secondIndex++) {
      const first = hulls[firstIndex]!;
      const second = hulls[secondIndex]!;
      if (!crownsStronglyOverlap(first, second)) continue;
      overlaps.push({firstInstanceId: first.instanceId, secondInstanceId: second.instanceId});
      flowerIds.add(first.instanceId);
      flowerIds.add(second.instanceId);
    }
  }

  return {overlaps, flowerIds};
}

/**
 * Fans strongly intersecting crowns apart while keeping every insertion point
 * inside the current vase. The deterministic passes make the result stable for
 * persistence and repeatable project imports.
 */
export function autoCorrectBouquetFlowerOverlaps(
  state: BouquetState,
  definitions: FlowerDefinition[],
  insertionRadius: number,
): BouquetState {
  let corrected = structuredClone(state);

  for (let pass = 0; pass < MAXIMUM_CORRECTION_PASSES; pass++) {
    const hulls = createCrownHulls(corrected, definitions);
    const corrections = new Map<string, Vector3>();

    for (let firstIndex = 0; firstIndex < hulls.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < hulls.length; secondIndex++) {
        const first = hulls[firstIndex]!;
        const second = hulls[secondIndex]!;
        const push = crownSeparationPush(first, second);
        if (!push) continue;
        addCorrection(corrections, first.instanceId, push);
        addCorrection(corrections, second.instanceId, push.clone().multiplyScalar(-1));
      }
    }
    if (!corrections.size) break;

    const hullsById = new Map(hulls.map((hull) => [hull.instanceId, hull]));
    let changed = false;
    corrected = {
      ...corrected,
      flowers: corrected.flowers.map((flower) => {
        const correction = corrections.get(flower.instanceId);
        const hull = hullsById.get(flower.instanceId);
        if (!correction || !hull) return flower;
        const limited = correction.length() > 16 ? correction.setLength(16) : correction;
        const insertionShare = hull.heightAboveInsertion <= 30 ? 1 : 0.18;
        const insertionMovement = limited.clone().multiplyScalar(insertionShare);
        const insertion = clampToRadius(
          flower.x + insertionMovement.x,
          flower.z + insertionMovement.z,
          insertionRadius,
        );
        const remainingX = limited.x - (insertion.x - flower.x);
        const remainingZ = limited.z - (insertion.z - flower.z);
        let leanX = (flower.leanX ?? 0) + remainingZ / hull.heightAboveInsertion;
        let leanZ = (flower.leanZ ?? 0) - remainingX / hull.heightAboveInsertion;
        const leanLength = Math.hypot(leanX, leanZ);
        if (leanLength > MAXIMUM_LEAN) {
          leanX = leanX / leanLength * MAXIMUM_LEAN;
          leanZ = leanZ / leanLength * MAXIMUM_LEAN;
        }
        changed ||= Math.abs(insertion.x - flower.x) > 0.0001
          || Math.abs(insertion.z - flower.z) > 0.0001
          || Math.abs(leanX - (flower.leanX ?? 0)) > 0.0001
          || Math.abs(leanZ - (flower.leanZ ?? 0)) > 0.0001;
        return {...flower, x: insertion.x, z: insertion.z, leanX, leanZ};
      }),
    };
    if (!changed) break;
  }

  return corrected;
}

function createCrownHulls(state: BouquetState, definitions: FlowerDefinition[]): CrownHull[] {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  return state.flowers.flatMap((flower) => {
    const definition = definitionsById.get(flower.definitionId);
    const hull = definition ? createCrownHull(flower, definition) : null;
    return hull ? [hull] : [];
  });
}

function createCrownHull(flower: BouquetFlower, definition: FlowerDefinition): CrownHull | null {
  const tree = cutFlowerTree(
    generateFlowerTree(definition, flower.seed, flower.nodeOffsets ?? {}),
    flower.cutRatio ?? 0,
  );
  const templates = flattenFlowerTemplates(definition);
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const parts: CrownPart[] = [];

  for (const node of tree.nodes) {
    const graphic = templates.get(node.templateId)?.graphic;
    if (!graphic) continue;
    const graphicScale = Math.max(0.01, graphic.scale ?? 1);
    const depth = Math.max(0.5, graphic.depth ?? Math.min(graphic.width, graphic.height) * 0.12);
    const radius = Math.max(
      MINIMUM_CROWN_RADIUS,
      Math.hypot(graphic.width, graphic.height, depth) * graphicScale * 0.5,
    );
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    const orientation = graphicOrientationQuaternion(node, parent, graphic, flower.seed);
    const offset = graphic.offset ?? {x: 0, y: 0, z: 0};
    const center = new Vector3(node.x, -node.y, node.z).add(
      new Vector3(offset.x, offset.y, offset.z).applyQuaternion(orientation),
    );
    parts.push({center, radius});
  }
  if (!parts.length) return null;

  const maximumTop = Math.max(...parts.map((part) => part.center.y + part.radius));
  const minimumBottom = Math.min(...parts.map((part) => part.center.y - part.radius));
  const crownBand = Math.max(28, (maximumTop - minimumBottom) * 0.32);
  const crownParts = parts.filter((part) => part.center.y + part.radius >= maximumTop - crownBand);
  const minimum = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const maximum = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  for (const part of crownParts) {
    minimum.min(part.center.clone().addScalar(-part.radius));
    maximum.max(part.center.clone().addScalar(part.radius));
  }

  const localCenter = minimum.clone().add(maximum).multiplyScalar(0.5);
  const worldScale = Math.max(0.01, flower.scale);
  const worldCenter = localCenter
    .applyEuler(new Euler(flower.leanX ?? 0, flower.rotationY ?? 0, flower.leanZ ?? 0, 'XYZ'))
    .multiplyScalar(worldScale)
    .add(new Vector3(flower.x, -flower.y, flower.z));
  const size = maximum.clone().sub(minimum).multiplyScalar(worldScale);

  return {
    instanceId: flower.instanceId,
    center: worldCenter,
    horizontalRadius: Math.max(MINIMUM_CROWN_RADIUS, Math.max(size.x, size.z) * 0.5),
    verticalRadius: Math.max(MINIMUM_CROWN_RADIUS, size.y * 0.5),
    heightAboveInsertion: Math.max(24, Math.abs(worldCenter.y + flower.y)),
  };
}

function crownsStronglyOverlap(first: CrownHull, second: CrownHull): boolean {
  return normalizedCrownDistance(first, second) < STRONG_OVERLAP_THRESHOLD;
}

function crownSeparationPush(first: CrownHull, second: CrownHull): Vector3 | null {
  const horizontalRadius = first.horizontalRadius + second.horizontalRadius;
  const verticalRadius = first.verticalRadius + second.verticalRadius;
  const verticalDistance = Math.abs(first.center.y - second.center.y) / verticalRadius;
  if (verticalDistance >= STRONG_OVERLAP_THRESHOLD) return null;
  const targetHorizontalDistance = Math.sqrt(
    STRONG_OVERLAP_THRESHOLD ** 2 - verticalDistance ** 2,
  ) * horizontalRadius;
  let dx = first.center.x - second.center.x;
  let dz = first.center.z - second.center.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= targetHorizontalDistance) return null;
  if (distance < 0.001) {
    const angle = deterministicAngle(first.instanceId, second.instanceId);
    dx = Math.cos(angle);
    dz = Math.sin(angle);
  } else {
    dx /= distance;
    dz /= distance;
  }
  const movement = Math.min(20, (targetHorizontalDistance - distance + 1) * 0.52);
  return new Vector3(dx * movement, 0, dz * movement);
}

function normalizedCrownDistance(first: CrownHull, second: CrownHull): number {
  const horizontalRadius = first.horizontalRadius + second.horizontalRadius;
  const verticalRadius = first.verticalRadius + second.verticalRadius;
  const dx = (first.center.x - second.center.x) / horizontalRadius;
  const dy = (first.center.y - second.center.y) / verticalRadius;
  const dz = (first.center.z - second.center.z) / horizontalRadius;
  return Math.hypot(dx, dy, dz);
}

function addCorrection(corrections: Map<string, Vector3>, instanceId: string, correction: Vector3): void {
  const current = corrections.get(instanceId);
  if (current) current.add(correction);
  else corrections.set(instanceId, correction.clone());
}

function clampToRadius(x: number, z: number, radius: number): {x: number; z: number} {
  const distance = Math.hypot(x, z);
  return distance > radius && distance > 0
    ? {x: x / distance * radius, z: z / distance * radius}
    : {x, z};
}

function deterministicAngle(firstId: string, secondId: string): number {
  const value = `${firstId}:${secondId}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff * Math.PI * 2;
}
