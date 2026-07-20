import {describe, expect, it} from 'vitest';
import {Color} from 'three';
import {
  applyBouquetSceneLighting,
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
    expect(lighting.key.intensity).toBeCloseTo(4.8);
    expect(lighting.rim.intensity).toBeCloseTo(2.25);

    applyBouquetSceneLighting(lighting, 100, null);
    expect(lighting.hemisphere.intensity).toBeCloseTo(1.45);
    expect(lighting.key.intensity).toBeCloseTo(2.75);
  });

  it('uses a flat background color without a gradient texture', () => {
    const background = createBouquetSceneBackground(50);

    expect(background).toBeInstanceOf(Color);
    expect(background.getHexString()).toBe('ef7f45');
  });
});
