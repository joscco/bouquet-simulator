import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  effectiveConnection,
  incomingConnectionReference,
  migrateIncomingConnections,
  normalizeConnectionReferences,
  resolvedStemWidths,
} from './flower-connections';
import {validateFlowerDefinition} from './flower-validation';

describe('node-owned incoming connections', () => {
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
    expect(petal.incoming?.angle).toEqual(legacyConnection.angle);
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
