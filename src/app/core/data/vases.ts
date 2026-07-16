export type VaseId =
  | 'classic'
  | 'tulip'
  | 'cylinder'
  | 'bowl'
  | 'bud'
  | 'bottle'
  | 'amphora'
  | 'ribbed'
  | 'faceted';

export interface VaseOption {
  id: VaseId;
  name: string;
}

export type VaseMaterialId = 'clay' | 'stoneware' | 'concrete' | 'glass';

export interface VaseMaterialOption {
  id: VaseMaterialId;
  name: string;
  symbol: string;
  swatch: string;
}

export const DEFAULT_VASE_ID: VaseId = 'classic';
export const DEFAULT_VASE_MATERIAL_ID: VaseMaterialId = 'stoneware';

export const VASE_OPTIONS: readonly VaseOption[] = [
  {id: DEFAULT_VASE_ID, name: 'Klassisch'},
  {id: 'tulip', name: 'Tulpe'},
  {id: 'cylinder', name: 'Zylinder'},
  {id: 'bowl', name: 'Schale'},
  {id: 'bud', name: 'Soliflore'},
  {id: 'bottle', name: 'Flasche'},
  {id: 'amphora', name: 'Amphore'},
  {id: 'ribbed', name: 'Gerippt'},
  {id: 'faceted', name: 'Facettiert'},
];

export const VASE_MATERIAL_OPTIONS: readonly VaseMaterialOption[] = [
  {id: 'clay', name: 'Ton', symbol: 'texture', swatch: '#b96f4d'},
  {id: DEFAULT_VASE_MATERIAL_ID, name: 'Steinzeug', symbol: 'auto_awesome', swatch: '#c9d2c9'},
  {id: 'concrete', name: 'Beton', symbol: 'grain', swatch: '#96958f'},
  {id: 'glass', name: 'Glas', symbol: 'opacity', swatch: '#d8eef2'},
];

export function isVaseId(value: unknown): value is VaseId {
  return typeof value === 'string' && VASE_OPTIONS.some((option) => option.id === value);
}

export function isVaseMaterialId(value: unknown): value is VaseMaterialId {
  return typeof value === 'string'
    && VASE_MATERIAL_OPTIONS.some((option) => option.id === value);
}

export function normalizedVaseMaterialId(value: unknown): VaseMaterialId {
  return isVaseMaterialId(value) ? value : DEFAULT_VASE_MATERIAL_ID;
}

const VASE_INSERTION_RADII: Record<VaseId, number> = {
  [DEFAULT_VASE_ID]: 32,
  tulip: 48,
  cylinder: 26,
  bowl: 34,
  bud: 7,
  bottle: 5,
  amphora: 13,
  ribbed: 26,
  faceted: 23,
};

export function vaseInsertionRadius(vaseId: string | undefined): number {
  return isVaseId(vaseId) ? VASE_INSERTION_RADII[vaseId] : VASE_INSERTION_RADII[DEFAULT_VASE_ID];
}
