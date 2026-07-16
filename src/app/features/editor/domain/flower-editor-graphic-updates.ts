import {
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  GraphicPatternLayer,
  GraphicPatternType,
  NumberRange,
} from '../../../core/models/flower.models';
import {clamp} from '../../../core/utils/numbers';
import {createDefaultGraphicPattern} from './flower-editor-graphic-patterns';

export interface RemovedGraphicPattern {
  pattern: GraphicPatternLayer;
  index: number;
}

const DEFAULT_GRAPHIC: FlowerNodeGraphic = {
  primitive: 'leaf-pointed',
  color: '#5b8d53',
  width: 50,
  height: 50,
  depth: 8,
  scale: 1,
  offset: {x: 0, y: 0, z: 0},
  orientation: 'toward-parent',
  rotationBase: 0,
  rotationSpread: 0,
  rotation: {min: 0, max: 0},
  start: {x: 0.5, y: 0.9},
  end: {x: 0.5, y: 0.1},
};

export function withGraphicEnabled(node: FlowerNodeDefinition, enabled: boolean): FlowerNodeDefinition {
  return {
    ...node,
    graphic: enabled ? node.graphic ?? structuredClone(DEFAULT_GRAPHIC) : null,
  };
}

export function withGraphicPatch(
  node: FlowerNodeDefinition,
  patch: Partial<FlowerNodeGraphic>,
): FlowerNodeDefinition {
  return node.graphic ? {...node, graphic: {...node.graphic, ...patch}} : node;
}

export function withGraphicOffset(
  node: FlowerNodeDefinition,
  key: 'x' | 'y' | 'z',
  value: number,
): FlowerNodeDefinition {
  return node.graphic ? {
    ...node,
    graphic: {
      ...node.graphic,
      offset: {...(node.graphic.offset ?? {x: 0, y: 0, z: 0}), [key]: Number(value)},
    },
  } : node;
}

export function withAddedGraphicPattern(
  node: FlowerNodeDefinition,
  type: GraphicPatternType,
): FlowerNodeDefinition {
  if (!node.graphic) return node;
  const existingIds = new Set((node.graphic.patterns ?? []).map((pattern) => pattern.id));
  let suffix = 1;
  let id: string = type;
  while (existingIds.has(id)) id = `${type}-${++suffix}`;
  return withGraphicPatch(node, {
    patterns: [...(node.graphic.patterns ?? []), createDefaultGraphicPattern(id, type)],
  });
}

export function withGraphicPatternPatch(
  node: FlowerNodeDefinition,
  id: string,
  patch: Partial<GraphicPatternLayer>,
): FlowerNodeDefinition {
  return node.graphic ? withGraphicPatch(node, {
    patterns: (node.graphic.patterns ?? []).map((pattern) =>
      pattern.id === id ? {...pattern, ...patch} : pattern),
  }) : node;
}

export function removedGraphicPattern(
  node: FlowerNodeDefinition | null,
  id: string,
): RemovedGraphicPattern | null {
  const patterns = node?.graphic?.patterns ?? [];
  const index = patterns.findIndex((pattern) => pattern.id === id);
  return index < 0 ? null : {pattern: structuredClone(patterns[index]!), index};
}

export function withoutGraphicPattern(node: FlowerNodeDefinition, id: string): FlowerNodeDefinition {
  return node.graphic ? withGraphicPatch(node, {
    patterns: (node.graphic.patterns ?? []).filter((pattern) => pattern.id !== id),
  }) : node;
}

export function withMovedGraphicPattern(
  node: FlowerNodeDefinition,
  id: string,
  direction: -1 | 1,
): FlowerNodeDefinition {
  if (!node.graphic) return node;
  const patterns = [...(node.graphic.patterns ?? [])];
  const index = patterns.findIndex((pattern) => pattern.id === id);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= patterns.length) return node;
  const [pattern] = patterns.splice(index, 1);
  patterns.splice(targetIndex, 0, pattern!);
  return withGraphicPatch(node, {patterns});
}

export function withRestoredGraphicPattern(
  node: FlowerNodeDefinition,
  removed: RemovedGraphicPattern,
): FlowerNodeDefinition {
  if (!node.graphic) return node;
  const patterns = [...(node.graphic.patterns ?? [])];
  patterns.splice(Math.min(removed.index, patterns.length), 0, removed.pattern);
  return withGraphicPatch(node, {patterns});
}

export function hasGraphicBendProfile(
  graphic: FlowerNodeGraphic,
  direction: 'main' | 'cross',
): boolean {
  return direction === 'main'
    ? graphic.bendMainProfile !== undefined
    : graphic.bendCrossProfile !== undefined;
}

export function withGraphicBendProfile(
  node: FlowerNodeDefinition,
  enabled: boolean,
  direction: 'main' | 'cross',
): FlowerNodeDefinition {
  if (!node.graphic) return node;
  const bendKey = direction === 'main' ? 'bendMain' : 'bendCross';
  const profileKey = direction === 'main' ? 'bendMainProfile' : 'bendCrossProfile';
  if (enabled) {
    const bend = node.graphic[bendKey] ?? 0;
    return withGraphicPatch(node, {[profileKey]: {base: bend, tip: bend}});
  }
  const profile = node.graphic[profileKey];
  if (!profile) return node;
  const graphic = structuredClone(node.graphic);
  delete graphic[profileKey];
  return {...node, graphic: {...graphic, [bendKey]: (profile.base + profile.tip) / 2}};
}

export function withGraphicBendProfileValue(
  node: FlowerNodeDefinition,
  direction: 'main' | 'cross',
  key: 'base' | 'tip',
  value: number,
): FlowerNodeDefinition {
  if (!node.graphic) return node;
  const profileKey = direction === 'main' ? 'bendMainProfile' : 'bendCrossProfile';
  const profile = node.graphic[profileKey];
  return profile
    ? withGraphicPatch(node, {[profileKey]: {...profile, [key]: Number(value)}})
    : node;
}

export function withGraphicRotationRange(
  node: FlowerNodeDefinition,
  rotation: NumberRange,
): FlowerNodeDefinition {
  const minimum = Math.min(rotation.min, rotation.max);
  const maximum = Math.max(rotation.min, rotation.max);
  const base = clamp((minimum + maximum) / 2, -180, 180);
  const spread = clamp((maximum - minimum) / 2, 0, 180);
  return withGraphicPatch(node, {
    rotationBase: base,
    rotationSpread: spread,
    rotation: {min: base - spread, max: base + spread},
  });
}
