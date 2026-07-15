import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from '../../../core/models/flower.models';
import {createCompactGraphPositions, createGraphLayout} from './flower-editor-graph';

describe('flower editor graph layout', () => {
  it('keeps the outer linear sequence on one vertical axis', () => {
    const layout = createGraphLayout(memberLoopDefinition(), {});
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

    expect(nodes.get('root')?.x).toBe(500);
    expect(nodes.get('loop')?.x).toBe(500);
    expect(nodes.get('after')?.x).toBe(500);
  });

  it('places the complete internal path inside its loop bounds', () => {
    const layout = createGraphLayout(memberLoopDefinition(), {});
    const loop = layout.nodes.find((node) => node.id === 'loop')!;

    for (const memberId of loop.memberIds) {
      const member = layout.nodes.find((node) => node.id === memberId)!;
      expect(member.x - member.width / 2).toBeGreaterThan(loop.x - loop.width / 2);
      expect(member.x + member.width / 2).toBeLessThan(loop.x + loop.width / 2);
      expect(member.y - member.height / 2).toBeGreaterThan(loop.y - loop.height / 2);
      expect(member.y + member.height / 2).toBeLessThan(loop.y + loop.height / 2);
    }
  });

  it('measures nested loop frames from the inside out', () => {
    const layout = createGraphLayout(nestedLoopDefinition(), {
      root: {x: 500, y: 930},
      outer: {x: 500, y: 560},
      inner: {x: 720, y: 650},
      'inner-a': {x: 820, y: 760},
      'inner-b': {x: 760, y: 560},
      'outer-end': {x: 360, y: 320},
    });
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
    const outer = nodes.get('outer')!;
    const inner = nodes.get('inner')!;

    expectContains(outer, inner);
    expectContains(inner, nodes.get('inner-a')!);
    expectContains(inner, nodes.get('inner-b')!);
    expectContains(outer, nodes.get('outer-end')!);
  });

  it('keeps nested loops compact and vertically aligned in auto layout', () => {
    const definition = nestedLoopDefinition();
    const positions = createCompactGraphPositions(definition);
    const layout = createGraphLayout(definition, positions);
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
    const outer = nodes.get('outer')!;
    const inner = nodes.get('inner')!;

    expect(inner.x).toBe(outer.x);
    expect(outer.width).toBeLessThan(500);
    expectContains(outer, inner);
    expectContains(inner, nodes.get('inner-a')!);
    expectContains(inner, nodes.get('inner-b')!);
  });

  it('does not clamp manually positioned nodes to the nominal canvas', () => {
    const definition = linearDefinition(2);
    const layout = createGraphLayout(definition, {
      'node-0': {x: -320, y: 1800},
      'node-1': {x: 1450, y: -240},
    });
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

    expect(nodes.get('node-0')).toMatchObject({x: -320, y: 1800});
    expect(nodes.get('node-1')).toMatchObject({x: 1450, y: -240});
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
    expect(loop.outputPortLabels).toEqual(['1', '2']);
    expect(loop.outputPortNames).toEqual(['Left output', 'Right output']);
    expect(layout.nodes.find((node) => node.id === 'left')?.outputPortLabels).toEqual(['1']);
    expect(layout.nodes.find((node) => node.id === 'right')?.outputPortLabels).toEqual(['2']);
    expect(inputEdge.path).toContain(`${loop.x} ${loop.y + loop.height / 2}`);
    const inside = layout.nodes.find((node) => node.id === 'inside')!;
    const left = layout.nodes.find((node) => node.id === 'left')!;
    const right = layout.nodes.find((node) => node.id === 'right')!;
    expect(left.y).toBe(right.y);
    expect(left.x).toBeLessThan(inside.x);
    expect(right.x).toBeGreaterThan(inside.x);
    expect(inside.y).toBeGreaterThan(left.y);
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

  it('keeps multiple component output ports on one straight edge', () => {
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
    expect(component.outputPorts.map((port) => port.y)).toEqual([
      component.y - component.height / 2,
      component.y - component.height / 2,
      component.y - component.height / 2,
    ]);
  });

  it('shows no output ports for a component with explicit empty outputs', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'no-output',
      name: 'No output',
      rootNodeId: 'component',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {
          id: 'component',
          name: 'Component',
          draggable: false,
          graphic: null,
          connections: [],
          component: {
            schemaVersion: 1,
            id: 'component-template',
            name: 'Component template',
            rootNodeId: 'inner-root',
            outputNodeIds: [],
            nodes: [
              {id: 'inner-root', name: 'Root', draggable: false, graphic: null, connections: []},
            ],
          },
        },
      ],
    };
    const component = createGraphLayout(definition, {})
      .nodes.find((node) => node.id === 'component')!;

    expect(component.componentOutputCount).toBe(0);
    expect(component.outputPorts).toEqual([]);
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

    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1000);
    for (let index = 1; index < sortedYs.length; index++) {
      expect(sortedYs[index]! - sortedYs[index - 1]!).toBeGreaterThan(82);
    }
  });

  it('gives very deep trees additional vertical canvas space', () => {
    const definition = linearDefinition(16);
    const positions = createCompactGraphPositions(definition);
    const layout = createGraphLayout(definition, positions);

    expect(new Set(Object.values(positions).map((point) => `${point.x}:${point.y}`)).size).toBe(16);
    expect(positions['node-9']!.x).toBe(positions['node-8']!.x);
    expect(positions['node-8']!.y - positions['node-9']!.y).toBeGreaterThan(100);
    expect(layout.height).toBeGreaterThan(1900);
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
    expect(positions.left.y).toBe(positions.middle.y);
    expect(positions.middle.y).toBe(positions.right.y);
    expect(positions.root.x).toBe(positions.middle.x);
    expect(positions.root.y).toBeGreaterThan(positions.middle.y);
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

function linearDefinition(length: number): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: `linear-${length}`,
    name: `Linear ${length}`,
    rootNodeId: 'node-0',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: Array.from({length}, (_, index) => ({
      id: `node-${index}`,
      name: `Node ${index}`,
      draggable: false,
      graphic: null,
      connections: index < length - 1 ? [connection(`node-${index + 1}`)] : [],
    })),
  };
}

function memberLoopDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'member-loop',
    name: 'Member loop',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      {id: 'root', name: 'Root', draggable: false, graphic: null, connections: [connection('loop')]},
      {
        id: 'loop',
        name: 'Loop',
        draggable: false,
        graphic: null,
        connections: [connection('after')],
        loop: {
          repeat: {min: 2, max: 3},
          startNodeId: 'stem',
          endNodeId: 'leaf',
          memberNodeIds: ['stem', 'leaf'],
          continuationOutputNodeIds: ['leaf'],
        },
      },
      {id: 'stem', name: 'Stem', draggable: false, graphic: null, connections: [connection('leaf')]},
      {id: 'leaf', name: 'Leaf', draggable: false, graphic: null, connections: []},
      {id: 'after', name: 'After', draggable: false, graphic: null, connections: []},
    ],
  };
}

function nestedLoopDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'nested-loop-layout',
    name: 'Nested loop layout',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      {id: 'root', name: 'Root', draggable: false, graphic: null, connections: [connection('outer')]},
      {
        id: 'outer',
        name: 'Outer',
        draggable: false,
        graphic: null,
        connections: [],
        loop: {
          repeat: {min: 2, max: 2},
          startNodeId: 'inner',
          endNodeId: 'outer-end',
          memberNodeIds: ['inner', 'outer-end'],
          continuationOutputNodeIds: ['outer-end'],
        },
      },
      {
        id: 'inner',
        name: 'Inner',
        draggable: false,
        graphic: null,
        connections: [connection('outer-end')],
        loop: {
          repeat: {min: 3, max: 3},
          startNodeId: 'inner-a',
          endNodeId: 'inner-b',
          memberNodeIds: ['inner-a', 'inner-b'],
          continuationOutputNodeIds: ['inner-b'],
        },
      },
      {id: 'inner-a', name: 'Inner A', draggable: false, graphic: null, connections: [connection('inner-b')]},
      {id: 'inner-b', name: 'Inner B', draggable: false, graphic: null, connections: []},
      {id: 'outer-end', name: 'Outer End', draggable: false, graphic: null, connections: []},
    ],
  };
}

function expectContains(
  container: {x: number; y: number; width: number; height: number},
  content: {x: number; y: number; width: number; height: number},
): void {
  expect(content.x - content.width / 2).toBeGreaterThan(container.x - container.width / 2);
  expect(content.x + content.width / 2).toBeLessThan(container.x + container.width / 2);
  expect(content.y - content.height / 2).toBeGreaterThan(container.y - container.height / 2);
  expect(content.y + content.height / 2).toBeLessThan(container.y + container.height / 2);
}
