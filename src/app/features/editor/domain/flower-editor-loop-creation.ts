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
      name: `Wiederholung ${loopNumber(loopNodeId)}`,
      draggable: false,
      graphic: null,
      incoming: structuredClone(DEFAULT_INCOMING_CONNECTION),
      connections: [],
      loop: {repeat: {min: 2, max: 4}, startNodeId: null, endNodeId: null},
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
    name: `Wiederholung ${loopNumber(loopNodeId)}`,
    draggable: false,
    graphic: null,
    incoming: selection.rootNodeId === definition.rootNodeId
      ? undefined
      : structuredClone(nodeIncomingOrDefault(selectedRoot)),
    connections: selectedExternalConnections(definition, memberNodeIds),
    loop: {
      repeat: {min: 2, max: 4},
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
