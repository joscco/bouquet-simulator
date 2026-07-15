import {describe, expect, it} from 'vitest';
import {
  DEFAULT_VASE_MATERIAL_ID,
  VASE_MATERIAL_OPTIONS,
  isVaseMaterialId,
  normalizedVaseMaterialId,
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
