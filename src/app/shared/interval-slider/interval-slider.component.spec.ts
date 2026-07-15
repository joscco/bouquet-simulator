import {describe, expect, it} from 'vitest';
import {rangePercentage, sortedRange} from './interval-slider.component';

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
