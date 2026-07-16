import {describe, expect, it} from 'vitest';
import {expandedRange, rangePercentage, sortedRange} from './number-range';

describe('interval slider value mapping', () => {
  it('uses the complete track for the complete configured interval', () => {
    expect(rangePercentage(0, 0, 360)).toBe(0);
    expect(rangePercentage(180, 0, 360)).toBe(50);
    expect(rangePercentage(360, 0, 360)).toBe(100);
  });

  it('assigns min and max by value, regardless of which handle produced it', () => {
    expect(sortedRange(280, 40)).toEqual({min: 40, max: 280});
    expect(sortedRange(-20, -80)).toEqual({min: -80, max: -20});
  });

  it('keeps the handle positions inside the rendered track', () => {
    expect(rangePercentage(-40, 0, 100)).toBe(0);
    expect(rangePercentage(140, 0, 100)).toBe(100);
  });
});

describe('interval slider modes', () => {
  it('expands a fixed value symmetrically', () => {
    expect(expandedRange(90, 0, 180, 1)).toEqual({min: 81, max: 99});
  });

  it('keeps an expanded range inside its configured limits', () => {
    expect(expandedRange(0, 0, 10, 1)).toEqual({min: 0, max: 1});
  });
});
