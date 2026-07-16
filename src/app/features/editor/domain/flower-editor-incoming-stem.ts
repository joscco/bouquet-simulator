import {
  FlowerDefinition,
  FlowerNodeIncomingConnection,
  NumberRange,
} from '../../../core/models/flower.models';

export type IncomingStemProperty = 'color' | 'startWidth' | 'endWidth' | 'bend' | 'curve';

export function incomingStemColor(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): string {
  return incoming.stem?.color ?? definition.stem.color;
}

export function incomingStemStartWidth(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): number {
  return incoming.stem?.startWidth ?? incoming.stem?.width ?? definition.stem.width;
}

export function incomingStemEndWidth(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): number {
  return incoming.stem?.endWidth
    ?? (incoming.stem?.startWidth !== undefined
      ? incoming.stem.startWidth
      : (incoming.stem?.width ?? definition.stem.width) * definition.stem.taper);
}

export function incomingStemBend(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): number {
  return incoming.stem?.bend ?? definition.stem.bend ?? 0;
}

export function incomingStemCurve(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
): number {
  return incoming.stem?.curve ?? definition.stem.curve ?? 14;
}

export function incomingStemBendRotation(incoming: FlowerNodeIncomingConnection): NumberRange {
  return incoming.stem?.bendRotation ?? {min: 0, max: 0};
}

export function withIncomingStemProperty(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
  key: IncomingStemProperty,
  value: string | number,
): FlowerNodeIncomingConnection {
  return {
    ...incoming,
    stem: {
      color: key === 'color' ? String(value) : incomingStemColor(definition, incoming),
      width: incoming.stem?.width ?? definition.stem.width,
      startWidth: key === 'startWidth' ? Number(value) : incomingStemStartWidth(definition, incoming),
      endWidth: key === 'endWidth' ? Number(value) : incomingStemEndWidth(definition, incoming),
      bend: key === 'bend' ? Number(value) : incomingStemBend(definition, incoming),
      curve: key === 'curve' ? Number(value) : incomingStemCurve(definition, incoming),
      bendRotation: incomingStemBendRotation(incoming),
    },
  };
}

export function withIncomingStemBendRotation(
  definition: FlowerDefinition,
  incoming: FlowerNodeIncomingConnection,
  bendRotation: NumberRange,
): FlowerNodeIncomingConnection {
  return {
    ...incoming,
    stem: {
      color: incomingStemColor(definition, incoming),
      width: incoming.stem?.width ?? definition.stem.width,
      startWidth: incomingStemStartWidth(definition, incoming),
      endWidth: incomingStemEndWidth(definition, incoming),
      bend: incomingStemBend(definition, incoming),
      curve: incomingStemCurve(definition, incoming),
      bendRotation,
    },
  };
}
