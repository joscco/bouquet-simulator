import {describe, expect, it} from 'vitest';
import {formatNumericInputValue} from './numbers';

describe('formatNumericInputValue', () => {
  it('shows at most one decimal place without trailing zeroes', () => {
    expect(formatNumericInputValue(12)).toBe('12');
    expect(formatNumericInputValue(12.04)).toBe('12');
    expect(formatNumericInputValue(12.05)).toBe('12.1');
    expect(formatNumericInputValue(0.42000000000000004)).toBe('0.4');
    expect(formatNumericInputValue(-0.04)).toBe('0');
  });

  it('returns an empty value for invalid numbers', () => {
    expect(formatNumericInputValue(Number.NaN)).toBe('');
    expect(formatNumericInputValue(Number.POSITIVE_INFINITY)).toBe('');
  });
});
