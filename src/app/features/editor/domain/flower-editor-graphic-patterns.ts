import {
  GraphicPatternLayer,
  GraphicPatternType,
} from '../../../core/models/flower.models';
import {FLOWER_CREATION_DEFAULTS} from '../../../core/models/flower-creation-defaults';

export const GRAPHIC_PATTERN_OPTIONS: ReadonlyArray<{
  type: GraphicPatternType;
  label: string;
}> = [
  {type: 'gradient', label: 'Verlauf'},
  {type: 'veins', label: 'Adern'},
  {type: 'spots', label: 'Flecken'},
  {type: 'edge', label: 'Rand'},
];

export function graphicPatternLabel(type: GraphicPatternType): string {
  return GRAPHIC_PATTERN_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

export function createDefaultGraphicPattern(
  id: string,
  type: GraphicPatternType,
): GraphicPatternLayer {
  return {id, type, ...structuredClone(FLOWER_CREATION_DEFAULTS.patterns[type])};
}
