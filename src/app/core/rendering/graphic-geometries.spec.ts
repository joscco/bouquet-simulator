import {describe, expect, it} from 'vitest';
import {
  BUILT_IN_GRAPHICS,
  canonicalGraphicPrimitive,
  createBuiltInGeometry,
} from './graphic-geometries';

describe('built-in graphic geometries', () => {
  it('offers one flexible leaf and one flexible volume', () => {
    expect(BUILT_IN_GRAPHICS.map((graphic) => graphic.value)).toEqual([
      'leaf-pointed',
      'sphere',
    ]);
  });

  it('uses element-specific settings for serrated leaf contours', () => {
    const coarse = createBuiltInGeometry(
      'leaf-serrated', 50, 80, 2, 0, 0, undefined, undefined,
      {serrationCount: 3, serrationDepth: 15, serrationSharpness: 20, edgeCurvature: 80},
    );
    const detailed = createBuiltInGeometry(
      'leaf-serrated', 50, 80, 2, 0, 0, undefined, undefined,
      {serrationCount: 12, serrationDepth: 60, serrationSharpness: 95, edgeCurvature: -90},
    );

    expect(detailed.getAttribute('position').count).toBeGreaterThan(coarse.getAttribute('position').count);
    coarse.dispose();
    detailed.dispose();
  });

  it('keeps legacy primitives renderable through the two canonical forms', () => {
    for (const primitive of ['petal-rounded', 'cone', 'disc'] as const) {
      const geometry = createBuiltInGeometry(primitive, 30, 50, 8);
      expect(geometry.getAttribute('position').count).toBeGreaterThan(20);
      geometry.dispose();
    }
    expect(canonicalGraphicPrimitive('petal-rounded')).toBe('leaf-pointed');
    expect(canonicalGraphicPrimitive('cone')).toBe('sphere');
  });

  it('maps legacy round leaves to pointed leaves', () => {
    expect(canonicalGraphicPrimitive('leaf-round')).toBe('leaf-pointed');
  });

  it('supports twisted leaves and ribbed cactus bodies', () => {
    const flatLeaf = createBuiltInGeometry('leaf-pointed', 30, 70, 3);
    const twistedLeaf = createBuiltInGeometry(
      'leaf-pointed', 30, 70, 3, 0, 0, undefined, undefined, undefined, 180,
    );
    const sphere = createBuiltInGeometry('sphere', 30, 70, 30);
    const ribbed = createBuiltInGeometry(
      'sphere', 30, 70, 30, 0, 0, undefined, undefined, undefined, 0, 8, 55,
    );

    const flatPositions = flatLeaf.getAttribute('position');
    const twistedPositions = twistedLeaf.getAttribute('position');
    const spherePositions = sphere.getAttribute('position');
    const ribbedPositions = ribbed.getAttribute('position');
    expect(twistedPositions.getZ(twistedPositions.count - 20))
      .not.toBeCloseTo(flatPositions.getZ(flatPositions.count - 20));
    expect(Array.from({length: spherePositions.count}, (_, index) => index)
      .some((index) => Math.abs(ribbedPositions.getX(index) - spherePositions.getX(index)) > 0.01))
      .toBe(true);

    flatLeaf.dispose();
    twistedLeaf.dispose();
    sphere.dispose();
    ribbed.dispose();
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

  it('keeps legacy uniform bends identical to an equivalent bend profile', () => {
    const legacy = createBuiltInGeometry('leaf-pointed', 50, 100, 2, 65, 0);
    const profiled = createBuiltInGeometry(
      'leaf-pointed',
      50,
      100,
      2,
      0,
      0,
      {base: 65, tip: 65},
    );
    const legacyPositions = legacy.getAttribute('position');
    const profilePositions = profiled.getAttribute('position');

    expect(profilePositions.count).toBe(legacyPositions.count);
    for (let index = 0; index < legacyPositions.count; index += 53) {
      expect(profilePositions.getY(index)).toBeCloseTo(legacyPositions.getY(index), 5);
      expect(profilePositions.getZ(index)).toBeCloseTo(legacyPositions.getZ(index), 5);
    }

    legacy.dispose();
    profiled.dispose();
  });

  it('changes smoothly from concave at the base to convex at the tip', () => {
    const geometry = createBuiltInGeometry(
      'leaf-pointed',
      50,
      100,
      2,
      0,
      0,
      {base: -100, tip: 100},
    );
    const positions = geometry.getAttribute('position');
    const rowSize = 17;
    const layerSize = 29 * rowSize;
    const centerZ = (row: number) => {
      const back = row * rowSize + 8;
      const front = back + layerSize;
      return (positions.getZ(back) + positions.getZ(front)) / 2;
    };
    const baseCurvature = centerZ(2) - 2 * centerZ(1) + centerZ(0);
    const tipCurvature = centerZ(28) - 2 * centerZ(27) + centerZ(26);

    expect(baseCurvature).toBeLessThan(0);
    expect(tipCurvature).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('keeps the absolute tip curvature independent from the base curvature', () => {
    const first = createBuiltInGeometry(
      'leaf-pointed', 50, 100, 2, 0, 0, {base: -100, tip: 60},
    );
    const second = createBuiltInGeometry(
      'leaf-pointed', 50, 100, 2, 0, 0, {base: 100, tip: 60},
    );

    expect(finalCenterlineTurn(first)).toBeCloseTo(finalCenterlineTurn(second), 5);
    first.dispose();
    second.dispose();
  });

  it('turns strong positive and negative bends into coils instead of overlapping circles', () => {
    const positive = createBuiltInGeometry('leaf-pointed', 50, 100, 2, 240, 0);
    const negative = createBuiltInGeometry('leaf-pointed', 50, 100, 2, -240, 0);
    const positions = positive.getAttribute('position');
    const negativePositions = negative.getAttribute('position');
    const columns = 16;
    const rowSize = columns + 1;
    const layerSize = positions.count / 2;
    const rows = layerSize / rowSize - 1;
    const tipBack = rows * rowSize + columns / 2;
    const tipFront = tipBack + layerSize;
    const tipY = (positions.getY(tipBack) + positions.getY(tipFront)) / 2;
    const tipZ = (positions.getZ(tipBack) + positions.getZ(tipFront)) / 2;
    const negativeTipY = (negativePositions.getY(tipBack) + negativePositions.getY(tipFront)) / 2;
    const negativeTipZ = (negativePositions.getZ(tipBack) + negativePositions.getZ(tipFront)) / 2;

    expect(Math.hypot(tipY, tipZ)).toBeGreaterThan(15);
    expect(negativeTipY).toBeCloseTo(tipY, 4);
    expect(negativeTipZ).toBeCloseTo(-tipZ, 4);
    positive.dispose();
    negative.dispose();
  });

  it('applies an absolute cross-bend profile from base to tip', () => {
    const geometry = createBuiltInGeometry(
      'leaf-pointed',
      50,
      100,
      2,
      0,
      0,
      undefined,
      {base: 0, tip: 300},
    );
    const positions = geometry.getAttribute('position');
    const columns = 24;
    const rowSize = columns + 1;
    const layerSize = 29 * rowSize;
    const edgeOffset = (row: number) => {
      const back = row * rowSize;
      const front = back + layerSize;
      return (positions.getZ(back) + positions.getZ(front)) / 2;
    };

    expect(Math.abs(edgeOffset(3))).toBeLessThan(0.001);
    expect(Math.abs(edgeOffset(22))).toBeGreaterThan(2);
    geometry.dispose();
  });
});

function finalCenterlineTurn(geometry: ReturnType<typeof createBuiltInGeometry>): number {
  const positions = geometry.getAttribute('position');
  const rowSize = 17;
  const layerSize = 29 * rowSize;
  const center = (row: number) => {
    const back = row * rowSize + 8;
    const front = back + layerSize;
    return {
      y: (positions.getY(back) + positions.getY(front)) / 2,
      z: (positions.getZ(back) + positions.getZ(front)) / 2,
    };
  };
  const before = center(26);
  const middle = center(27);
  const tip = center(28);
  const beforeAngle = Math.atan2(middle.z - before.z, middle.y - before.y);
  const tipAngle = Math.atan2(tip.z - middle.z, tip.y - middle.y);
  return tipAngle - beforeAngle;
}
