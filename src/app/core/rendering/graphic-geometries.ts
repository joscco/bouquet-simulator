import {
  BufferAttribute,
  BufferGeometry,
  SphereGeometry,
} from 'three';
import {
  GraphicBendProfile,
  GraphicLeafEdgeSettings,
  GraphicPrimitive,
} from '../models/flower.models';
import {FLOWER_CREATION_DEFAULTS} from '../models/flower-creation-defaults';

export const DEFAULT_LEAF_EDGE: Readonly<GraphicLeafEdgeSettings> =
  FLOWER_CREATION_DEFAULTS.graphic.leafEdge!;

/**
 * Zentrale 3D-Modelldaten der eingebauten Grafikformen.
 *
 * Neue Blattkonturen werden hier als Breitenprofil über die Hauptrichtung
 * definiert. So bleiben Auswahl, Vorschau und Export an einer Stelle erweiterbar.
 */
export const BUILT_IN_GRAPHICS: ReadonlyArray<{
  value: GraphicPrimitive;
  labelKey: string;
  organic: boolean;
}> = [
  {value: 'leaf-pointed', labelKey: 'inspector.primitives.leaf', organic: true},
  {value: 'sphere', labelKey: 'inspector.primitives.sphere', organic: false},
];

export function canonicalGraphicPrimitive(primitive: GraphicPrimitive): GraphicPrimitive {
  if (primitive === 'png' || primitive === 'sphere') return primitive;
  if (primitive === 'rod' || primitive === 'cone' || primitive === 'disc') return 'sphere';
  return 'leaf-pointed';
}

