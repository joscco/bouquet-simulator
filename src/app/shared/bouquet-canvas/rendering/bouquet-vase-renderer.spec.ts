import {BufferGeometry, InstancedMesh, Mesh, TubeGeometry, Vector3} from 'three';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {clipVaseStemEnd, createBouquetVase} from './bouquet-vase-renderer';

describe('bouquet vase renderer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps glass amphora handles outside and omits decorative full rings', () => {
    const vase = createBouquetVase('amphora', 'glass');
    const handles = vase.children.slice(-2) as Array<Mesh<TubeGeometry>>;

    expect(vase.children).toHaveLength(5);
    expect(vase.children.some((child) => child instanceof InstancedMesh)).toBe(false);
    expect(handles.every((handle) => handle.geometry instanceof TubeGeometry)).toBe(true);
  });

  it('adds a structured pebble fill only to opaque vases', () => {
    const vase = createBouquetVase('bottle', 'clay');
    const pebbles = vase.children.find((child) => child instanceof InstancedMesh);

    expect(pebbles).toBeInstanceOf(InstancedMesh);
    expect((pebbles as InstancedMesh).count).toBeGreaterThanOrEqual(50);
  });

  it('models radial ribs in geometry and keeps facets flat', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const ribbedGeometry = (createBouquetVase('ribbed', 'clay').children[0] as Mesh).geometry;
    const facetedGeometry = (createBouquetVase('faceted', 'clay').children[0] as Mesh).geometry;

    expect(maximumRadiusSpreadAtOneHeight(ribbedGeometry)).toBeGreaterThan(1.08);
    expect(facetedGeometry.index).toBeNull();
  });

  it('keeps a submerged stem straight and clips it at the first vase boundary', () => {
    const start = new Vector3(0, 16, 0);
    const direction = new Vector3(0.42, -0.91, 0).normalize();
    const end = clipVaseStemEnd('bottle', start, direction, 1.8);
    const clippedDirection = end.clone().sub(start).normalize();

    expect(clippedDirection.dot(direction)).toBeGreaterThan(0.999);
    expect(end.y).toBeGreaterThan(-68);
    expect(end.distanceTo(start)).toBeGreaterThan(1);
  });
});

function maximumRadiusSpreadAtOneHeight(geometry: BufferGeometry): number {
  const positions = geometry.getAttribute('position');
  const radiiByHeight = new Map<string, number[]>();
  for (let index = 0; index < positions.count; index++) {
    const radius = Math.hypot(positions.getX(index), positions.getZ(index));
    if (radius < 10) continue;
    const height = positions.getY(index).toFixed(3);
    radiiByHeight.set(height, [...(radiiByHeight.get(height) ?? []), radius]);
  }
  return Math.max(1, ...[...radiiByHeight.values()]
    .filter((radii) => radii.length > 20)
    .map((radii) => Math.max(...radii) / Math.min(...radii)));
}
