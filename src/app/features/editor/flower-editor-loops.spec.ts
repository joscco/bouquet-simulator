import {describe, expect, it} from 'vitest';
import {FlowerDefinition, FlowerNodeConnection, FlowerNodeDefinition} from '../../core/models/flower.models';
import {absorbConnectedSubtreeIntoLoop} from './flower-editor-loops';

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

  it('does not absorb another loop or a member owned by another loop', () => {
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

    expect(absorbConnectedSubtreeIntoLoop(definition, 'a', 'loop-b').addedNodeIds).toEqual([]);
    expect(absorbConnectedSubtreeIntoLoop(definition, 'a', 'b').addedNodeIds).toEqual([]);
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