export function createBuiltInGeometry(
  primitive: GraphicPrimitive,
  width: number,
  height: number,
  depth: number,
  bendMain = 0,
  bendCross = 0,
  bendMainProfile?: GraphicBendProfile,
  bendCrossProfile?: GraphicBendProfile,
  leafEdge?: GraphicLeafEdgeSettings,
  twist = 0,
  ribCount = 0,
  ribDepth = 0,
): BufferGeometry {
  const canonical = canonicalGraphicPrimitive(primitive);
  if (canonical === 'sphere') {
    const geometry = new SphereGeometry(0.5, 20, 14);
    if (ribCount >= 1 && ribDepth > 0) {
      const positions = geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index++) {
        const x = positions.getX(index);
        const z = positions.getZ(index);
        const angle = Math.atan2(z, x);
        const factor = 1 - Math.max(0, Math.min(0.35, ribDepth / 100 * 0.35))
          * (0.5 + 0.5 * Math.cos(angle * Math.round(ribCount)));
        positions.setX(index, x * factor);
        positions.setZ(index, z * factor);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    geometry.scale(width, height, depth);
    return geometry;
  }
  return createLeafGeometry(
    canonical,
    width,
    height,
    depth,
    bendMain,
    bendCross,
    bendMainProfile,
    bendCrossProfile,
    leafEdge,
    twist,
  );
}

function createLeafGeometry(
  primitive: GraphicPrimitive,
  width: number,
  height: number,
  depth: number,
  bendMain: number,
  bendCross: number,
  bendMainProfile?: GraphicBendProfile,
  bendCrossProfile?: GraphicBendProfile,
  leafEdge?: GraphicLeafEdgeSettings,
  twist = 0,
): BufferGeometry {
  const maximumMainBend = maximumProfileBend(bendMain, bendMainProfile);
  const maximumCrossBend = maximumProfileBend(bendCross, bendCrossProfile);
  const edge = normalizedLeafEdge(leafEdge);
  const contourRows = edge.serrationDepth > 0 ? Math.ceil(edge.serrationCount) * 6 : 28;
  const rows = adaptiveSegments(Math.max(28, contourRows), maximumMainBend, 96);
  const columns = adaptiveSegments(16, maximumCrossBend, 40);
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const layerSize = (rows + 1) * (columns + 1);
  const mainCurve = mainCurvePoints(rows, height, bendMain, bendMainProfile);

  for (const side of [-1, 1]) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const halfWidth = width * 0.5 * leafWidthAt(primitive, v, leafEdge);
      const mainArc = mainCurve[row];
      const crossCurvature = profileCurvature(
        v,
        (bendCrossProfile?.base ?? bendCross) / 100,
        (bendCrossProfile?.tip ?? bendCross) / 100,
      );
      const crossBendAngle = crossCurvature * Math.PI * 0.7;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns;
        const normalizedX = u * 2 - 1;
        const x = normalizedX * halfWidth;
        const crossArc = arcPoint(x, width / 2, crossBendAngle);
        const localNormal = side * depth / 2 + crossArc.offset;
        const twistAngle = twist * Math.PI / 180 * v;
        const twistedX = crossArc.forward * Math.cos(twistAngle) - localNormal * Math.sin(twistAngle);
        const twistedNormal = crossArc.forward * Math.sin(twistAngle) + localNormal * Math.cos(twistAngle);
        vertices.push(
          twistedX,
          mainArc.forward - twistedNormal * Math.sin(mainArc.angle),
          mainArc.offset + twistedNormal * Math.cos(mainArc.angle),
        );
        uvs.push(u, v);
      }
    }
  }

  for (let layer = 0; layer < 2; layer++) {
    const offset = layer * layerSize;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = offset + row * (columns + 1) + column;
        const b = a + 1;
        const c = a + columns + 1;
        const d = c + 1;
        if (layer === 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }

  for (let row = 0; row < rows; row++) {
    connectLayers(row * (columns + 1), (row + 1) * (columns + 1));
    connectLayers(row * (columns + 1) + columns, (row + 1) * (columns + 1) + columns, true);
  }
  for (let column = 0; column < columns; column++) {
    connectLayers(column, column + 1, true);
    connectLayers(rows * (columns + 1) + column, rows * (columns + 1) + column + 1);
  }

  function connectLayers(first: number, second: number, reverse = false): void {
    const backFirst = first;
    const backSecond = second;
    const frontFirst = first + layerSize;
    const frontSecond = second + layerSize;
    if (reverse) {
      indices.push(backFirst, frontFirst, backSecond, backSecond, frontFirst, frontSecond);
    } else {
      indices.push(backFirst, backSecond, frontFirst, backSecond, frontSecond, frontFirst);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mainCurvePoints(
  rows: number,
  height: number,
  bendMain: number,
  profile?: GraphicBendProfile,
): Array<{forward: number; offset: number; angle: number}> {
  const baseCurvature = (profile?.base ?? bendMain) / 100;
  const tipCurvature = (profile?.tip ?? bendMain) / 100;
  const maximumAngle = Math.PI * 0.85;
  const stepLength = height / rows;
  const points = [{forward: 0, offset: 0, angle: 0}];
  let forward = 0;
  let offset = 0;
  let angle = 0;
  for (let row = 1; row <= rows; row++) {
    const midpoint = (row - 0.5) / rows;
    const curvature = coiledCurvature(
      profileCurvature(midpoint, baseCurvature, tipCurvature),
      midpoint,
    );
    const angleStep = curvature * maximumAngle / rows;
    const midpointAngle = angle + angleStep / 2;
    forward += Math.cos(midpointAngle) * stepLength;
    offset += Math.sin(midpointAngle) * stepLength;
    angle += angleStep;
    points.push({forward, offset, angle});
  }
  return points;
}

/**
 * Ansatz und Spitze sind absolute lokale Zielwölbungen. Nur in einem kurzen
 * Bereich um die Mitte wird C1-stetig zwischen beiden Zonen überblendet.
 */
function profileCurvature(
  progress: number,
  baseCurvature: number,
  tipCurvature: number,
): number {
  const transitionStart = 0.42;
  const transitionEnd = 0.58;
  if (progress <= transitionStart) return baseCurvature;
  if (progress >= transitionEnd) return tipCurvature;
  const linear = (progress - transitionStart) / (transitionEnd - transitionStart);
  const smooth = linear * linear * (3 - 2 * linear);
  return baseCurvature + (tipCurvature - baseCurvature) * smooth;
}

function arcPoint(
  distance: number,
  totalDistance: number,
  totalAngle: number,
): {forward: number; offset: number; angle: number} {
  if (Math.abs(totalAngle) < 1e-6 || totalDistance <= 0) {
    return {forward: distance, offset: 0, angle: 0};
  }
  const normalizedBend = totalAngle / (Math.PI * 0.7);
  const coilStrength = coilingStrength(normalizedBend);
  if (coilStrength > 0) {
    const extent = Math.min(1, Math.abs(distance) / totalDistance);
    const segments = Math.max(8, Math.ceil(extent * 32));
    const stepLength = distance / segments;
    const angularRate = totalAngle / totalDistance;
    let forward = 0;
    let offset = 0;
    let angle = 0;
    for (let segment = 0; segment < segments; segment++) {
      const progress = (segment + 0.5) / segments * extent;
      const angleStep = angularRate
        * (1 + coilStrength * (progress * 2 - 1))
        * stepLength;
      const midpointAngle = angle + angleStep / 2;
      forward += Math.cos(midpointAngle) * stepLength;
      offset += Math.sin(midpointAngle) * stepLength;
      angle += angleStep;
    }
    return {forward, offset, angle};
  }
  const angle = totalAngle * distance / totalDistance;
  const radius = totalDistance / totalAngle;
  return {
    forward: radius * Math.sin(angle),
    offset: radius * (1 - Math.cos(angle)),
    angle,
  };
}

/**
 * Krümmungen bis 100 % bleiben Kreisbögen. Darüber wächst die Krümmung entlang
 * der Form, sodass weitere Umdrehungen eine lesbare, enger werdende Spirale bilden.
 */
function coiledCurvature(curvature: number, progress: number): number {
  return curvature * (1 + coilingStrength(curvature) * (progress * 2 - 1));
}

function coilingStrength(normalizedBend: number): number {
  return Math.min(0.78, Math.max(0, Math.abs(normalizedBend) - 1) * 0.35);
}

function leafWidthAt(
  primitive: GraphicPrimitive,
  progress: number,
  leafEdge?: GraphicLeafEdgeSettings,
): number {
  const pointed = Math.sin(Math.PI * progress) ** 0.72;
  let profile = pointed;
  if (primitive === 'leaf-round') {
    profile = Math.sin(Math.PI * Math.min(1, progress * 1.14)) ** 0.58;
  }
  if (primitive === 'petal-rounded') {
    const roundedTip = Math.sin(Math.PI * progress) ** 0.34;
    const taperedBase = Math.min(1, progress * 4.5) ** 0.55;
    profile = roundedTip * taperedBase;
  }
  if (canonicalGraphicPrimitive(primitive) === 'leaf-pointed') {
    profile = pointed * serrationWidth(progress, normalizedLeafEdge(leafEdge));
  }
  return Math.max(0.015, profile);
}

function normalizedLeafEdge(settings?: GraphicLeafEdgeSettings): GraphicLeafEdgeSettings {
  return {
    serrationCount: Math.max(1, Math.min(80, Math.round(
      settings?.serrationCount ?? DEFAULT_LEAF_EDGE.serrationCount,
    ))),
    serrationDepth: Math.max(0, Math.min(80,
      settings?.serrationDepth ?? DEFAULT_LEAF_EDGE.serrationDepth,
    )),
    serrationSharpness: Math.max(0, Math.min(100,
      settings?.serrationSharpness ?? DEFAULT_LEAF_EDGE.serrationSharpness,
    )),
    edgeCurvature: Math.max(-100, Math.min(100,
      settings?.edgeCurvature ?? DEFAULT_LEAF_EDGE.edgeCurvature,
    )),
  };
}

/** Kontinuierliches Breitenprofil ohne die früheren, an Mesh-Zeilen gebundenen Sprünge. */
function serrationWidth(progress: number, settings: GraphicLeafEdgeSettings): number {
  if (progress <= 0.025 || progress >= 0.975 || settings.serrationDepth <= 0) return 1;
  const usableProgress = (progress - 0.025) / 0.95;
  const phase = (usableProgress * settings.serrationCount) % 1;
  const triangle = 1 - Math.abs(phase * 2 - 1);
  const concave = 1 - Math.cos(triangle * Math.PI / 2);
  const convex = Math.sin(triangle * Math.PI / 2);
  const curvatureMix = (settings.edgeCurvature + 100) / 200;
  const curvedTransition = concave + (convex - concave) * curvatureMix;
  const sharpnessExponent = 0.65 + settings.serrationSharpness / 100 * 3.35;
  const tooth = curvedTransition ** sharpnessExponent;
  return 1 - settings.serrationDepth / 100 * (1 - tooth);
}

function maximumProfileBend(value: number, profile: GraphicBendProfile | undefined): number {
  return Math.max(Math.abs(value), Math.abs(profile?.base ?? 0), Math.abs(profile?.tip ?? 0));
}

function adaptiveSegments(base: number, maximumBend: number, maximum: number): number {
  if (maximumBend <= 100) return base;
  return Math.min(maximum, base + Math.ceil((maximumBend - 100) / 25));
}
