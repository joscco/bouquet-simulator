import {describe, expect, it} from 'vitest';
import {
  DEFAULT_VASE_MATERIAL_ID,
  VASE_OPTIONS,
  VASE_MATERIAL_OPTIONS,
  isVaseId,
  isVaseMaterialId,
  normalizedVaseMaterialId,
  vaseInsertionRadius,
} from './vases';

describe('vase materials', () => {
  it('offers the four independent material optics', () => {
    expect(VASE_MATERIAL_OPTIONS.map((option) => option.id))
      .toEqual(['clay', 'stoneware', 'concrete', 'glass']);
  });

  it('validates and migrates serialized material ids', () => {
    expect(isVaseMaterialId('glass')).toBe(true);
    expect(isVaseMaterialId('plastic')).toBe(false);
    expect(normalizedVaseMaterialId(undefined)).toBe(DEFAULT_VASE_MATERIAL_ID);
    expect(normalizedVaseMaterialId('concrete')).toBe('concrete');
  });
});

describe('vase shapes', () => {
  it('offers smooth, handled and structured silhouettes', () => {
    expect(VASE_OPTIONS.map((option) => option.id)).toEqual([
      'classic',
      'tulip',
      'cylinder',
      'bowl',
      'bud',
      'bottle',
      'amphora',
      'ribbed',
      'faceted',
    ]);
  });

  it('provides safe insertion and visible stem depths for every vase', () => {
    for (const vase of VASE_OPTIONS) {
      expect(isVaseId(vase.id)).toBe(true);
      expect(vaseInsertionRadius(vase.id)).toBeGreaterThan(0);
    }
  });
});
