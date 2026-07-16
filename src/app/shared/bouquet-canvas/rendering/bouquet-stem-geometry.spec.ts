import {describe, expect, it} from 'vitest';
import {FlowerTreeNode} from '../../../core/rendering/flower-tree';
import {createStemMesh} from './bouquet-stem-geometry';

const from: FlowerTreeNode = {
  id: 'from', templateId: 'from', parentId: null,
  x: 0, y: 0, z: 0, angle: 0, azimuth: 0, depth: 0, draggable: false,
};
const to: FlowerTreeNode = {
  id: 'to', templateId: 'to', parentId: 'from',
  x: 0, y: -100, z: 0, angle: 0, azimuth: 0, depth: 1, draggable: false,
};

describe('bouquet stem geometry', () => {
  it('makes directed bend clearly visible and rotates its plane', () => {
    const alongX = centerOfMiddleRing(createMesh(100, 0, 0));
    const alongZ = centerOfMiddleRing(createMesh(100, 0, Math.PI / 2));

    expect(Math.abs(alongX.x)).toBeGreaterThan(18);
    expect(Math.abs(alongZ.z)).toBeGreaterThan(18);
    expect(Math.abs(alongZ.x)).toBeLessThan(2);
  });

  it('gives natural curvature a visible deterministic silhouette', () => {
    const natural = centerOfMiddleRing(createMesh(0, 100, 0));

    expect(Math.hypot(natural.x, natural.z)).toBeGreaterThan(4);
  });
});

function createMesh(bend: number, curve: number, curveRotation: number) {
  return createStemMesh({
    from, to, startWidth: 4, endWidth: 2, startJointWidth: 4, endJointWidth: 2,
    color: '#50754a', opacity: 1, bend, curve, curveRotation,
    capStart: true, capEnd: true,
  });
}

function centerOfMiddleRing(mesh: ReturnType<typeof createStemMesh>): {x: number; z: number} {
  const positions = mesh.geometry.getAttribute('position');
  const radialSegments = 12;
  const ringCount = Math.floor((positions.count - 2) / radialSegments);
  const ring = Math.floor(ringCount / 2);
  let x = 0;
  let z = 0;
  for (let segment = 0; segment < radialSegments; segment++) {
    const index = ring * radialSegments + segment;
    x += positions.getX(index);
    z += positions.getZ(index);
  }
  mesh.geometry.dispose();
  return {x: x / radialSegments, z: z / radialSegments};
}
