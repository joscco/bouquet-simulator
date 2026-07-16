import {
  FlowerDefinition,
  FlowerNodeDefinition,
} from '../../../core/models/flower.models';
import {clamp} from '../../../core/utils/numbers';
import {Point} from '../graph/flower-editor-graph';
import {pruneDisconnectedLoopMembers} from './flower-editor-loops';

export interface FlowerEditorNodeUpdate {
  definition: FlowerDefinition;
  positions: Record<string, Point>;
  selectedNodeId: string;
}

export function duplicateFlowerEditorNode(
  definition: FlowerDefinition,
  positions: Record<string, Point>,
  nodeId: string,
): FlowerEditorNodeUpdate | null {
  const source = definition.nodes.find((node) => node.id === nodeId);
  if (!source) return null;

  const existing = new Set(definition.nodes.map((node) => node.id));
  let suffix = 2;
  let id = `${source.id}-copy`;
  while (existing.has(id)) id = `${source.id}-copy-${suffix++}`;
  const node: FlowerNodeDefinition = {
    ...structuredClone(source),
    id,
    name: `${source.name} Kopie`,
    connections: [],
  };
  const sourcePosition = positions[source.id] ?? {x: 500, y: 300};

  return {
    definition: {...definition, nodes: [...definition.nodes, node]},
    positions: {
      ...positions,
      [id]: {
        x: clamp(sourcePosition.x + 44, 90, 910),
        y: clamp(sourcePosition.y - 54, 55, 625),
      },
    },
    selectedNodeId: id,
  };
}

export function removeFlowerEditorNode(
  definition: FlowerDefinition,
  positions: Record<string, Point>,
  nodeId: string,
): FlowerEditorNodeUpdate {
  const selectedNode = definition.nodes.find((node) => node.id === nodeId);
  const fallbackId = selectedNode?.loop?.startNodeId
    ?? selectedNode?.connections[0]?.childId
    ?? (definition.rootNodeId !== nodeId ? definition.rootNodeId : null)
    ?? definition.nodes.find((node) => node.id !== nodeId)?.id
    ?? '';
  const nextDefinition = pruneDisconnectedLoopMembers({
    ...definition,
    nodes: definition.nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({
        ...node,
        connections: node.connections.filter((connection) => connection.childId !== nodeId),
        loop: node.loop ? {
          ...node.loop,
          startNodeId: node.loop.startNodeId === nodeId ? null : node.loop.startNodeId,
          endNodeId: node.loop.endNodeId === nodeId ? null : node.loop.endNodeId,
          memberNodeIds: node.loop.memberNodeIds?.filter((memberId) => memberId !== nodeId),
          continuationOutputNodeIds: node.loop.continuationOutputNodeIds
            ?.filter((outputId) => outputId !== nodeId),
        } : undefined,
      })),
  }).definition;
  const nextPositions = {...positions};
  delete nextPositions[nodeId];

  return {
    definition: nextDefinition,
    positions: nextPositions,
    selectedNodeId: fallbackId,
  };
}
