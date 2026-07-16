import {
  GraphicPatternLayer,
  GraphicPatternType,
} from '../../../core/models/flower.models';

export const GRAPHIC_PATTERN_OPTIONS: ReadonlyArray<{
  type: GraphicPatternType;
  label: string;
  icon: string;
}> = [
  {type: 'gradient', label: 'Verlauf', icon: 'gradient'},
  {type: 'veins', label: 'Adern', icon: 'account_tree'},
  {type: 'spots', label: 'Flecken', icon: 'blur_on'},
  {type: 'edge', label: 'Rand', icon: 'border_outer'},
];

export function graphicPatternLabel(type: GraphicPatternType): string {
  return GRAPHIC_PATTERN_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

export function createDefaultGraphicPattern(
  id: string,
  type: GraphicPatternType,
): GraphicPatternLayer {
  if (type === 'gradient') {
    return {id, type, color: '#fef3c7', opacity: 0.55, direction: 'base-to-tip'};
  }
  if (type === 'veins') {
    return {id, type, color: '#315c3a', opacity: 0.72, density: 7, size: 0.012, angle: 22};
  }
  if (type === 'spots') {
    return {id, type, color: '#7c3aed', opacity: 0.62, density: 18, size: 0.035, seed: 0.42};
  }
  return {id, type, color: '#14532d', opacity: 0.58, width: 0.055};
}
