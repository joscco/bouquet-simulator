import {Box3, BufferAttribute, PointLight, Points, PointsMaterial, Vector3} from 'three';
import {describe, expect, it, vi} from 'vitest';
import {
  BouquetSceneEffectsRenderer,
  bouquetEffectLoopPhase,
  glowPointBrightness,
  sparkleBrightness,
} from './bouquet-scene-effects';

const ALL_EFFECTS = {sparkles: true, glowPoints: true, uplight: true, vignette: true};
const SPARKLES_ONLY = {sparkles: true, glowPoints: false, uplight: false, vignette: false};
const BOUNDS = new Box3(new Vector3(-50, -100, -30), new Vector3(70, 140, 40));

describe('BouquetSceneEffectsRenderer', () => {
  it('does not rebuild for an identical configuration or identical bounds', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.setBounds(BOUNDS);
    renderer.configure(ALL_EFFECTS, 'light');
    const initialChildren = [...renderer.group.children];

    renderer.configure({...ALL_EFFECTS}, 'light');
    renderer.setBounds(BOUNDS.clone());

    expect(renderer.group.children).toHaveLength(initialChildren.length);
    expect(renderer.group.children.every((child, index) => child === initialChildren[index])).toBe(true);
    renderer.dispose();
  });

  it('rebuilds when bounds change and disposes the previous particle resources', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.configure(SPARKLES_ONLY, 'light');
    const initialPoints = firstPoints(renderer);
    const disposeGeometry = vi.spyOn(initialPoints.geometry, 'dispose');
    const disposeMaterial = vi.spyOn(initialPoints.material as PointsMaterial, 'dispose');

    renderer.setBounds(new Box3(
      new Vector3(-120, -200, -90),
      new Vector3(150, 260, 110),
    ));

    expect(firstPoints(renderer)).not.toBe(initialPoints);
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
    renderer.dispose();
  });

  it('can be disposed repeatedly and rebuilds the same requested state afterwards', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.configure(SPARKLES_ONLY, 'dark');
    const initialPoints = firstPoints(renderer);
    const disposeGeometry = vi.spyOn(initialPoints.geometry, 'dispose');

    renderer.dispose();
    renderer.dispose();

    expect(renderer.group.children).toHaveLength(0);
    expect(renderer.animated).toBe(false);
    expect(disposeGeometry).toHaveBeenCalledOnce();

    renderer.configure({...SPARKLES_ONLY}, 'dark');

    expect(renderer.animated).toBe(true);
    expect(firstPoints(renderer)).not.toBe(initialPoints);
    renderer.dispose();
  });

  it('derives animation from the active runtime', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.configure({sparkles: false, glowPoints: false, uplight: true, vignette: false}, 'light');
    expect(renderer.animated).toBe(false);

    renderer.configure({sparkles: false, glowPoints: true, uplight: true, vignette: false}, 'light');
    expect(renderer.animated).toBe(true);

    renderer.dispose();
    expect(renderer.animated).toBe(false);
  });

  it('creates deterministic particles for the same configuration and bounds', () => {
    const left = new BouquetSceneEffectsRenderer();
    const right = new BouquetSceneEffectsRenderer();
    left.setBounds(BOUNDS);
    right.setBounds(BOUNDS.clone());
    left.configure(ALL_EFFECTS, 'dark');
    right.configure({...ALL_EFFECTS}, 'dark');
    left.updatePhase(0.371);
    right.updatePhase(0.371);

    expect(particleSnapshots(left)).toEqual(particleSnapshots(right));

    left.dispose();
    right.dispose();
  });

  it('keeps glow lights synchronized with their particles', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.setBounds(BOUNDS);
    renderer.configure({sparkles: false, glowPoints: true, uplight: false, vignette: false}, 'dark');
    renderer.updatePhase(0.43);

    const points = firstPoints(renderer);
    const positions = points.geometry.getAttribute('position') as BufferAttribute;
    const lights = renderer.group.children.filter(
      (child): child is PointLight => child instanceof PointLight,
    );

    expect(lights).toHaveLength(positions.count);
    lights.forEach((light, index) => {
      expect(light.position.toArray()).toEqual([
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      ]);
      expect(light.intensity).toBeGreaterThanOrEqual(0);
    });
    renderer.dispose();
  });

  it('uses normalized phase independently from a recording duration', () => {
    const renderer = new BouquetSceneEffectsRenderer();
    renderer.configure(SPARKLES_ONLY, 'light');

    renderer.updatePhase(0.25);
    const normalizedPhase = particleSnapshots(renderer);
    renderer.update(1.5);
    expect(particleSnapshots(renderer)).toEqual(normalizedPhase);

    renderer.update(7.5);
    expect(particleSnapshots(renderer)).toEqual(normalizedPhase);

    renderer.updatePhase(1);
    const wrappedPhase = particleSnapshots(renderer);
    renderer.updatePhase(0);
    expect(particleSnapshots(renderer)).toEqual(wrappedPhase);
    renderer.dispose();
  });
});

describe('bouquet scene effect loop', () => {
  it('returns a normalized phase on a six-second live-preview loop', () => {
    expect(bouquetEffectLoopPhase(0)).toBeCloseTo(0);
    expect(bouquetEffectLoopPhase(1.5)).toBeCloseTo(0.25);
    expect(bouquetEffectLoopPhase(6)).toBeCloseTo(0);
    expect(bouquetEffectLoopPhase(7.5)).toBeCloseTo(0.25);
  });

  it('lets each warm light appear, peak, and disappear again', () => {
    expect(sparkleBrightness(0)).toBeCloseTo(0);
    expect(sparkleBrightness(Math.PI)).toBeGreaterThan(1);
    expect(sparkleBrightness(Math.PI * 2)).toBeCloseTo(0);
  });

  it('keeps glow points softly visible instead of making them sparkle', () => {
    expect(glowPointBrightness(0)).toBeGreaterThan(0.7);
    expect(glowPointBrightness(Math.PI)).toBeGreaterThan(0.7);
    expect(glowPointBrightness(Math.PI * 2)).toBeGreaterThan(0.7);
  });
});

function firstPoints(renderer: BouquetSceneEffectsRenderer): Points {
  const points = renderer.group.children.find((child): child is Points => child instanceof Points);
  if (!points) throw new Error('Expected particle points.');
  return points;
}

function particleSnapshots(renderer: BouquetSceneEffectsRenderer): number[][] {
  return renderer.group.children
    .filter((child): child is Points => child instanceof Points)
    .flatMap((points) => ['position', 'color'].map((attributeName) => {
      const attribute = points.geometry.getAttribute(attributeName) as BufferAttribute;
      return Array.from(attribute.array);
    }));
}
