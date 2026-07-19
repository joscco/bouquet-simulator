import {
  BufferAttribute,
  BufferGeometry,
  Curve,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import {FlowerTreeNode} from '../../../core/rendering/flower-tree';
import {clamp, lerp} from '../../../core/utils/numbers';
import {flowerTreePosition} from './bouquet-flower-tree';

export interface StemMeshOptions {
  from: FlowerTreeNode;
  to: FlowerTreeNode;
  startWidth: number;
  endWidth: number;
  startJointWidth: number;
  endJointWidth: number;
  color: string;
  opacity: number;
  bend: number;
  curve: number;
  curveRotation: number;
  startTangent?: Vector3;
  endTangent?: Vector3;
  capStart: boolean;
  capEnd: boolean;
}

export function createStemMesh(options: StemMeshOptions): Mesh {
  const start = flowerTreePosition(options.from);
  const end = flowerTreePosition(options.to);
  const length = Math.max(0.01, end.distanceTo(start));
  const bendAmount = clamp(options.bend, -100, 100) / 100;
  const curveAmount = clamp(options.curve, 0, 100) / 100;
  const variation = hashUnit(`${options.from.id}->${options.to.id}`);
  const stemCurve = createNaturalStemCurve(
    start,
    end,
    bendAmount,
    curveAmount,
    options.curveRotation,
    variation,
    options.startTangent,
    options.endTangent,
  );
  const geometry = createTaperedStemGeometry(
    stemCurve,
    options.startWidth / 2,
    options.endWidth / 2,
    options.startJointWidth / 2,
    options.endJointWidth / 2,
    clamp(Math.ceil(length / 8), 6, 24),
    12,
    options.capStart,
    options.capEnd,
  );
  const material = new MeshStandardMaterial({
    color: options.color,
    roughness: 0.78,
    transparent: options.opacity < 1,
    opacity: options.opacity,
    side: DoubleSide,
  });
  return new Mesh(geometry, material);
}

function createNaturalStemCurve(
  start: Vector3,
  end: Vector3,
  bendAmount: number,
  curveAmount: number,
  curveRotation: number,
  variation: number,
  startTangent?: Vector3,
  endTangent?: Vector3,
): Curve<Vector3> {
  const direction = end.clone().sub(start);
  const length = Math.max(0.01, direction.length());
  const tangent = direction.clone().normalize();
  const axis = Math.abs(tangent.dot(new Vector3(0, 0, 1))) > 0.94
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 0, 1);
  const twist = curveRotation
    + (variation - 0.5) * Math.PI * 0.82 * Math.max(0.2, curveAmount);
  const side = tangent.clone().cross(axis).normalize().applyAxisAngle(tangent, twist);
  const lift = side.clone().cross(tangent).normalize();
  const bendScale = 0.78 + variation * 0.42;
  const organicBias = (variation - 0.5) * 0.18 * curveAmount;
  const effectiveBend = bendAmount * bendScale + organicBias;
  return new NaturalStemCurve(
    start,
    end,
    normalizedTangent(startTangent, tangent),
    normalizedTangent(endTangent, tangent),
    side,
    lift,
    effectiveBend,
    curveAmount,
    variation,
  );
}

