import {describe, expect, it} from 'vitest';
import {
  bouquetBackgroundColor,
  bouquetBackgroundModeForLightLevel,
  normalizedBouquetLightLevel,
} from './bouquet-scene';

describe('bouquet light mood', () => {
  it('migrates legacy backgrounds and clamps stored slider values', () => {
    expect(normalizedBouquetLightLevel(undefined, 'dark')).toBe(0);
    expect(normalizedBouquetLightLevel(undefined, 'light')).toBe(100);
    expect(normalizedBouquetLightLevel(-20)).toBe(0);
    expect(normalizedBouquetLightLevel(130)).toBe(100);
  });

  it('uses warm twilight between the night and day endpoints', () => {
    expect(bouquetBackgroundColor(0)).toBe('#080b18');
    expect(bouquetBackgroundColor(18)).toBe('#172d66');
    expect(bouquetBackgroundColor(32)).toBe('#66317c');
    expect(bouquetBackgroundColor(50)).toBe('#ef7f45');
    expect(bouquetBackgroundColor(68)).toBe('#f0a33f');
    expect(bouquetBackgroundColor(82)).toBe('#f5d69c');
    expect(bouquetBackgroundColor(100)).toBe('#f8f7f2');
    expect(bouquetBackgroundColor(25)).not.toBe(bouquetBackgroundColor(75));
  });

  it('keeps only the darkest slider range in dark effect mode', () => {
    expect(bouquetBackgroundModeForLightLevel(0)).toBe('dark');
    expect(bouquetBackgroundModeForLightLevel(34)).toBe('dark');
    expect(bouquetBackgroundModeForLightLevel(35)).toBe('light');
  });
});
