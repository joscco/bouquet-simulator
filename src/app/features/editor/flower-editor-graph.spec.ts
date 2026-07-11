import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../../core/data/default-flowers';
import {FlowerDefinition} from '../../core/models/flower.models';
import {createCompactGraphPositions, createGraphLayout} from './flower-editor-graph';

describe('flower editor graph layout', () => {
  it('keeps the outer linear sequence on one vertical axis', () => {
    const layout = createGraphLayout(DEFAULT_FLOWERS[0], {});
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

    expect(nodes.get('base')?.x).toBe(500);
    expect(nodes.get('growth-loop')?.x).toBe(500);
    expect(nodes.get('pfingstrosenbluete')?.x).toBe(500);
  });

  it('places the complete internal path inside its loop bounds', () => {
    const layout = createGraphLayout(DEFAULT_FLOWERS[0], {});
    const loop = layout.nodes.find((node) => node.id === 'growth-loop')!;

    for (const memberId of loop.memberIds) {
      const member = layout.nodes.find((node) => node.id === memberId)!;
      expect(member.x - member.width / 2).toBeGreaterThan(loop.x - loop.width / 2);
      expect(member.x + member.width / 2).toBeLessThan(loop.x + loop.width / 2);
      expect(member.y - member.height / 2).toBeGreaterThan(loop.y - loop.height / 2);
      expect(member.y + member.height / 2).toBeLessThan(loop.y + loop.height / 2);
    }
  });

  it('exposes one loop input and the selected internal outputs as graph ports', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'loop-ports',
      name: 'Loop ports',
      rootNodeId: 'root',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {id: 'root', name: 'Root', draggable: false, graphic: null, connections: [connection('loop')]},
        {
          id: 'loop',
          name: 'Loop',
          draggable: false,
          graphic: null,
          connections: [connection('outside')],
          loop: {
            repeat: {min: 2, max: 3},
            startNodeId: 'inside',
            endNodeId: 'left',
            memberNodeIds: ['inside', 'left', 'right'],
            continuationOutputNodeIds: ['left', 'right'],
          },
        },
        {id: 'inside', name: 'Inside', draggable: false, graphic: null, connections: [connection('left'), connection('right')]},
        {id: 'left', name: 'Left output', draggable: false, graphic: null, connections: []},
        {id: 'right', name: 'Right output', draggable: false, graphic: null, connections: []},
        {id: 'outside', name: 'Outside', draggable: false, graphic: null, connections: []},
      ],
    };
    const layout = createGraphLayout(definition, {});
    const loop = layout.nodes.find((node) => node.id === 'loop')!;
    const inputEdge = layout.edges.find((edge) => edge.sourceId === 'root' && edge.targetId === 'loop')!;

    expect(loop.outputPorts).toHaveLength(2);
    expect(loop.outputPortNames).toEqual(['Left output', 'Right output']);
    expect(inputEdge.path).toContain(`${loop.x} ${loop.y + loop.height / 2}`);
  });

  it('places multiple component output ports next to each other and starts edges from them', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'multi-output',
      name: 'Multi output',
      rootNodeId: 'component',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {
          id: 'component',
          name: 'Component',
          draggable: false,
          graphic: null,
          connections: [connection('left'), connection('right')],
          component: {
            schemaVersion: 1,
            id: 'component-template',
            name: 'Component template',
            rootNodeId: 'inner-root',
            outputNodeIds: ['out-left', 'out-right'],
            nodes: [
              {id: 'inner-root', name: 'Root', draggable: false, graphic: null, connections: [connection('out-left'), connection('out-right')]},
              {id: 'out-left', name: 'Out left', draggable: false, graphic: null, connections: []},
              {id: 'out-right', name: 'Out right', draggable: false, graphic: null, connections: []},
            ],
          },
        },
        {id: 'left', name: 'Left', draggable: false, graphic: null, connections: []},
        {id: 'right', name: 'Right', draggable: false, graphic: null, connections: []},
      ],
    };

    const layout = createGraphLayout(definition, {
      component: {x: 500, y: 700},
      left: {x: 400, y: 500},
      right: {x: 600, y: 500},
    });
    const component = layout.nodes.find((node) => node.id === 'component')!;
    const edgeStarts = layout.edges.map((edge) => edge.path.match(/^M ([\d.-]+) ([\d.-]+)/)?.slice(1, 3));

    expect(component.outputPorts).toHaveLength(2);
    expect(component.outputPorts[0]!.x).toBeLessThan(component.outputPorts[1]!.x);
    expect(edgeStarts).toContainEqual([String(component.outputPorts[0]!.x), String(component.outputPorts[0]!.y)]);
    expect(edgeStarts).toContainEqual([String(component.outputPorts[1]!.x), String(component.outputPorts[1]!.y)]);
  });

  it('arches middle component output ports upward', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'three-output',
      name: 'Three output',
      rootNodeId: 'component',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {
          id: 'component',
          name: 'Component',
          draggable: false,
          graphic: null,
          connections: [connection('left'), connection('middle'), connection('right')],
          component: {
            schemaVersion: 1,
            id: 'component-template',
            name: 'Component template',
            rootNodeId: 'inner-root',
            outputNodeIds: ['out-left', 'out-middle', 'out-right'],
            nodes: [
              {id: 'inner-root', name: 'Root', draggable: false, graphic: null, connections: []},
              {id: 'out-left', name: 'Out left', draggable: false, graphic: null, connections: []},
              {id: 'out-middle', name: 'Out middle', draggable: false, graphic: null, connections: []},
              {id: 'out-right', name: 'Out right', draggable: false, graphic: null, connections: []},
            ],
          },
        },
        {id: 'left', name: 'Left', draggable: false, graphic: null, connections: []},
        {id: 'middle', name: 'Middle', draggable: false, graphic: null, connections: []},
        {id: 'right', name: 'Right', draggable: false, graphic: null, connections: []},
      ],
    };
    const component = createGraphLayout(definition, {component: {x: 500, y: 700}})
      .nodes.find((node) => node.id === 'component')!;

    expect(component.outputPorts).toHaveLength(3);
    expect(component.outputPorts[1]!.y).toBeLessThan(component.outputPorts[0]!.y);
    expect(component.outputPorts[1]!.y).toBeLessThan(component.outputPorts[2]!.y);
  });

  it('keeps auto layout compact for long linear trees', () => {
    const nodes = Array.from({length: 9}, (_, index) => ({
      id: `node-${index}`,
      name: `Node ${index}`,
      draggable: false,
      graphic: null,
      connections: index < 8 ? [connection(`node-${index + 1}`)] : [],
    }));
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'long-tree',
      name: 'Long tree',
      rootNodeId: 'node-0',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes,
    };
    const positions = createCompactGraphPositions(definition);
    const ys = Object.values(positions).map((point) => point.y);
    const sortedYs = [...ys].sort((left, right) => left - right);

    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(900);
    expect(Math.max(...ys)).toBeLessThanOrEqual(941);
    for (let index = 1; index < sortedYs.length; index++) {
      expect(sortedYs[index]! - sortedYs[index - 1]!).toBeGreaterThan(82);
    }
  });

  it('keeps sibling nodes separated in auto layout', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'wide-tree',
      name: 'Wide tree',
      rootNodeId: 'root',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {id: 'root', name: 'Root', draggable: false, graphic: null, connections: [connection('left'), connection('middle'), connection('right')]},
        {id: 'left', name: 'Left', draggable: false, graphic: null, connections: []},
        {id: 'middle', name: 'Middle', draggable: false, graphic: null, connections: []},
        {id: 'right', name: 'Right', draggable: false, graphic: null, connections: []},
      ],
    };
    const positions = createCompactGraphPositions(definition);

    expect(positions.middle.x - positions.left.x).toBeGreaterThan(172);
    expect(positions.right.x - positions.middle.x).toBeGreaterThan(172);
  });
});

function connection(childId: string) {
  return {
    childId,
    repeat: {min: 1, max: 1},
    length: {min: 20, max: 30},
    angle: {min: 0, max: 20},
  };
}
