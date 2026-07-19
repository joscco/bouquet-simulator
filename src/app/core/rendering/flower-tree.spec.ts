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

  it('keeps every instance in the main direction when all spread angles are zero', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.direction = {x: 35, y: 12, z: -40};
    connection.spread = {
      ...connection.spread!,
      deviation: {min: 0, max: 0},
      revolution: {min: 0, max: 0},
      roll: {min: 0, max: 0},
    };
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(new Set(nodes.map((node) => node.x.toFixed(6))).size).toBe(1);
    expect(new Set(nodes.map((node) => node.y.toFixed(6))).size).toBe(1);
    expect(new Set(nodes.map((node) => node.z.toFixed(6))).size).toBe(1);
    expect(nodes.every((node) => node.roll === 12 * Math.PI / 180)).toBe(true);
  });

  it('distributes variable lengths without a separate distribution mode', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 16, max: 16};
    connection.length = {min: 0, max: 20};
    connection.spread = {
      ...connection.spread!,
      deviation: {min: 90, max: 90},
      orientation: 'main',
    };
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');
    const radii = nodes.map((node) => Math.hypot(node.x, node.z));

    expect(radii.some((radius) => radius < 8)).toBe(true);
    expect(radii.some((radius) => radius > 17)).toBe(true);
    expect(radii).not.toEqual([...radii].sort((first, second) => first - second));
    expect(nodes.every((node) => Math.abs(node.y) < 0.001)).toBe(true);
    expect(nodes.every((node) => Math.abs(node.angle) < 0.001)).toBe(true);
  });

  it('distributes nodes evenly across a sphere surface', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 24, max: 24};
    connection.length = {min: 20, max: 20};
    connection.spread = {
      ...connection.spread!,
      deviation: {min: 0, max: 180},
      orientation: 'spread',
    };
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(nodes.every((node) => Math.abs(Math.hypot(node.x, node.y, node.z) - 20) < 0.001)).toBe(true);
    expect(nodes.some((node) => node.y < -10)).toBe(true);
    expect(nodes.some((node) => node.y > 10)).toBe(true);
    expect(nodes.some((node) => Math.abs(node.z) > 10)).toBe(true);
  });

  it('uses canonical maximum-distance directions for one to four even sphere outgrowths', () => {
    const directionsFor = (count: number) => {
      const definition = radialDefinition({randomness: 0});
      const connection = definition.nodes[0]!.connections[0]!;
      connection.repeat = {min: count, max: count};
      connection.spread!.deviation = {min: -180, max: 180};
      connection.spread!.revolution = {min: -180, max: 180};
      return generateFlowerTree(definition, 0.31).nodes
        .filter((node) => node.templateId === 'branch')
        .map((node) => ({
          x: Math.sin(node.angle) * Math.cos(node.azimuth),
          y: Math.cos(node.angle),
          z: Math.sin(node.angle) * Math.sin(node.azimuth),
        }));
    };
    const dotProduct = (
      first: {x: number; y: number; z: number},
      second: {x: number; y: number; z: number},
    ) => first.x * second.x + first.y * second.y + first.z * second.z;

    expect(directionsFor(1)[0]).toMatchObject({x: 0, y: 1, z: 0});
    const pair = directionsFor(2);
    expect(dotProduct(pair[0]!, pair[1]!)).toBeCloseTo(-1);
    const axes = directionsFor(3);
    expect(dotProduct(axes[0]!, axes[1]!)).toBeCloseTo(0);
    expect(dotProduct(axes[0]!, axes[2]!)).toBeCloseTo(0);
    expect(dotProduct(axes[1]!, axes[2]!)).toBeCloseTo(0);
    const tetrahedron = directionsFor(4);
    for (let first = 0; first < tetrahedron.length; first++) {
      for (let second = first + 1; second < tetrahedron.length; second++) {
        expect(dotProduct(tetrahedron[first]!, tetrahedron[second]!)).toBeCloseTo(-1 / 3);
      }
    }
  });

  it('uses the loop start node incoming settings for every repetition', () => {
    const definition = oneNodeLoopDefinition();
    const start = definition.nodes.find((node) => node.id === 'stem')!;
    start.incoming = {
      repeat: {min: 1, max: 1},
      length: {min: 25, max: 25},
      direction: {x: 90, y: 0, z: 0},
      spread: {
        deviation: {min: 0, max: 0},
        revolution: {min: 0, max: 0},
        roll: {min: 0, max: 0},
        randomness: 0,
        orientation: 'spread',
      },
    };

    const stems = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'stem');

    expect(stems).toHaveLength(2);
    expect(Math.hypot(stems[0]!.x, stems[0]!.z)).toBeCloseTo(25);
    expect(Math.abs(stems[0]!.y)).toBeLessThan(0.001);
    expect(Math.hypot(
      stems[1]!.x - stems[0]!.x,
      stems[1]!.y - stems[0]!.y,
      stems[1]!.z - stems[0]!.z,
    )).toBeCloseTo(25);
  });

  it('keeps a ring on one plane with an even radius', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 12, max: 12};
    connection.length = {min: 18, max: 18};
    connection.spread = {...connection.spread!, deviation: {min: 90, max: 90}};
    const nodes = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(nodes.every((node) => Math.abs(node.y) < 0.001)).toBe(true);
    expect(nodes.every((node) => Math.abs(Math.hypot(node.x, node.z) - 18) < 0.001)).toBe(true);
  });

  it('includes both ends of a partial revolution interval when spread is even', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 5, max: 5};
    connection.spread!.deviation = {min: 55, max: 55};
    connection.spread!.revolution = {min: 30, max: 150};
    const angles = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch')
      .map((node) => Math.round((node.attachmentAzimuth ?? 0) * 180 / Math.PI));

    expect(angles).toEqual([30, 60, 90, 120, 150]);
  });

  it('does not duplicate the seam of a complete even revolution', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.repeat = {min: 4, max: 4};
    connection.spread!.deviation = {min: 55, max: 55};
    connection.spread!.revolution = {min: 0, max: 360};
    const angles = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch')
      .map((node) => Math.round((node.attachmentAzimuth ?? 0) * 180 / Math.PI));

    expect(angles).toEqual([-180, -90, 0, 90]);
  });

  it.each([0, 180])('preserves the radial distribution at a polar inclination of %s°', (angle) => {
    const definition = radialDefinition({randomness: 0});
    definition.nodes[0]!.connections[0]!.spread!.deviation = {min: angle, max: angle};
    const branches = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'branch');

    expect(new Set(branches.map((node) => node.attachmentAzimuth)).size).toBe(branches.length);
  });

  it('normalizes legacy negative inclination to the canonical 0–180° range', () => {
    const positiveDefinition = radialDefinition({randomness: 0});
    const negativeDefinition = radialDefinition({randomness: 0});
    const positiveConnection = positiveDefinition.nodes[0]!.connections[0]!;
    const negativeConnection = negativeDefinition.nodes[0]!.connections[0]!;
    positiveConnection.repeat = negativeConnection.repeat = {min: 1, max: 1};
    positiveConnection.spread!.revolution = negativeConnection.spread!.revolution = {min: 0, max: 0};
    positiveConnection.spread!.deviation = {min: 45, max: 45};
    negativeConnection.spread!.deviation = {min: -45, max: -45};

    const positive = generateFlowerTree(positiveDefinition, 0.31).nodes
      .find((node) => node.templateId === 'branch')!;
    const negative = generateFlowerTree(negativeDefinition, 0.31).nodes
      .find((node) => node.templateId === 'branch')!;

    expect(negative.x).toBeCloseTo(positive.x);
    expect(negative.y).toBeCloseTo(positive.y);
    expect(negative.z).toBeCloseTo(positive.z);
  });

  it('samples roll and curvature rotation per generated part', () => {
    const definition = radialDefinition({randomness: 0});
    const connection = definition.nodes[0]!.connections[0]!;
    connection.spread!.roll = {min: -180, max: 180};
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
          direction: {x: 0, y: 0, z: 0},
          spread: {
            deviation: {min: 90, max: 90},
            revolution: {min: 0, max: 360},
            roll: {min: 0, max: 0},
            randomness: 0,
            orientation: 'spread',
          },
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

  it('spreads repeated components evenly instead of stacking them', () => {
    const definition = componentDefinition();
    const entry = definition.nodes[0]!.connections[0]!;
    entry.repeat = {min: 4, max: 4};
    entry.length = {min: 20, max: 20};
    entry.direction = {x: 0, y: 0, z: 0};
    entry.spread = {
      deviation: {min: 90, max: 90},
      revolution: {min: 0, max: 360},
      roll: {min: 0, max: 0},
      randomness: 0,
      orientation: 'spread',
    };
    const roots = generateFlowerTree(definition, 0.31).nodes
      .filter((node) => node.templateId === 'component::inner-root');

    expect(roots).toHaveLength(4);
    expect(new Set(roots.map((node) => `${node.x.toFixed(3)}:${node.z.toFixed(3)}`)).size).toBe(4);
    expect(roots.map((node) => Math.round((node.attachmentAzimuth ?? 0) * 180 / Math.PI)))
      .toEqual([-180, -90, 0, 90]);
  });

  it('rotates the internal frame of a component around Y', () => {
    const withRotation = (y: number) => {
      const definition = componentDefinition();
      const entry = definition.nodes[0]!.connections[0]!;
      entry.direction = {x: 0, y, z: 0};
      entry.spread = {
        deviation: {min: 0, max: 0}, revolution: {min: 0, max: 0}, roll: {min: 0, max: 0},
        randomness: 0, orientation: 'spread',
      };
      const component = definition.nodes.find((node) => node.id === 'component')!.component!;
      const internal = component.nodes!.find((node) => node.id === 'inner-root')!.connections[0]!;
      internal.direction = {x: 0, y: 0, z: 0};
      internal.spread = {
        deviation: {min: 90, max: 90}, revolution: {min: 0, max: 0}, roll: {min: 0, max: 0},
        randomness: 0, orientation: 'spread',
      };
      const tree = generateFlowerTree(definition, 0.31);
      const root = tree.nodes.find((node) => node.templateId === 'component::inner-root')!;
      const output = tree.nodes.find((node) => node.templateId === 'component::inner-out')!;
      return {x: output.x - root.x, z: output.z - root.z};
    };

    const unrotated = withRotation(0);
    const rotated = withRotation(90);
    expect(Math.abs(unrotated.x)).toBeLessThan(0.001);
    expect(Math.abs(unrotated.z)).toBeGreaterThan(9);
    expect(Math.abs(rotated.x)).toBeGreaterThan(9);
    expect(Math.abs(rotated.z)).toBeLessThan(0.001);
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
          direction: {x: 0, y: 0, z: 0},
          spread: {
            deviation: {min: 90, max: 90},
            revolution: {min: 0, max: 360},
            roll: {min: 0, max: 0},
            randomness: options.randomness,
            orientation: 'spread',
          },
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
