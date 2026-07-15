import {describe, expect, it} from 'vitest';
import {FlowerDefinition, FlowerNodeConnection, FlowerNodeDefinition} from '../../../core/models/flower.models';
import {
  absorbConnectedSubtreeIntoLoop,
  pruneDisconnectedLoopMembers,
} from './flower-editor-loops';

const stem = {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8};

describe('flower editor loop membership', () => {
  it('absorbs a newly connected subtree into the loop of its source node', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'loop-membership',
      name: 'Loop membership',
      rootNodeId: 'root',
      stem,
      nodes: [
        node('root', [connection('loop')]),
        {
          ...node('loop', [connection('outside')]),
          loop: {
            repeat: {min: 2, max: 3},
            startNodeId: 'member-a',
            endNodeId: 'member-b',
            memberNodeIds: ['member-a', 'member-b'],
            continuationOutputNodeIds: ['member-b'],
          },
        },
        node('member-a', [connection('member-b')]),
        node('member-b', [connection('new-branch')]),
        node('new-branch', [connection('new-leaf')]),
        node('new-leaf'),
        node('outside'),
      ],
    };

    const update = absorbConnectedSubtreeIntoLoop(definition, 'member-b', 'new-branch');
    const loop = update.definition.nodes.find((candidate) => candidate.id === 'loop')!.loop!;

    expect(update.addedNodeIds).toEqual(['new-branch', 'new-leaf']);
    expect(loop.memberNodeIds).toEqual(['member-a', 'member-b', 'new-branch', 'new-leaf']);
    expect(loop.continuationOutputNodeIds).toEqual(['new-leaf']);
    expect(update.definition.nodes.find((candidate) => candidate.id === 'loop')!.connections)
      .toEqual([connection('outside')]);
  });

  it('absorbs a nested loop as one member without flattening its members', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'nested-loops',
      name: 'Nested loops',
      rootNodeId: 'root',
      stem,
      nodes: [
        node('root', [connection('loop-a')]),
        {
          ...node('loop-a'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'a',
            endNodeId: 'a',
            memberNodeIds: ['a'],
            continuationOutputNodeIds: ['a'],
          },
        },
        node('a', [connection('loop-b')]),
        {
          ...node('loop-b'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'b',
            endNodeId: 'b',
            memberNodeIds: ['b'],
            continuationOutputNodeIds: ['b'],
          },
        },
        node('b'),
      ],
    };

    const nested = absorbConnectedSubtreeIntoLoop(definition, 'a', 'loop-b');
    const outerLoop = nested.definition.nodes.find((candidate) => candidate.id === 'loop-a')!.loop!;

    expect(nested.addedNodeIds).toEqual(['loop-b']);
    expect(outerLoop.memberNodeIds).toEqual(['a', 'loop-b']);
    expect(outerLoop.continuationOutputNodeIds).toEqual(['loop-b']);
    expect(outerLoop.memberNodeIds).not.toContain('b');
    expect(absorbConnectedSubtreeIntoLoop(definition, 'a', 'b').addedNodeIds).toEqual([]);

    const prependedDefinition: FlowerDefinition = {
      ...definition,
      nodes: definition.nodes.map((candidate) => {
        if (candidate.id === 'a') return {...candidate, connections: []};
        if (candidate.id === 'loop-b') return {...candidate, connections: [connection('a')]};
        return candidate;
      }),
    };
    const prepended = absorbConnectedSubtreeIntoLoop(prependedDefinition, 'loop-b', 'a');
    const prependedOuterLoop = prepended.definition.nodes
      .find((candidate) => candidate.id === 'loop-a')!.loop!;

    expect(prepended.addedNodeIds).toEqual(['loop-b']);
    expect(prependedOuterLoop.startNodeId).toBe('loop-b');
    expect(prependedOuterLoop.memberNodeIds).toEqual(['loop-b', 'a']);
    expect(prependedOuterLoop.memberNodeIds).not.toContain('b');
  });

  it('keeps a node connected to the outer loop frame outside of the loop', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'nested-loops',
      name: 'Nested loops',
      rootNodeId: 'root',
      stem,
      nodes: [
        node('root', [connection('loop')]),
        {
          ...node('loop'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'member-a',
            endNodeId: 'member-b',
            memberNodeIds: ['member-a', 'member-b'],
            continuationOutputNodeIds: ['member-b'],
          },
        },
        node('member-a', [connection('member-b')]),
        node('member-b'),
        {
          ...node('nested-loop'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: null,
            endNodeId: null,
            memberNodeIds: [],
            continuationOutputNodeIds: [],
          },
        },
      ],
    };

    const connected: FlowerDefinition = {
      ...definition,
      nodes: definition.nodes.map((candidate) => candidate.id === 'loop'
        ? {...candidate, connections: [connection('nested-loop')]}
        : candidate),
    };
    const update = absorbConnectedSubtreeIntoLoop(connected, 'loop', 'nested-loop');
    const loop = update.definition.nodes.find((candidate) => candidate.id === 'loop')!.loop!;

    expect(update.addedNodeIds).toEqual([]);
    expect(loop.memberNodeIds).toEqual(['member-a', 'member-b']);
    expect(update.definition.nodes.find((candidate) => candidate.id === 'loop')!.connections)
      .toEqual([connection('nested-loop')]);
  });

  it('prepends the current peony thorn subtree when it connects to the loop start', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'garden-rose',
      name: 'Pfingstrose',
      rootNodeId: 'base',
      stem,
      nodes: [
        node('base', [connection('loop')]),
        {
          ...node('loop'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'leaf-hub',
            endNodeId: 'out',
            memberNodeIds: ['leaf-hub', 'leaf', 'out'],
            continuationOutputNodeIds: ['out'],
          },
        },
        node('leaf-hub', [connection('leaf'), connection('out')]),
        node('leaf'),
        node('out'),
        node('thorn-hub', [connection('thorn'), connection('leaf-hub')]),
        node('thorn'),
      ],
    };

    const update = absorbConnectedSubtreeIntoLoop(definition, 'thorn-hub', 'leaf-hub');
    const loop = update.definition.nodes.find((candidate) => candidate.id === 'loop')!.loop!;

    expect(update.addedNodeIds).toEqual(['thorn-hub', 'thorn']);
    expect(loop.startNodeId).toBe('thorn-hub');
    expect(loop.memberNodeIds).toEqual(['thorn-hub', 'thorn', 'leaf-hub', 'leaf', 'out']);
    expect(loop.continuationOutputNodeIds).toEqual(['out', 'thorn']);
  });

  it('prunes a detached member subtree and updates the loop output', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'loop-prune',
      name: 'Loop prune',
      rootNodeId: 'root',
      stem,
      nodes: [
        node('root', [connection('loop')]),
        {
          ...node('loop'),
          loop: {
            repeat: {min: 2, max: 2},
            startNodeId: 'member-a',
            endNodeId: 'detached-leaf',
            memberNodeIds: ['member-a', 'member-b', 'detached', 'detached-leaf'],
            continuationOutputNodeIds: ['detached-leaf'],
          },
        },
        node('member-a', [connection('member-b')]),
        node('member-b'),
        node('detached', [connection('detached-leaf')]),
        node('detached-leaf'),
      ],
    };

    const update = pruneDisconnectedLoopMembers(definition);
    const loop = update.definition.nodes.find((candidate) => candidate.id === 'loop')!.loop!;

    expect(update.removedNodeIds).toEqual(['detached', 'detached-leaf']);
    expect(loop.memberNodeIds).toEqual(['member-a', 'member-b']);
    expect(loop.continuationOutputNodeIds).toEqual(['member-b']);
    expect(loop.endNodeId).toBe('member-b');
  });
});

function node(id: string, connections: FlowerNodeConnection[] = []): FlowerNodeDefinition {
  return {id, name: id, draggable: false, graphic: null, connections};
}

function connection(childId: string): FlowerNodeConnection {
  return {
    childId,
    repeat: {min: 1, max: 1},
    length: {min: 20, max: 30},
    angle: {min: 0, max: 20},
  };
}
