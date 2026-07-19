import {
  FlowerDefinition,
  FlowerNodeDefinition,
} from '../../../core/models/flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  nodeIncomingOrDefault,
} from '../../../core/models/flower-connections';
import {FlowerSubtreeSelection} from '../../../core/models/flower-subtree';
import {GraphNode, Point} from '../graph/flower-editor-graph';
import {nodeBounds, selectedExternalConnections} from './flower-editor-definition';
import {loopOutputNodeIds} from './flower-editor-loops';
import {FLOWER_CREATION_DEFAULTS} from '../../../core/models/flower-creation-defaults';

export interface CreatedFlowerLoop {
  definition: FlowerDefinition;
  nodePositions: Record<string, Point>;
  loopNodeId: string;
  wrappedSelection: boolean;
}

export function createFlowerLoop(
  definition: FlowerDefinition,
  nodePositions: Record<string, Point>,
  selection: FlowerSubtreeSelection | null,
  graphNodes: GraphNode[],
): CreatedFlowerLoop {
  const loopNodeId = nextLoopNodeId(definition);
  if (!selection) {
    const loopNode: FlowerNodeDefinition = {
      id: loopNodeId,
      name: `${FLOWER_CREATION_DEFAULTS.loop.namePrefix} ${loopNumber(loopNodeId)}`,
      draggable: FLOWER_CREATION_DEFAULTS.node.draggable,
      graphic: null,
      incoming: structuredClone(DEFAULT_INCOMING_CONNECTION),
      connections: [],
      loop: {
        repeat: structuredClone(FLOWER_CREATION_DEFAULTS.loop.repeat),
        startNodeId: null,
        endNodeId: null,
      },
    };
    return {
      definition: {...definition, nodes: [...definition.nodes, loopNode]},
      nodePositions: {...nodePositions, [loopNodeId]: {x: 500, y: 330}},
      loopNodeId,
      wrappedSelection: false,
    };
  }

  const memberNodeIds = [...selection.nodeIds];
  const continuationOutputNodeIds = loopOutputNodeIds(definition, memberNodeIds);
  const bounds = nodeBounds(graphNodes.filter((node) => selection.nodeIds.has(node.id)));
  const selectedRoot = definition.nodes.find((node) => node.id === selection.rootNodeId)!;
  const loopNode: FlowerNodeDefinition = {
    id: loopNodeId,
    name: `${FLOWER_CREATION_DEFAULTS.loop.namePrefix} ${loopNumber(loopNodeId)}`,
    draggable: FLOWER_CREATION_DEFAULTS.node.draggable,
    graphic: null,
    incoming: selection.rootNodeId === definition.rootNodeId
      ? undefined
      : structuredClone(nodeIncomingOrDefault(selectedRoot)),
    connections: selectedExternalConnections(definition, memberNodeIds),
    loop: {
      repeat: structuredClone(FLOWER_CREATION_DEFAULTS.loop.repeat),
      startNodeId: selection.rootNodeId,
      endNodeId: continuationOutputNodeIds[0] ?? selection.rootNodeId,
      memberNodeIds,
      continuationOutputNodeIds,
    },
  };
  return {
    definition: {
      ...definition,
      rootNodeId: selection.rootNodeId === definition.rootNodeId ? loopNodeId : definition.rootNodeId,
      nodes: [
        ...definition.nodes.map((candidate) => ({
          ...candidate,
          connections: candidate.connections
            .filter((connection) => !selection.nodeIds.has(candidate.id)
              || selection.nodeIds.has(connection.childId))
            .map((connection) => connection.childId === selection.rootNodeId
              ? {...connection, childId: loopNodeId}
              : connection),
        })),
        loopNode,
      ],
    },
    nodePositions: {...nodePositions, [loopNodeId]: bounds},
    loopNodeId,
    wrappedSelection: true,
  };
}

function nextLoopNodeId(definition: FlowerDefinition): string {
  const existing = new Set(definition.nodes.map((node) => node.id));
  let index = 1;
  while (existing.has(`loop-${index}`)) index++;
  return `loop-${index}`;
}

function loopNumber(loopNodeId: string): number {
  return Number(loopNodeId.slice('loop-'.length));
}
