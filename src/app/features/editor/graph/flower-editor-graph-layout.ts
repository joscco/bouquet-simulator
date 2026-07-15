import {FlowerDefinition, FlowerNodeDefinition} from '../../../core/models/flower.models';
import {effectiveConnection} from '../../../core/models/flower-connections';
import {activeLoopOutputNodeIds} from '../domain/flower-editor-loops';
import {componentOutputIds, createGraphEdges, createOutputPorts} from './flower-editor-graph-edges';
import {GraphLayout, GraphNode, Point} from './flower-editor-graph-types';
import {layoutLoopFrames, loopMemberIds} from './flower-editor-loop-layout';
import {COMPACT_LEVEL_GAP} from './flower-editor-tree-geometry';
import {resolveFlowerEditorForest} from '../domain/flower-editor-roots';

export function materializePositions(definition: FlowerDefinition): Record<string, Point> {
  const layout = createGraphLayout(definition, definition.editor?.nodePositions ?? {});
  return Object.fromEntries(layout.nodes.map((node) => [node.id, {x: node.x, y: node.y}]));
}

export function createGraphLayout(
  definition: FlowerDefinition,
  storedPositions: Record<string, Point>,
): GraphLayout {
  const width = 1000;
  const levels = graphLevels(definition);
  const maxLevel = Math.max(1, ...levels.values());
  const allNodesStored = definition.nodes.every((node) => !!storedPositions[node.id]);
  const storedBottom = Math.max(0, ...definition.nodes.map((node) => {
    const position = storedPositions[node.id];
    const nodeHeight = node.loop ? 170 : node.component ? 88 : 78;
    return position ? position.y + nodeHeight / 2 + 80 : 0;
  }));
  const height = Math.max(
    1000,
    storedBottom,
    allNodesStored ? 0 : maxLevel * COMPACT_LEVEL_GAP + 240,
  );
  const graphNodes = createGraphNodes(definition, storedPositions, levels, width, height);
  const loopDepths = layoutLoopFrames(definition, graphNodes, storedPositions);
  graphNodes.sort((first, second) => {
    if (first.loop !== second.loop) return Number(second.loop) - Number(first.loop);
    if (!first.loop) return 0;
    // Paint outer frames first so nested frames remain visible on top.
    return (loopDepths.get(first.id) ?? 0) - (loopDepths.get(second.id) ?? 0);
  });
  graphNodes.forEach((node) => node.outputPorts = createOutputPorts(node));
  return {
    nodes: graphNodes,
    edges: createGraphEdges(definition, graphNodes),
    width,
    height,
  };
}

function graphLevels(definition: FlowerDefinition): Map<string, number> {
  const roots = resolveFlowerEditorForest(definition).rootCandidateIds;
  const levels = new Map<string, number>(roots.map((id) => [id, 0]));
  for (let pass = 0; pass < definition.nodes.length; pass++) {
    for (const node of definition.nodes) {
      const level = levels.get(node.id);
      if (level === undefined) continue;
      if (node.loop?.startNodeId && !levels.has(node.loop.startNodeId)) {
        levels.set(node.loop.startNodeId, level + 1);
      }
      for (const legacyConnection of node.connections) {
        const connection = effectiveConnection(definition, legacyConnection);
        if (!levels.has(connection.childId)) levels.set(connection.childId, level + 1);
      }
    }
  }
  const connectedMax = Math.max(0, ...levels.values());
  for (const node of definition.nodes) {
    if (!levels.has(node.id)) levels.set(node.id, connectedMax + 1);
  }
  return levels;
}

function createGraphNodes(
  definition: FlowerDefinition,
  storedPositions: Record<string, Point>,
  levels: Map<string, number>,
  width: number,
  height: number,
): GraphNode[] {
  const groups = new Map<number, FlowerNodeDefinition[]>();
  for (const node of definition.nodes) {
    const level = levels.get(node.id)!;
    groups.set(level, [...(groups.get(level) ?? []), node]);
  }
  const internalNodeIds = new Set(definition.nodes
    .filter((node) => node.loop)
    .flatMap((node) => loopMemberIds(definition, node)));
  const graphNodes: GraphNode[] = [];
  for (const [level, nodes] of groups) {
    const outerNodes = nodes.filter((node) => !internalNodeIds.has(node.id));
    const gap = width / (outerNodes.length + 1);
    let outerIndex = 0;
    nodes.forEach((node) => {
      const fallbackX = internalNodeIds.has(node.id) ? width / 2 : gap * (++outerIndex);
      const fallback = {x: fallbackX, y: height - 80 - level * COMPACT_LEVEL_GAP};
      const position = storedPositions[node.id] ?? fallback;
      const loopOutputIds = node.loop ? activeLoopOutputNodeIds(definition, node) : [];
      graphNodes.push({
        id: node.id,
        name: node.name,
        x: position.x,
        y: position.y,
        root: node.id === definition.rootNodeId,
        hasGraphic: !!node.graphic,
        component: !!node.component,
        componentNodeCount: node.component?.nodes?.length ?? 0,
        componentOutputCount: node.component?.nodes
          ? componentOutputIds(node.component.nodes, node.component.outputNodeIds).length
          : 0,
        loop: !!node.loop,
        loopStartName: definition.nodes.find((candidate) =>
          candidate.id === node.loop?.startNodeId)?.name ?? 'Start wählen',
        loopEndName: definition.nodes.find((candidate) =>
          candidate.id === node.loop?.endNodeId)?.name ?? 'Ende wählen',
        loopMember: false,
        memberIds: [],
        width: node.loop ? 260 : node.component ? 196 : 172,
        height: node.loop ? 170 : node.component ? 88 : 78,
        outputPorts: [],
        outputPortLabels: loopOutputIds.map((_, index) => String(index + 1)),
        outputPortNames: loopOutputIds.map((id) =>
          definition.nodes.find((candidate) => candidate.id === id)?.name ?? id),
        outputPortNodeIds: loopOutputIds,
      });
    });
  }
  return graphNodes;
}
