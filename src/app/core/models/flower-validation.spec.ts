import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {FlowerDefinition} from './flower.models';
import {validateFlowerDefinition} from './flower-validation';

describe('flower definition validation', () => {
  it('accepts all built-in flowers', () => {
    for (const definition of DEFAULT_FLOWERS) {
      expect(validateFlowerDefinition(definition)).toEqual([]);
    }
  });

  it('reports cycles in reachable connections', () => {
    const definition = validationDefinition();
    definition.nodes.find((node) => node.id === 'leaf')!.connections.push({
      childId: 'branch',
      repeat: {min: 1, max: 1},
      length: {min: 1, max: 1},
      angle: {min: 0, max: 0},
    });

    expect(validateFlowerDefinition(definition).some((issue) =>
      issue.severity === 'error' && issue.message.includes('Zyklische'))).toBe(true);
  });

  it('warns about disconnected nodes', () => {
    const definition = validationDefinition();
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

  it('allows an empty transient editor forest without a fake missing-root error', () => {
    const definition = validationDefinition();
    definition.nodes = [];
    definition.rootNodeId = '';

    expect(validateFlowerDefinition(definition, {allowForest: true})).toEqual([]);
    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'error',
      message: 'Der Basisknoten „“ fehlt.',
    });
  });

  it('accepts a loop as the dynamically derived root', () => {
    const definition = validationDefinition();
    definition.rootNodeId = 'loop';
    definition.nodes = [
      {
        id: 'loop',
        name: 'Loop',
        draggable: false,
        graphic: null,
        connections: [],
        loop: {
          repeat: {min: 2, max: 2},
          startNodeId: 'member',
          endNodeId: 'member',
          memberNodeIds: ['member'],
          continuationOutputNodeIds: ['member'],
        },
      },
      {
        id: 'member',
        name: 'Member',
        draggable: false,
        graphic: null,
        connections: [],
      },
    ];

    expect(validateFlowerDefinition(definition)).toEqual([]);
  });

  it('rejects non-PNG node graphics', () => {
    const definition = validationDefinition();
    const graphic = definition.nodes.find((node) => node.id === 'leaf')!.graphic!;
    graphic.primitive = 'png';
    graphic.png = 'data:image/svg+xml,<svg></svg>';

    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'error',
      message: '„Leaf“ verwendet keine PNG-Grafik.',
    });
  });

  it('accepts serializable parametric pattern layers', () => {
    const definition = validationDefinition();
    definition.nodes.find((node) => node.id === 'leaf')!.graphic!.patterns = [
      {id: 'base', type: 'gradient', color: '#fef3c7', opacity: 0.45, direction: 'base-to-tip'},
      {id: 'veins', type: 'veins', color: '#315c3a', opacity: 0.7, density: 8, size: 0.012},
      {id: 'spots', type: 'spots', color: '#7c3aed', opacity: 0.6, density: 24, size: 0.03, seed: 0.8},
      {id: 'edge', type: 'edge', color: '#14532d', opacity: 0.5, width: 0.04},
    ];

    expect(validateFlowerDefinition(definition)).toEqual([]);
  });

  it('validates a main bend profile independently at base and tip', () => {
    const definition = validationDefinition();
    const graphic = definition.nodes.find((node) => node.id === 'leaf')!.graphic!;
    graphic.bendMainProfile = {base: -70, tip: 85};

    expect(validateFlowerDefinition(definition)).toEqual([]);

    graphic.bendMainProfile.tip = 720;
    graphic.bendCrossProfile = {base: -350, tip: 420};
    expect(validateFlowerDefinition(definition)).toEqual([]);

    graphic.bendMainProfile.tip = 801;
    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'error',
      message: '„Leaf“ hat eine ungültige Wölbung.',
    });
  });

  it('rejects invalid and duplicate pattern layers', () => {
    const definition = validationDefinition();
    definition.nodes.find((node) => node.id === 'leaf')!.graphic!.patterns = [
      {id: 'same', type: 'spots', color: '#ffffff', opacity: 1, density: 200},
      {id: 'same', type: 'edge', color: '#ffffff', opacity: 1, width: 0.05},
    ];

    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'error',
      message: '„Leaf“ enthält ungültige Musterebenen.',
    });
  });

  it('rejects parametric patterns on PNG graphics that cannot render them', () => {
    const definition = validationDefinition();
    const graphic = definition.nodes.find((node) => node.id === 'leaf')!.graphic!;
    graphic.primitive = 'png';
    graphic.png = 'leaf.png';
    graphic.patterns = [
      {id: 'edge', type: 'edge', color: '#ffffff', opacity: 1, width: 0.05},
    ];

    expect(validateFlowerDefinition(definition)).toContainEqual({
      severity: 'error',
      message: '„Leaf“ kann keine parametrischen Muster auf eine PNG-Grafik legen.',
    });
  });
});

function validationDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'validation',
    name: 'Validation',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      {
        id: 'root',
        name: 'Root',
        draggable: false,
        graphic: null,
        connections: [connection('branch')],
      },
      {
        id: 'branch',
        name: 'Branch',
        draggable: false,
        graphic: null,
        connections: [connection('leaf')],
      },
      {
        id: 'leaf',
        name: 'Leaf',
        draggable: false,
        graphic: {
          primitive: 'leaf-pointed',
          color: '#477b49',
          width: 20,
          height: 18,
          rotation: {min: 0, max: 0},
          start: {x: 0, y: 0.5},
          end: {x: 1, y: 0.5},
        },
        connections: [],
      },
    ],
  };
}

function connection(childId: string) {
  return {
    childId,
    repeat: {min: 1, max: 1},
    length: {min: 10, max: 10},
    angle: {min: 0, max: 0},
  };
}
