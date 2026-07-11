export interface VaseOption {
  id: string;
  name: string;
  symbol: string;
}

export const DEFAULT_VASE_ID = 'classic';

export const VASE_OPTIONS: readonly VaseOption[] = [
  {id: DEFAULT_VASE_ID, name: 'Klassisch', symbol: 'local_drink'},
  {id: 'tulip', name: 'Tulpe', symbol: 'wine_bar'},
  {id: 'cylinder', name: 'Zylinder', symbol: 'view_agenda'},
  {id: 'bowl', name: 'Schale', symbol: 'emoji_food_beverage'},
  {id: 'bud', name: 'Soliflore', symbol: 'science'},
];

export function isVaseId(value: unknown): value is string {
  return typeof value === 'string' && VASE_OPTIONS.some((option) => option.id === value);
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
