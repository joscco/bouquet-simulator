export interface VaseOption {
  id: string;
  name: string;
  symbol: string;
}

export type VaseMaterialId = 'clay' | 'stoneware' | 'concrete' | 'glass';

export interface VaseMaterialOption {
  id: VaseMaterialId;
  name: string;
  symbol: string;
  swatch: string;
}

export const DEFAULT_VASE_ID = 'classic';
export const DEFAULT_VASE_MATERIAL_ID: VaseMaterialId = 'stoneware';

export const VASE_OPTIONS: readonly VaseOption[] = [
  {id: DEFAULT_VASE_ID, name: 'Klassisch', symbol: 'local_drink'},
  {id: 'tulip', name: 'Tulpe', symbol: 'wine_bar'},
  {id: 'cylinder', name: 'Zylinder', symbol: 'view_agenda'},
  {id: 'bowl', name: 'Schale', symbol: 'emoji_food_beverage'},
  {id: 'bud', name: 'Soliflore', symbol: 'science'},
];

export const VASE_MATERIAL_OPTIONS: readonly VaseMaterialOption[] = [
  {id: 'clay', name: 'Ton', symbol: 'texture', swatch: '#b96f4d'},
  {id: DEFAULT_VASE_MATERIAL_ID, name: 'Steinzeug', symbol: 'auto_awesome', swatch: '#c9d2c9'},
  {id: 'concrete', name: 'Beton', symbol: 'grain', swatch: '#96958f'},
  {id: 'glass', name: 'Glas', symbol: 'opacity', swatch: '#d8eef2'},
];

export function isVaseId(value: unknown): value is string {
  return typeof value === 'string' && VASE_OPTIONS.some((option) => option.id === value);
}

export function isVaseMaterialId(value: unknown): value is VaseMaterialId {
  return typeof value === 'string'
    && VASE_MATERIAL_OPTIONS.some((option) => option.id === value);
}

export function normalizedVaseMaterialId(value: unknown): VaseMaterialId {
  return isVaseMaterialId(value) ? value : DEFAULT_VASE_MATERIAL_ID;
}

const VASE_INSERTION_RADII: Record<string, number> = {
  [DEFAULT_VASE_ID]: 30,
  tulip: 32,
  cylinder: 25,
  bowl: 31,
  bud: 14,
};

export function vaseInsertionRadius(vaseId: string | undefined): number {
  return VASE_INSERTION_RADII[vaseId ?? DEFAULT_VASE_ID] ?? VASE_INSERTION_RADII[DEFAULT_VASE_ID]!;
}
