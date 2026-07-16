import {describe, expect, it} from 'vitest';
import {FlowerDefinition, FlowerNodeConnection, FlowerNodeDefinition} from '../models/flower.models';
import {flattenFlowerTemplates, generateFlowerTree} from './flower-tree';

describe('procedural flower tree generator', () => {
  it('connects every generated node to the base node', () => {
    const tree = generateFlowerTree(pathLoopDefinition(), 0.42);
    const parents = new Map(tree.edges.map((edge) => [edge.to, edge.from]));

    for (const node of tree.nodes) {
      let current = node.id;
      const visited = new Set<string>();
      while (current !== tree.rootId) {
        expect(visited.has(current)).toBe(false);
        visited.add(current);
        const parent = parents.get(current);
        expect(parent).toBeDefined();
        if (!parent) throw new Error(`Missing parent for ${current}`);
        current = parent;
      }
    }
  });

  it('expands a one-node loop serially and branches as siblings', () => {
    const tree = generateFlowerTree(oneNodeLoopDefinition(), 0.31);
    const stemNodes = tree.nodes.filter((node) => node.templateId === 'stem');
    const leafNodes = tree.nodes.filter((node) => node.templateId === 'leaf');
    const bloomNodes = tree.nodes.filter((node) => node.templateId === 'bloom');

    expect(stemNodes).toHaveLength(2);
    expect(new Set(leafNodes.map((node) => node.parentId))).toEqual(new Set(stemNodes.map((node) => node.id)));
    expect(stemNodes.slice(1).map((node) => node.parentId)).toEqual(
      stemNodes.slice(0, -1).map((node) => node.id),
    );
    expect(bloomNodes).toHaveLength(1);
    expect(bloomNodes[0]!.parentId).toBe(stemNodes.at(-1)?.id);
  });

  it('repeats the internal loop body and continues from its final end node', () => {
    const tree = generateFlowerTree(oneNodeLoopDefinition(), 0.31);
    const stems = tree.nodes.filter((node) => node.templateId === 'stem');
    const leaves = tree.nodes.filter((node) => node.templateId === 'leaf');
    const blooms = tree.nodes.filter((node) => node.templateId === 'bloom');

    expect(new Set(leaves.map((node) => node.parentId))).toEqual(new Set(stems.map((node) => node.id)));
    expect(stems.slice(1).map((node) => node.parentId)).toEqual(stems.slice(0, -1).map((node) => node.id));
    expect(blooms).toHaveLength(1);
    expect(blooms[0].parentId).toBe(stems.at(-1)?.id);
  });

  it('repeats every node on a multi-node loop path', () => {
    const definition = pathLoopDefinition();
    const tree = generateFlowerTree(definition, 0.31);
    const stems = tree.nodes.filter((node) => node.templateId === 'stem');
    const leaves = tree.nodes.filter((node) => node.templateId === 'leaf');
    const bloom = tree.nodes.find((node) => node.templateId === 'bloom');

    expect(stems).toHaveLength(2);
    expect(leaves).toHaveLength(2);
    expect(stems[1].parentId).toBe(leaves[0].id);
    expect(bloom?.parentId).toBe(leaves[1].id);
  });

  it('can repeat one stem while growing leaves as side branches', () => {
    const definition = oneNodeLoopDefinition({min: 3, max: 3});
    const tree = generateFlowerTree(definition, 0.31);
    const stems = tree.nodes.filter((node) => node.templateId === 'stem');
    const leaves = tree.nodes.filter((node) => node.templateId === 'leaf');
    const bloom = tree.nodes.find((node) => node.templateId === 'bloom');

    expect(stems).toHaveLength(3);
    expect(new Set(leaves.map((node) => node.parentId))).toEqual(new Set(stems.map((node) => node.id)));
    expect(stems.slice(1).map((node) => node.parentId)).toEqual(stems.slice(0, -1).map((node) => node.id));
    expect(bloom?.parentId).toBe(stems.at(-1)?.id);
  });

  it('repeats a framed member subtree and continues from the selected output', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'member-loop',
      name: 'Member loop',
      rootNodeId: 'root',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        node('root', [connection('loop')]),
        {
          ...node('loop', [connection('bloom')]),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'stem',
            endNodeId: 'stem',
            memberNodeIds: ['stem', 'leaf'],
            continuationOutputNodeIds: ['stem'],
          },
        },
        node('stem', [connection('leaf')]),
        node('leaf', []),
        node('bloom', []),
      ],
    };
    const tree = generateFlowerTree(definition, 0.2);
    const stems = tree.nodes.filter((treeNode) => treeNode.templateId === 'stem');
    const leaves = tree.nodes.filter((treeNode) => treeNode.templateId === 'leaf');
    const bloom = tree.nodes.find((treeNode) => treeNode.templateId === 'bloom');

    expect(stems).toHaveLength(2);
    expect(leaves).toHaveLength(2);
    expect(stems[1]!.parentId).toBe(stems[0]!.id);
    expect(bloom?.parentId).toBe(stems[1]!.id);
  });

  it('renders a member loop when the loop itself is the dynamic root', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'root-loop',
      name: 'Root loop',
      rootNodeId: 'loop',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        {
          ...node('loop', [connection('bloom')]),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'stem',
            endNodeId: 'stem',
            memberNodeIds: ['stem'],
            continuationOutputNodeIds: ['stem'],
          },
        },
        node('stem', []),
        node('bloom', []),
      ],
    };

    const tree = generateFlowerTree(definition, 0.2);
    const stems = tree.nodes.filter((treeNode) => treeNode.templateId === 'stem');
    const bloom = tree.nodes.find((treeNode) => treeNode.templateId === 'bloom');

    expect(stems).toHaveLength(2);
    expect(stems[0]!.x).toBe(0);
    expect(stems[0]!.y).toBe(0);
    expect(bloom?.parentId).toBe(stems[1]!.id);
  });

  it('executes a nested loop as one member of an outer loop', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'nested-member-loop',
      name: 'Nested member loop',
      rootNodeId: 'root',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
        node('root', [connection('outer-loop')]),
        {
          ...node('outer-loop', []),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'inner-loop',
            endNodeId: 'outer-stem',
            memberNodeIds: ['inner-loop', 'outer-stem'],
            continuationOutputNodeIds: ['outer-stem'],
          },
        },
        {
          ...node('inner-loop', [connection('outer-stem')]),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'inner-stem',
            endNodeId: 'inner-stem',
            memberNodeIds: ['inner-stem'],
            continuationOutputNodeIds: ['inner-stem'],
          },
        },
        node('inner-stem', []),
        node('outer-stem', []),
      ],
    };

    const tree = generateFlowerTree(definition, 0.2);
    const innerStems = tree.nodes.filter((treeNode) => treeNode.templateId === 'inner-stem');
    const outerStems = tree.nodes.filter((treeNode) => treeNode.templateId === 'outer-stem');

    expect(innerStems).toHaveLength(4);
    expect(outerStems).toHaveLength(2);
    expect(outerStems[0]!.parentId).toBe(innerStems[1]!.id);
    expect(innerStems[2]!.parentId).toBe(outerStems[0]!.id);
    expect(outerStems[1]!.parentId).toBe(innerStems[3]!.id);
  });

  it('applies a node offset before positioning its descendants', () => {
    const definition = branchDefinition();
    const baseTree = generateFlowerTree(definition, 0.31);
    const branch = baseTree.nodes.find((node) => node.templateId === 'branch')!;
    const movedTree = generateFlowerTree(definition, 0.31, {[branch.id]: {x: 20, y: -15}});
    const movedBranch = movedTree.nodes.find((node) => node.id === branch.id)!;
    const baseLeaf = baseTree.nodes.find((node) => node.templateId === 'leaf')!;
    const movedLeaf = movedTree.nodes.find((node) => node.id === baseLeaf.id)!;

    expect(movedBranch.x - branch.x).toBeCloseTo(20);
    expect(movedBranch.y - branch.y).toBeCloseTo(-15);
    expect(movedLeaf.x - baseLeaf.x).toBeCloseTo(20);
    expect(movedLeaf.y - baseLeaf.y).toBeCloseTo(-15);
  });

  it('is deterministic for a given definition and seed', () => {
    const definition = radialDefinition({randomness: 0.8});
    expect(generateFlowerTree(definition, 0.31))
      .toEqual(generateFlowerTree(definition, 0.31));
  });

  it('distributes repeated branches in three dimensions', () => {
    const tree = generateFlowerTree(radialDefinition({randomness: 0}), 0.31);
    const branches = tree.nodes.filter((node) => node.templateId === 'branch');

    expect(branches.some((node) => Math.abs(node.z) > 0.1)).toBe(true);
    expect(new Set(branches.map((node) => node.parentId)).size).toBeGreaterThan(0);
  });

  it('fills a disc area instead of only placing nodes on its edge', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 16, max: 16};
    connection.length = {min: 0, max: 20};
    connection.placement = {mode: 'disc', orientation: 'parent'};
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');
    const radii = nodes.map((node) => Math.hypot(node.x, node.z));

    expect(radii.some((radius) => radius < 8)).toBe(true);
    expect(radii.some((radius) => radius > 17)).toBe(true);
    expect(nodes.every((node) => Math.abs(node.y) < 0.001)).toBe(true);
    expect(nodes.every((node) => Math.abs(node.angle) < 0.001)).toBe(true);
  });

  it('distributes nodes evenly across a sphere surface', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 24, max: 24};
    connection.length = {min: 20, max: 20};
    connection.placement = {mode: 'sphere', orientation: 'radial'};
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(nodes.every((node) => Math.abs(Math.hypot(node.x, node.y, node.z) - 20) < 0.001)).toBe(true);
    expect(nodes.some((node) => node.y < -10)).toBe(true);
    expect(nodes.some((node) => node.y > 10)).toBe(true);
    expect(nodes.some((node) => Math.abs(node.z) > 10)).toBe(true);
  });

  it('keeps a ring on one plane with an even radius', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 12, max: 12};
    connection.length = {min: 18, max: 18};
    connection.placement = {mode: 'ring', orientation: 'radial'};
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(nodes.every((node) => Math.abs(node.y) < 0.001)).toBe(true);
    expect(nodes.every((node) => Math.abs(Math.hypot(node.x, node.z) - 18) < 0.001)).toBe(true);
  });

  it.each([0, 180])('preserves the radial distribution at a polar inclination of %s°', (angle) => {
    const definition = radialDefinition({randomness: 0});
    definition.nodes[0]!.connections[0]!.angle = {min: angle, max: angle};
    const branches = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(new Set(branches.map((node) => node.attachmentAzimuth)).size).toBe(branches.length);
  });

  it('samples roll and curvature rotation per generated part', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.roll = {min: -180, max: 180};
    connection.stem = {
      color: '#000000',
      width: 4,
      bendRotation: {min: -90, max: 90},
    };
    const branches = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(new Set(branches.map((node) => node.roll)).size).toBe(branches.length);
    expect(new Set(branches.map((node) => node.bendRotation)).size).toBe(branches.length);
  });

  it('makes a fully uniform distribution independent of the seed', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'uniform',
      name: 'Uniform',
      rootNodeId: 'base',
      stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
      nodes: [
      {
        id: 'base',
        name: 'Basis',
        draggable: false,
        graphic: null,
        connections: [{
          childId: 'branch',
          repeat: {min: 4, max: 4},
          length: {min: 10, max: 10},
          angle: {min: 90, max: 90},
          azimuth: {min: 0, max: 360},
          randomness: 0,
        }],
      },
      {id: 'branch', name: 'Ast', draggable: false, graphic: null, connections: []},
      ],
    };

    expect(generateFlowerTree(definition, 0.1)).toEqual(generateFlowerTree(definition, 0.9));
  });

  it('keeps the source connection on every generated edge', () => {
    const definition = componentDefinition();
    const tree = generateFlowerTree(definition, 0.31);
    const templates = flattenFlowerTemplates(definition);
    const generatedNodes = new Map(tree.nodes.map((node) => [node.id, node]));

    for (const edge of tree.edges) {
      expect(edge.connection).toBeDefined();
      if (edge.connectionIndex >= 0) {
        expect(templates.get(edge.connectionSourceId)?.connections[edge.connectionIndex]).toBeDefined();
      }
      const target = templates.get(edge.connection.childId);
      const expectedTemplateId = target?.component
        ? `${target.id}::${target.component.rootNodeId}`
        : target?.loop?.startNodeId ?? edge.connection.childId;
      expect(generatedNodes.get(edge.to)?.templateId).toBe(expectedTemplateId);
    }
  });

  it('does not continue external children from a component with no outputs', () => {
    const definition = componentDefinition([]);
    const tree = generateFlowerTree(definition, 0.31);

    expect(tree.nodes.some((node) => node.templateId === 'after')).toBe(false);
  });
});

