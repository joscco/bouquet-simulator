import {BouquetBackgroundMode, BouquetSceneEffectId, BouquetSceneEffects} from '../models/flower.models';
import {clamp, lerp} from '../utils/numbers';

export const DEFAULT_BOUQUET_BACKGROUND: BouquetBackgroundMode = 'light';
export const DEFAULT_BOUQUET_LIGHT_LEVEL = 100;
export const DEFAULT_BOUQUET_SCENE_EFFECTS: BouquetSceneEffects = {
  sparkles: false,
  glowPoints: false,
  uplight: false,
};

export const BOUQUET_SCENE_EFFECT_OPTIONS: ReadonlyArray<{
  id: BouquetSceneEffectId;
  name: string;
  symbol: string;
}> = [
  {id: 'sparkles', name: 'Lichterglanz', symbol: 'auto_awesome'},
  {id: 'glowPoints', name: 'Lichtpunkte', symbol: 'flare'},
  {id: 'uplight', name: 'Licht von unten', symbol: 'vertical_align_top'},
];

export function isBouquetBackgroundMode(value: unknown): value is BouquetBackgroundMode {
  return value === 'light' || value === 'dark';
}

export function normalizedBouquetBackgroundMode(value: unknown): BouquetBackgroundMode {
  return isBouquetBackgroundMode(value) ? value : DEFAULT_BOUQUET_BACKGROUND;
}

export function normalizedBouquetLightLevel(
  value: unknown,
  legacyBackgroundMode?: unknown,
): number {
  if (typeof value === 'number' && Number.isFinite(value)) return clamp(value, 0, 100);
  return normalizedBouquetBackgroundMode(legacyBackgroundMode) === 'dark'
    ? 0
    : DEFAULT_BOUQUET_LIGHT_LEVEL;
}

export function bouquetBackgroundModeForLightLevel(lightLevel: number): BouquetBackgroundMode {
  return normalizedBouquetLightLevel(lightLevel) < 35 ? 'dark' : 'light';
}

export function bouquetBackgroundColor(lightLevel: number): string {
  const level = normalizedBouquetLightLevel(lightLevel);
  if (level <= 18) return interpolateHexColor('#080b18', '#172d66', level / 18);
  if (level <= 32) return interpolateHexColor('#172d66', '#66317c', (level - 18) / 14);
  if (level <= 50) return interpolateHexColor('#66317c', '#ef7f45', (level - 32) / 18);
  if (level <= 68) return interpolateHexColor('#ef7f45', '#f0a33f', (level - 50) / 18);
  if (level <= 82) return interpolateHexColor('#f0a33f', '#f5d69c', (level - 68) / 14);
  return interpolateHexColor('#f5d69c', '#f8f7f2', (level - 82) / 18);
}

export function bouquetToneMappingExposure(lightLevel: number): number {
  const level = normalizedBouquetLightLevel(lightLevel);
  return level <= 50
    ? lerp(1.1, 1.06, level / 50)
    : lerp(1.06, 1.08, (level - 50) / 50);
}

export function normalizedBouquetSceneEffects(
  value: (Partial<BouquetSceneEffects> & {fireflies?: boolean; glitter?: boolean}) | undefined,
): BouquetSceneEffects {
  const legacySparkles = value?.sparkles === true || value?.fireflies === true || value?.glitter === true;
  const legacyCombinedEffect = legacySparkles
    && value?.glowPoints === undefined
    && value?.uplight === undefined;
  return {
    sparkles: legacySparkles,
    glowPoints: value?.glowPoints === true || legacyCombinedEffect,
    uplight: value?.uplight === true,
  };
}

function interpolateHexColor(from: string, to: string, unit: number): string {
  const start = Number.parseInt(from.slice(1), 16);
  const end = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number) => Math.round(lerp(
    start >> shift & 0xff,
    end >> shift & 0xff,
    clamp(unit, 0, 1),
  ));
  return `#${[channel(16), channel(8), channel(0)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}