function createTaperedStemGeometry(
  curve: Curve<Vector3>,
  startRadius: number,
  endRadius: number,
  startJointRadius: number,
  endJointRadius: number,
  lengthSegments: number,
  radialSegments: number,
  capStart: boolean,
  capEnd: boolean,
): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const startFrameNormal = initialStemNormal(curve.getTangent(0).normalize());
  const endFrameNormal = initialStemNormal(curve.getTangent(1).normalize());
  if (startFrameNormal.dot(endFrameNormal) < 0) endFrameNormal.multiplyScalar(-1);

  for (let ring = 0; ring <= lengthSegments; ring++) {
    const t = ring / lengthSegments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const referenceNormal = startFrameNormal.clone().lerp(endFrameNormal, t);
    const projectedNormal = referenceNormal.sub(tangent.clone().multiplyScalar(referenceNormal.dot(tangent)));
    const normal = projectedNormal.lengthSq() > 1e-6
      ? projectedNormal.normalize()
      : initialStemNormal(tangent);
    const binormal = tangent.clone().cross(normal).normalize();
    const baseRadius = lerp(startRadius, endRadius, t);
    const startBlend = smoothEndpointBlend(1 - t / 0.22);
    const endBlend = smoothEndpointBlend(1 - (1 - t) / 0.22);
    const jointRadius = Math.max(
      baseRadius,
      startJointRadius * startBlend,
      endJointRadius * endBlend,
    );
    const radius = Math.max(0, jointRadius);

    for (let segment = 0; segment < radialSegments; segment++) {
      const angle = segment / radialSegments * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle))
        .add(binormal.clone().multiplyScalar(Math.sin(angle)))
        .normalize();
      const point = center.clone().add(radial.clone().multiplyScalar(radius));
      positions.push(point.x, point.y, point.z);
      normals.push(radial.x, radial.y, radial.z);
    }
  }

  for (let ring = 0; ring < lengthSegments; ring++) {
    const current = ring * radialSegments;
    const next = (ring + 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment++) {
      const a = current + segment;
      const b = current + (segment + 1) % radialSegments;
      const c = next + segment;
      const d = next + (segment + 1) % radialSegments;
      indices.push(a, c, b, b, c, d);
    }
  }

  if (capStart) addStemCap(curve, positions, normals, indices, radialSegments, 'start');
  if (capEnd) addStemCap(curve, positions, normals, indices, radialSegments, 'end', lengthSegments);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
}

function addStemCap(
  curve: Curve<Vector3>,
  positions: number[],
  normals: number[],
  indices: number[],
  radialSegments: number,
  end: 'start' | 'end',
  lengthSegments = 0,
): void {
  const atStart = end === 'start';
  const centerIndex = positions.length / 3;
  const point = curve.getPoint(atStart ? 0 : 1);
  positions.push(point.x, point.y, point.z);
  const tangent = curve.getTangent(atStart ? 0 : 1).normalize();
  if (atStart) tangent.multiplyScalar(-1);
  normals.push(tangent.x, tangent.y, tangent.z);
  const ringStart = atStart ? 0 : lengthSegments * radialSegments;
  for (let segment = 0; segment < radialSegments; segment++) {
    const current = ringStart + segment;
    const next = ringStart + (segment + 1) % radialSegments;
    indices.push(centerIndex, atStart ? next : current, atStart ? current : next);
  }
}

class NaturalStemCurve extends Curve<Vector3> {
  private readonly length: number;

  constructor(
    private readonly start: Vector3,
    private readonly end: Vector3,
    private readonly startTangent: Vector3,
    private readonly endTangent: Vector3,
    private readonly side: Vector3,
    private readonly lift: Vector3,
    private readonly bend: number,
    private readonly curveAmount: number,
    private readonly variation: number,
  ) {
    super();
    this.length = Math.max(0.01, start.distanceTo(end));
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const tangentScale = this.length * (0.56 + this.curveAmount * 0.16);
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    target
      .copy(this.start).multiplyScalar(h00)
      .addScaledVector(this.startTangent, h10 * tangentScale)
      .addScaledVector(this.end, h01)
      .addScaledVector(this.endTangent, h11 * tangentScale);

    const envelope = 16 * t2 * (1 - t) * (1 - t);
    const asymmetry = (t - 0.5) * (0.7 + this.variation * 0.6);
    const naturalWave = Math.sin(Math.PI * t)
      * Math.sin(Math.PI * 2 * t + (this.variation - 0.5) * 0.9);
    const sideOffset = this.length
      * (0.24 * this.bend * envelope
        + 0.105 * this.curveAmount * naturalWave * (0.8 + this.variation * 0.4));
    const liftDirection = this.variation < 0.5 ? -1 : 1;
    const liftOffset = this.length * envelope * this.curveAmount
      * (0.055 * liftDirection + 0.035 * asymmetry);
    return target
      .addScaledVector(this.side, sideOffset)
      .addScaledVector(this.lift, liftOffset);
  }
}

function normalizedTangent(candidate: Vector3 | undefined, fallback: Vector3): Vector3 {
  return candidate?.lengthSq() ? candidate.clone().normalize() : fallback.clone();
}

function initialStemNormal(tangent: Vector3): Vector3 {
  const axis = Math.abs(tangent.dot(new Vector3(0, 0, 1))) > 0.94
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 0, 1);
  return tangent.clone().cross(axis).normalize();
}

function smoothEndpointBlend(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}
