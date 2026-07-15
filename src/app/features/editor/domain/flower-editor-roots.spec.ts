import {describe, expect, it} from 'vitest';
import {FlowerDefinition, FlowerNodeDefinition} from '../../../core/models/flower.models';
import {resolveFlowerEditorForest, withDerivedFlowerRoot} from './flower-editor-roots';

describe('dynamic flower roots', () => {
  it('derives the single root instead of trusting a stale stored id', () => {
    const definition = flower([
      node('new-root', ['child']),
      node('child'),
    ], 'child');

    expect(resolveFlowerEditorForest(definition).activeRootId).toBe('new-root');
    expect(withDerivedFlowerRoot(definition).rootNodeId).toBe('new-root');
  });

  it('keeps one forest active and switches it through node selection', () => {
    const definition = flower([
      node('first', ['first-child']),
      node('first-child'),
      node('second', ['second-child']),
      node('second-child'),
    ], 'first');

    const initial = resolveFlowerEditorForest(definition);
    const switched = resolveFlowerEditorForest(definition, 'second-child');

    expect(initial.rootCandidateIds).toEqual(['first', 'second']);
    expect(initial.activeRootId).toBe('first');
    expect(initial.activeNodeIds).toEqual(new Set(['first', 'first-child']));
    expect(switched.activeRootId).toBe('second');
    expect(switched.activeNodeIds).toEqual(new Set(['second', 'second-child']));
  });

  it('treats loop members as part of their outer tree instead of separate roots', () => {
    const definition = flower([
      {
        ...node('loop'),
        loop: {
          repeat: {min: 2, max: 2},
          startNodeId: 'member',
          endNodeId: 'member',
          memberNodeIds: ['member'],
          continuationOutputNodeIds: ['member'],
        },
      },
      node('member'),
    ], 'member');

    const forest = resolveFlowerEditorForest(definition, 'member');

    expect(forest.rootCandidateIds).toEqual(['loop']);
    expect(forest.activeRootId).toBe('loop');
    expect(forest.activeNodeIds).toEqual(new Set(['loop', 'member']));
  });

  it('allows a temporarily empty definition', () => {
    const definition = flower([], 'deleted-root');

    expect(resolveFlowerEditorForest(definition)).toEqual({
      rootCandidateIds: [],
      activeRootId: null,
      activeNodeIds: new Set(),
    });
    expect(withDerivedFlowerRoot(definition).rootNodeId).toBe('');
  });
});

function flower(nodes: FlowerNodeDefinition[], rootNodeId: string): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'forest',
    name: 'Forest',
    rootNodeId,
    stem: {color: '#426f50', highlightColor: '#82a878', width: 8, taper: 1},
    nodes,
  };
}

function node(id: string, children: string[] = []): FlowerNodeDefinition {
  return {
    id,
    name: id,
    draggable: false,
    graphic: null,
    connections: children.map((childId) => ({childId})),
  };
}
