import {describe, expect, it} from 'vitest';
import {
  BUILT_IN_GRAPHICS,
  canonicalGraphicPrimitive,
  createBuiltInGeometry,
} from './graphic-geometries';

describe('built-in graphic geometries', () => {
  it('offers one pointed, one round and one serrated leaf instead of petal duplicates', () => {
    expect(BUILT_IN_GRAPHICS.map((graphic) => graphic.value)).toEqual([
      'leaf-pointed',
      'leaf-round',
      'leaf-serrated',
      'sphere',
      'rod',
    ]);
  });

  it('creates UV mapped, curved leaf geometry', () => {
    const flat = createBuiltInGeometry('leaf-serrated', 50, 80, 2, 0, 0);
    const curved = createBuiltInGeometry('leaf-serrated', 50, 80, 2, 70, -40);
    const flatPositions = flat.getAttribute('position');
    const curvedPositions = curved.getAttribute('position');

    expect(flat.getAttribute('uv').count).toBe(flatPositions.count);
    expect(curvedPositions.count).toBe(flatPositions.count);
    expect(curvedPositions.getZ(curvedPositions.count - 20))
      .not.toBeCloseTo(flatPositions.getZ(flatPositions.count - 20));
    expect(curved.boundingBox).toBeNull();

    flat.dispose();
    curved.dispose();
  });

  it('bends the center line as an arc instead of stretching it along z', () => {
    const geometry = createBuiltInGeometry('leaf-pointed', 50, 100, 2, 100, 0);
    const positions = geometry.getAttribute('position');
    const rowSize = 17;
    const centerColumn = 8;
    const tip = 28 * rowSize + centerColumn;

    expect(positions.getY(tip)).toBeLessThan(50);
    expect(Math.abs(positions.getZ(tip))).toBeGreaterThan(50);
    geometry.dispose();
  });
});