function node(id: string, connections: FlowerNodeConnection[]): FlowerNodeDefinition {
  return {
    id,
    name: id,
    draggable: false,
    graphic: null,
    connections,
  };
}

function connection(childId: string): FlowerNodeConnection {
  return {
    childId,
    repeat: {min: 1, max: 1},
    length: {min: 10, max: 10},
    angle: {min: 0, max: 0},
    randomness: 0,
  };
}

function branchDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'branch',
    name: 'Branch',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      node('root', [connection('branch')]),
      node('branch', [connection('leaf')]),
      node('leaf', []),
    ],
  };
}

function oneNodeLoopDefinition(repeat = {min: 2, max: 2}): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'one-node-loop',
    name: 'One node loop',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      node('root', [connection('loop')]),
      {
        ...node('loop', [connection('bloom')]),
        loop: {
          repeat,
          startNodeId: 'stem',
          endNodeId: 'stem',
        },
      },
      node('stem', [connection('leaf')]),
      node('leaf', []),
      node('bloom', []),
    ],
  };
}

function pathLoopDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'path-loop',
    name: 'Path loop',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      node('root', [connection('loop')]),
      {
        ...node('loop', [connection('bloom')]),
        loop: {
          repeat: {min: 2, max: 2},
          startNodeId: 'stem',
          endNodeId: 'leaf',
        },
      },
      node('stem', [connection('leaf')]),
      node('leaf', []),
      node('bloom', []),
    ],
  };
}

function radialDefinition(options: {randomness: number}): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'radial',
    name: 'Radial',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      {
        ...node('root', []),
        connections: [{
          childId: 'branch',
          repeat: {min: 5, max: 5},
          length: {min: 10, max: 10},
          angle: {min: 90, max: 90},
          azimuth: {min: 0, max: 360},
          randomness: options.randomness,
        }],
      },
      node('branch', []),
    ],
  };
}

function componentDefinition(outputNodeIds: string[] = ['inner-out']): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'component-source',
    name: 'Component source',
    rootNodeId: 'root',
    stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
    nodes: [
      node('root', [connection('component')]),
      {
        ...node('component', [connection('after')]),
        component: {
          schemaVersion: 1,
          id: 'component-template',
          name: 'Component template',
          rootNodeId: 'inner-root',
          outputNodeIds,
          nodes: [
            node('inner-root', [connection('inner-out')]),
            node('inner-out', []),
          ],
        },
      },
      node('after', []),
    ],
  };
}
