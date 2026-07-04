import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {validateFlowerDefinition} from './flower-validation';

describe('flower definition validation', () => {
  it('accepts all built-in flowers', () => {
    for (const definition of DEFAULT_FLOWERS) {
      expect(validateFlowerDefinition(definition)).toEqual([]);
    }
  });

  it('reports cycles in reachable connections', () => {
    const definition = structuredClone(DEFAULT_FLOWERS[0]);
    definition.nodes.find((node) => node.id === 'petal')!.connections.push({
      childId: 'bloom',
      mode: 'branches',
      repeat: {min: 1, max: 1},
      length: {min: 1, max: 1},
      angle: {min: 0, max: 0},
    });

    expect(validateFlowerDefinition(definition).some((issue) =>
      issue.severity === 'error' && issue.message.includes('Zyklische'))).toBe(true);
  });

  it('warns about disconnected nodes', () => {
    const definition = structuredClone(DEFAULT_FLOWERS[0]);
    definition.nodes.push({
      id: 'unused',
      name: 'Ohne Verbindung',
      draggable: false,
      graphic: null,
      connections: [],
    });

    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'warning',
      message: '„Ohne Verbindung“ ist nicht mit dem Basisknoten verbunden und wird nicht erzeugt.',
    });
  });
});
