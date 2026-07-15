import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  SphereGeometry,
} from 'three';
import {GraphicPrimitive} from '../models/flower.models';

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
  return createLeafGeometry(canonicalGraphicPrimitive(primitive), width, height, depth, bendMain, bendCross);
}

function createLeafGeometry(
  primitive: GraphicPrimitive,
  width: number,
  height: number,
  depth: number,
  bendMain: number,
  bendCross: number,
): BufferGeometry {
  const rows = 28;
  const columns = 16;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const layerSize = (rows + 1) * (columns + 1);
  const mainBendAngle = bendMain / 100 * Math.PI * 0.85;
  const crossBendAngle = bendCross / 100 * Math.PI * 0.7;

  for (const side of [-1, 1]) {
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const halfWidth = width * 0.5 * leafWidthAt(primitive, v, row);
      const mainArc = arcPoint(v * height, height, mainBendAngle);
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
