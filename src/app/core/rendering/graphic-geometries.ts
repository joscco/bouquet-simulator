import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  SphereGeometry,
} from 'three';
import {GraphicBendProfile, GraphicPrimitive} from '../models/flower.models';

/**
 * Zentrale 3D-Modelldaten der eingebauten Grafikformen.
 *
 * Neue Blattkonturen werden hier als Breitenprofil über die Hauptrichtung
 * definiert. So bleiben Auswahl, Vorschau und Export an einer Stelle erweiterbar.
 */
export const BUILT_IN_GRAPHICS: ReadonlyArray<{
  value: GraphicPrimitive;
  label: string;
  organic: boolean;
}> = [
  {value: 'leaf-pointed', label: 'Blatt', organic: true},
  {value: 'leaf-serrated', label: 'Zackiges Blatt', organic: true},
  {value: 'sphere', label: 'Kugel', organic: false},
  {value: 'rod', label: 'Stäbchen', organic: false},
];

export function canonicalGraphicPrimitive(primitive: GraphicPrimitive): GraphicPrimitive {
  return primitive === 'leaf-round' ? 'leaf-pointed' : primitive;
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
): BufferGeometry {
  if (primitive === 'sphere') {
    const geometry = new SphereGeometry(0.5, 20, 14);
    geometry.scale(width, height, depth);
    return geometry;
  }
  if (primitive === 'rod') {
    const geometry = new CylinderGeometry(0.5, 0.5, 1, 12);
    geometry.translate(0, 0.5, 0);
    geometry.scale(width, height, depth);
    return geometry;
  }
  return createLeafGeometry(
    canonicalGraphicPrimitive(primitive),
    width,
    height,
    depth,
    bendMain,
    bendCross,
    bendMainProfile,
    bendCrossProfile,
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
): BufferGeometry {
  const maximumMainBend = maximumProfileBend(bendMain, bendMainProfile);
  const maximumCrossBend = maximumProfileBend(bendCross, bendCrossProfile);
  const rows = adaptiveSegments(28, maximumMainBend, 56);
  const columns = adaptiveSegments(16, maximumCrossBend, 40);
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const layerSize = (rows + 1) * (columns + 1);
  const mainCurve = mainCurvePoints(rows, height, bendMain, bendMainProfile);

  for (const side of [-1, 1]) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const halfWidth = width * 0.5 * leafWidthAt(primitive, v, row);
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
        vertices.push(
          crossArc.forward,
          mainArc.forward - localNormal * Math.sin(mainArc.angle),
          mainArc.offset + localNormal * Math.cos(mainArc.angle),
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
    const curvature = profileCurvature(midpoint, baseCurvature, tipCurvature);
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
  const angle = totalAngle * distance / totalDistance;
  const radius = totalDistance / totalAngle;
  return {
    forward: radius * Math.sin(angle),
    offset: radius * (1 - Math.cos(angle)),
    angle,
  };
}

function leafWidthAt(primitive: GraphicPrimitive, progress: number, row: number): number {
  const pointed = Math.sin(Math.PI * progress) ** 0.72;
  let profile = pointed;
  if (primitive === 'leaf-round') {
    profile = Math.sin(Math.PI * Math.min(1, progress * 1.14)) ** 0.58;
  }
  if (primitive === 'leaf-serrated') {
    const serration = row === 0 || progress > 0.96 ? 1 : (row % 2 === 0 ? 0.72 : 1);
    profile = pointed * serration;
  }
  return Math.max(0.015, profile);
}

function maximumProfileBend(value: number, profile: GraphicBendProfile | undefined): number {
  return Math.max(Math.abs(value), Math.abs(profile?.base ?? 0), Math.abs(profile?.tip ?? 0));
}

function adaptiveSegments(base: number, maximumBend: number, maximum: number): number {
  if (maximumBend <= 100) return base;
  return Math.min(maximum, base + Math.ceil((maximumBend - 100) / 25));
}
