import {describe, expect, it} from 'vitest';
import {Color} from 'three';
import {
  applyBouquetSceneLighting,
  bouquetVignetteRadius,
  createBouquetSceneBackground,
  createBouquetSceneLighting,
} from './bouquet-scene-runtime';

describe('bouquet scene lighting', () => {
  it('interpolates continuously through a brighter night and warm twilight', () => {
    const lighting = createBouquetSceneLighting();

    applyBouquetSceneLighting(lighting, 0, null);
    const nightIntensity = lighting.hemisphere.intensity;
    const nightColor = lighting.key.color.getHexString();

    applyBouquetSceneLighting(lighting, 25, null);
    expect(lighting.hemisphere.intensity).toBeGreaterThan(nightIntensity);
    expect(lighting.key.color.getHexString()).toBe('ff78ad');

    applyBouquetSceneLighting(lighting, 50, null);
    expect(lighting.key.color.getHexString()).not.toBe(nightColor);
    expect(lighting.key.intensity).toBeCloseTo(5.04);
    expect(lighting.rim.intensity).toBeCloseTo(2.59);

    applyBouquetSceneLighting(lighting, 100, null);
    expect(lighting.hemisphere.intensity).toBeCloseTo(1.45);
    expect(lighting.key.intensity).toBeCloseTo(2.89);
  });

  it('falls back to the mood base color when canvas textures are unavailable', () => {
    const background = createBouquetSceneBackground(50);

    expect(background).toBeInstanceOf(Color);
    if (!(background instanceof Color)) throw new Error('Expected the non-canvas color fallback.');
    expect(background.getHexString()).toBe('ef7f45');
  });

  it('uses a completely flat mood color when the vignette is disabled', () => {
    const background = createBouquetSceneBackground(50, {x: 0.5, y: 0.5}, 0.6, false);

    expect(background).toBeInstanceOf(Color);
    if (!(background instanceof Color)) throw new Error('Expected a flat background color.');
    expect(background.getHexString()).toBe('ef7f45');
  });

  it('scales the vignette with the visible bouquet size', () => {
    expect(bouquetVignetteRadius(0.4)).toBeCloseTo(0.4);
    expect(bouquetVignetteRadius(0.8)).toBeCloseTo(0.6);
    expect(bouquetVignetteRadius(1.2)).toBeCloseTo(0.8);
  });
});
