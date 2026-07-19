import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  DEFAULT_INCOMING_CONNECTION,
  effectiveConnection,
  incomingConnectionReference,
  migrateIncomingConnections,
  normalizeIncomingConnection,
  normalizeConnectionReferences,
  resolvedStemWidths,
} from './flower-connections';
import {FlowerNodeMainDirection} from './flower.models';
import {validateFlowerDefinition} from './flower-validation';

describe('node-owned incoming connections', () => {
  it('uses an even full revolution as the default spread', () => {
    expect(DEFAULT_INCOMING_CONNECTION.spread?.randomness).toBe(0);
    expect(DEFAULT_INCOMING_CONNECTION.spread?.revolution).toEqual({min: -180, max: 180});
    expect(DEFAULT_INCOMING_CONNECTION.stem).toMatchObject({
      color: expect.any(String),
      width: expect.any(Number),
      startWidth: expect.any(Number),
      endWidth: expect.any(Number),
      bend: expect.any(Number),
      curve: expect.any(Number),
      bendRotation: {min: expect.any(Number), max: expect.any(Number)},
    });
  });

  it('migrates legacy edge settings onto their target node', () => {
    const legacy = structuredClone(daisyComponentDefinition());
    const source = legacy.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === 'petal'))!;
    const petalNode = legacy.nodes.find((node) => node.id === 'petal')!;
    const legacyConnection = {
      childId: 'petal',
      ...structuredClone(petalNode.incoming!),
    };
    source.connections = source.connections.map((connection) =>
      connection.childId === 'petal' ? legacyConnection : connection);
    delete legacy.nodes.find((node) => node.id === 'petal')!.incoming;
    const migrated = migrateIncomingConnections(legacy);
    const petal = migrated.nodes.find((node) => node.id === 'petal')!;

    expect(petal.incoming?.repeat).toEqual(legacyConnection.repeat);
    expect(petal.incoming?.spread?.deviation).toEqual(
      legacyConnection.spread?.deviation ?? legacyConnection.angle,
    );
    expect(petal.incoming?.placement).toBeUndefined();
    expect(incomingConnectionReference(migrated, petal.id)?.sourceId).toBe(source.id);
  });

  it('uses the settings stored on the target node', () => {
    const definition = migrateIncomingConnections(daisyComponentDefinition());
    const target = definition.nodes.find((node) => node.id === 'petal')!;
    target.incoming = {...target.incoming!, length: {min: 33, max: 44}};
    const source = definition.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === target.id))!;
    const legacy = source.connections.find((connection) => connection.childId === target.id)!;

    expect(effectiveConnection(definition, legacy).length).toEqual({min: 33, max: 44});
  });

  it('materializes inherited stem values on every incoming connection', () => {
    const legacy = structuredClone(daisyComponentDefinition());
    legacy.stem = {
      ...legacy.stem,
      color: '#123456',
      width: 10,
      taper: 0.5,
      bend: 12,
      curve: 34,
    };
    const petal = legacy.nodes.find((node) => node.id === 'petal')!;
    petal.incoming = {...petal.incoming!, stem: undefined};

    const migrated = migrateIncomingConnections(legacy);

    expect(migrated.nodes.find((node) => node.id === 'petal')?.incoming?.stem).toEqual({
      color: '#123456',
      width: 10,
      startWidth: 10,
      endWidth: 5,
      bend: 12,
      curve: 34,
      bendRotation: {min: 0, max: 0},
    });
  });

  it('resolves a bare child reference through the target incoming settings', () => {
    const definition = migrateIncomingConnections(daisyComponentDefinition());
    const target = definition.nodes.find((node) => node.id === 'petal')!;
    target.incoming = {...target.incoming!, length: {min: 31, max: 32}};

    expect(effectiveConnection(definition, {childId: target.id}).length).toEqual({min: 31, max: 32});
  });

  it('normalizes copied edge settings into real child references', () => {
    const normalized = normalizeConnectionReferences(daisyComponentDefinition());
    const source = normalized.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === 'petal'))!;
    const connection = source.connections.find((connection) => connection.childId === 'petal')!;

    expect(connection).toEqual({childId: 'petal'});
    expect(normalized.nodes.find((node) => node.id === 'petal')?.incoming).toBeDefined();
  });

  it.each([
    ['directional', {min: 12, max: 34}, 'spread'],
    ['ring', {min: 90, max: 90}, 'spread'],
    ['disc', {min: 90, max: 90}, 'main'],
    ['sphere', {min: 0, max: 180}, 'spread'],
  ] as const)('migrates the legacy %s mode into a general spread', (
    mode,
    deviation,
    orientation,
  ) => {
    const normalized = normalizeIncomingConnection({
      repeat: {min: 8, max: 8},
      length: {min: 0, max: 30},
      angle: {min: 12, max: 34},
      azimuth: {min: 10, max: 280},
      roll: {min: -20, max: 20},
      randomness: 0.4,
      placement: {mode, orientation: orientation === 'main' ? 'parent' : 'radial'},
    });

    expect(normalized.placement).toBeUndefined();
    expect(normalized.spread).toEqual({
      deviation,
      revolution: {min: 10, max: 280},
      roll: {min: -20, max: 20},
      randomness: 0.4,
      orientation,
    });
  });

  it('migrates the previous polar main direction into equivalent X/Y/Z rotations', () => {
    const normalized = normalizeIncomingConnection({
      ...structuredClone(DEFAULT_INCOMING_CONNECTION),
      direction: {
        inclination: 90,
        azimuth: 0,
        roll: 25,
      } as FlowerNodeMainDirection,
    });

    expect(normalized.direction?.x).toBeCloseTo(0);
    expect(normalized.direction?.y).toBe(25);
    expect(normalized.direction?.z).toBeCloseTo(-90);
    expect(normalized.direction?.inclination).toBeUndefined();
  });

  it('rejects a second incoming link to the same node', () => {
    const definition = structuredClone(daisyComponentDefinition());
    const target = definition.nodes.find((node) => node.id === 'petal')!;
    const source = definition.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === target.id))!;
    definition.nodes[0]!.connections.push(structuredClone(
      source.connections.find((connection) => connection.childId === target.id)!,
    ));

    expect(validateFlowerDefinition(definition).some((issue) =>
      issue.message.includes('mehr als eine Eingangsverbindung'))).toBe(true);
  });

  it('preserves legacy depth tapering when local widths are missing', () => {
    const definition = structuredClone(daisyComponentDefinition());
    definition.stem.width = 10;
    definition.stem.taper = 0.5;
    const connection = effectiveConnection(definition, definition.nodes[0]!.connections[0]!);
    connection.stem = {...(connection.stem ?? {color: '#000000', width: 10}), width: 10};

    expect(resolvedStemWidths(definition, connection, 1, 2)).toEqual({
      startWidth: 5,
      endWidth: 2.5,
    });
  });

  it('uses explicit segment widths independently of graph depth', () => {
    const definition = structuredClone(daisyComponentDefinition());
    const connection = effectiveConnection(definition, definition.nodes[0]!.connections[0]!);
    connection.stem = {
      ...(connection.stem ?? {color: '#000000', width: 10}),
      startWidth: 7,
      endWidth: 3,
    };

    expect(resolvedStemWidths(definition, connection, 8, 9)).toEqual({
      startWidth: 7,
      endWidth: 3,
    });
  });
});

function daisyComponentDefinition() {
  return DEFAULT_FLOWERS.find((definition) =>
    definition.id === 'margeritenbluete-2' && definition.rootNodeId === 'flower-head')!;
}
