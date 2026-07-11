import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  effectiveConnection,
  incomingConnectionReference,
  migrateIncomingConnections,
} from './flower-connections';
import {validateFlowerDefinition} from './flower-validation';

describe('node-owned incoming connections', () => {
  it('migrates legacy edge settings onto their target node', () => {
    const legacy = structuredClone(DEFAULT_FLOWERS[1]);
    const source = legacy.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === 'petal'))!;
    const legacyConnection = source.connections.find((connection) =>
      connection.childId === 'petal')!;
    delete legacy.nodes.find((node) => node.id === 'petal')!.incoming;
    const migrated = migrateIncomingConnections(legacy);
    const petal = migrated.nodes.find((node) => node.id === 'petal')!;

    expect(petal.incoming?.repeat).toEqual(legacyConnection.repeat);
    expect(petal.incoming?.angle).toEqual(legacyConnection.angle);
    expect(incomingConnectionReference(migrated, petal.id)?.sourceId).toBe(source.id);
  });

  it('uses the settings stored on the target node', () => {
    const definition = migrateIncomingConnections(DEFAULT_FLOWERS[1]);
    const target = definition.nodes.find((node) => node.id === 'petal')!;
    target.incoming = {...target.incoming!, length: {min: 33, max: 44}};
    const source = definition.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === target.id))!;
    const legacy = source.connections.find((connection) => connection.childId === target.id)!;

    expect(effectiveConnection(definition, legacy).length).toEqual({min: 33, max: 44});
  });

  it('rejects a second incoming link to the same node', () => {
    const definition = structuredClone(DEFAULT_FLOWERS[1]);
    const target = definition.nodes.find((node) => node.id === 'petal')!;
    const source = definition.nodes.find((node) =>
      node.connections.some((connection) => connection.childId === target.id))!;
    definition.nodes[0]!.connections.push(structuredClone(
      source.connections.find((connection) => connection.childId === target.id)!,
    ));

    expect(validateFlowerDefinition(definition).some((issue) =>
      issue.message.includes('mehr als eine Eingangsverbindung'))).toBe(true);
  });
});
