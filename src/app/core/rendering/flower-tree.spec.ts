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

  it('expands a chain serially and branches as siblings', () => {
    const tree = generateFlowerTree(DEFAULT_FLOWERS[0], 0.31);
    const stemNodes = tree.nodes.filter((node) => node.templateId === 'stem');
    const petalNodes = tree.nodes.filter((node) => node.templateId === 'petal');

    expect(stemNodes.length).toBeGreaterThanOrEqual(2);
    expect(stemNodes.slice(1).every((node, index) => node.parentId === stemNodes[index].id)).toBe(true);
    expect(petalNodes.length).toBeGreaterThanOrEqual(15);
    expect(new Set(petalNodes.map((node) => node.parentId)).size).toBe(1);
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
});
