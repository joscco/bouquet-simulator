import {describe, expect, it} from 'vitest';
import {bouquetEffectLoopPhase, sparkleBrightness} from './bouquet-scene-effects';

describe('bouquet scene effect loop', () => {
  it('returns to the same phase after the six-second video duration', () => {
    expect(bouquetEffectLoopPhase(0)).toBeCloseTo(bouquetEffectLoopPhase(6));
    expect(bouquetEffectLoopPhase(1.5)).toBeCloseTo(bouquetEffectLoopPhase(7.5));
  });

  it('lets each warm light appear, peak, and disappear again', () => {
    expect(sparkleBrightness(0)).toBeCloseTo(0);
    expect(sparkleBrightness(Math.PI)).toBeGreaterThan(1);
    expect(sparkleBrightness(Math.PI * 2)).toBeCloseTo(0);
  });
});
