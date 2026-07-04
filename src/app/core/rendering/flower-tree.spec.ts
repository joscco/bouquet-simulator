import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {generateFlowerTree} from './flower-tree';

describe('procedural flower tree generator', () => {
  it('connects every generated node to the base node', () => {
    const tree = generateFlowerTree(DEFAULT_FLOWERS[2], 0.42);
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

  it('expands a multi-node loop path serially and branches as siblings', () => {
    const tree = generateFlowerTree(DEFAULT_FLOWERS[0], 0.31);
    const stemNodes = tree.nodes.filter((node) => node.templateId === 'stem');
    const leafNodes = tree.nodes.filter((node) => node.templateId === 'leaf');
    const petalNodes = tree.nodes.filter((node) => node.templateId === 'petal');

    expect(stemNodes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(leafNodes.map((node) => node.parentId))).toEqual(new Set(stemNodes.map((node) => node.id)));
    expect(stemNodes.slice(1).map((node) => node.parentId)).toEqual(
      stemNodes.slice(0, -1).map((node) => node.id),
    );
    expect(petalNodes.length).toBeGreaterThanOrEqual(15);
    expect(new Set(petalNodes.map((node) => node.parentId)).size).toBe(1);
  });

  it('repeats the internal loop body and continues from its final end node', () => {
    const tree = generateFlowerTree(DEFAULT_FLOWERS[0], 0.31);
    const stems = tree.nodes.filter((node) => node.templateId === 'stem');
    const leaves = tree.nodes.filter((node) => node.templateId === 'leaf');
    const blooms = tree.nodes.filter((node) => node.templateId === 'bloom');

    expect(new Set(leaves.map((node) => node.parentId))).toEqual(new Set(stems.map((node) => node.id)));
    expect(stems.slice(1).map((node) => node.parentId)).toEqual(stems.slice(0, -1).map((node) => node.id));
    expect(blooms).toHaveLength(1);
    expect(blooms[0].parentId).toBe(stems.at(-1)?.id);
  });

  it('repeats every node on a multi-node loop path', () => {
    const definition = structuredClone(DEFAULT_FLOWERS[0]);
    const loop = definition.nodes.find((node) => node.id === 'growth-loop')!.loop!;
    loop.repeat = {min: 2, max: 2};
    loop.endNodeId = 'leaf';
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
    const definition = structuredClone(DEFAULT_FLOWERS[0]);
    const loop = definition.nodes.find((node) => node.id === 'growth-loop')!.loop!;
    loop.repeat = {min: 3, max: 3};
    loop.startNodeId = 'stem';
    loop.endNodeId = 'stem';
    const tree = generateFlowerTree(definition, 0.31);
    const stems = tree.nodes.filter((node) => node.templateId === 'stem');
    const leaves = tree.nodes.filter((node) => node.templateId === 'leaf');
    const bloom = tree.nodes.find((node) => node.templateId === 'bloom');

    expect(stems).toHaveLength(3);
    expect(new Set(leaves.map((node) => node.parentId))).toEqual(new Set(stems.map((node) => node.id)));
    expect(stems.slice(1).map((node) => node.parentId)).toEqual(stems.slice(0, -1).map((node) => node.id));
    expect(bloom?.parentId).toBe(stems.at(-1)?.id);
  });

  it('applies a node offset before positioning its descendants', () => {
    const baseTree = generateFlowerTree(DEFAULT_FLOWERS[0], 0.31);
    const bloom = baseTree.nodes.find((node) => node.templateId === 'bloom')!;
    const movedTree = generateFlowerTree(DEFAULT_FLOWERS[0], 0.31, {[bloom.id]: {x: 20, y: -15}});
    const movedBloom = movedTree.nodes.find((node) => node.id === bloom.id)!;
    const basePetal = baseTree.nodes.find((node) => node.templateId === 'petal')!;
    const movedPetal = movedTree.nodes.find((node) => node.id === basePetal.id)!;

    expect(movedBloom.x - bloom.x).toBeCloseTo(20);
    expect(movedBloom.y - bloom.y).toBeCloseTo(-15);
    expect(movedPetal.x - basePetal.x).toBeCloseTo(20);
    expect(movedPetal.y - basePetal.y).toBeCloseTo(-15);
  });

  it('is deterministic for a given definition and seed', () => {
    expect(generateFlowerTree(DEFAULT_FLOWERS[1], 0.31))
      .toEqual(generateFlowerTree(DEFAULT_FLOWERS[1], 0.31));
  });

  it('keeps the source connection on every generated edge', () => {
    const definition = DEFAULT_FLOWERS[0];
    const tree = generateFlowerTree(definition, 0.31);
    const templates = new Map(definition.nodes.map((node) => [node.id, node]));
    const generatedNodes = new Map(tree.nodes.map((node) => [node.id, node]));

    for (const edge of tree.edges) {
      const connection = templates.get(edge.connectionSourceId)?.connections[edge.connectionIndex];
      expect(connection).toBeDefined();
      const target = connection ? templates.get(connection.childId) : null;
      const expectedTemplateId = target?.loop?.startNodeId ?? connection?.childId;
      expect(generatedNodes.get(edge.to)?.templateId).toBe(expectedTemplateId);
    }
  });
});
