import {BouquetBackgroundMode, BouquetSceneEffectId, BouquetSceneEffects} from '../models/flower.models';

export const DEFAULT_BOUQUET_BACKGROUND: BouquetBackgroundMode = 'light';
export const BOUQUET_BACKGROUND_COLORS: Record<BouquetBackgroundMode, string> = {
  light: '#f8f7f2',
  dark: '#111113',
};
export const DEFAULT_BOUQUET_SCENE_EFFECTS: BouquetSceneEffects = {
  sparkles: false,
  glowPoints: false,
  uplight: false,
};

export const BOUQUET_BACKGROUND_OPTIONS: ReadonlyArray<{
  id: BouquetBackgroundMode;
  name: string;
  symbol: string;
}> = [
  {id: 'light', name: 'Hell', symbol: 'light_mode'},
  {id: 'dark', name: 'Dunkel', symbol: 'dark_mode'},
];

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
