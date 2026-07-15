import {FlowerDefinition, FlowerNodeDefinition} from '../../../core/models/flower.models';
import {effectiveConnection} from '../../../core/models/flower-connections';
import {GraphNode, Point} from './flower-editor-graph-types';
import {graphDepths, measureSubtree, placeSubtree} from './flower-editor-tree-geometry';

export function layoutLoopFrames(
  definition: FlowerDefinition,
  graphNodes: GraphNode[],
  storedPositions: Record<string, Point>,
): Map<string, number> {
  const loopDefinitions = definition.nodes.filter((node) => node.loop);
  const loopDepths = new Map(loopDefinitions.map((node) => [
    node.id,
    loopNestingDepth(definition, node.id),
  ]));

  // Inner frames must reach their final bounds before an enclosing frame is measured around them.
  for (const definitionNode of [...loopDefinitions]
    .sort((first, second) => (loopDepths.get(second.id) ?? 0) - (loopDepths.get(first.id) ?? 0))) {
    const loopNode = graphNodes.find((node) => node.id === definitionNode.id);
    if (!loopNode || !definitionNode.loop) continue;
    const memberIds = loopMemberIds(definition, definitionNode);
    const members = memberIds
      .map((id) => graphNodes.find((node) => node.id === id))
      .filter((node): node is GraphNode => !!node);
    if (!members.length) continue;
    if (!members.every((member) => !!storedPositions[member.id])) {
      arrangeLoopMembers(definition, definitionNode, loopNode, members, graphNodes);
    }
    const paddingX = 42;
    const paddingY = 68;
    const left = Math.min(...members.map((member) => member.x - member.width / 2)) - paddingX;
    const right = Math.max(...members.map((member) => member.x + member.width / 2)) + paddingX;
    const top = Math.min(...members.map((member) => member.y - member.height / 2)) - paddingY;
    const bottom = Math.max(...members.map((member) => member.y + member.height / 2)) + paddingY;
    loopNode.x = (left + right) / 2;
    loopNode.y = (top + bottom) / 2;
    loopNode.width = Math.max(260, right - left);
    loopNode.height = Math.max(180, bottom - top);
    loopNode.memberIds = memberIds;
    members.forEach((member) => member.loopMember = true);
    loopNode.outputPortNodeIds.forEach((outputId, index) => {
      const outputNode = graphNodes.find((node) => node.id === outputId);
      if (!outputNode) return;
      const label = String(index + 1);
      outputNode.outputPortLabels = outputNode.outputPortLabels.includes(label)
        ? outputNode.outputPortLabels
        : [...outputNode.outputPortLabels, label];
    });
  }
  return loopDepths;
}

export function loopMemberIds(definition: FlowerDefinition, node: FlowerNodeDefinition): string[] {
  if (!node.loop) return [];
  const ids = new Set(definition.nodes.map((candidate) => candidate.id));
  const members = [...new Set(node.loop.memberNodeIds ?? [])].filter((id) => ids.has(id));
  if (members.length) return members;
  if (node.loop.startNodeId && node.loop.endNodeId) {
    return templatePath(definition, node.loop.startNodeId, node.loop.endNodeId);
  }
  return [];
}

function arrangeLoopMembers(
  definition: FlowerDefinition,
  definitionNode: FlowerNodeDefinition,
  loopNode: GraphNode,
  members: GraphNode[],
  graphNodes: GraphNode[],
): void {
  const memberIds = new Set(members.map((member) => member.id));
  const memberNodes = new Map(members.map((member) => [member.id, member]));
  const definitionNodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  for (const member of members) {
    children.set(member.id, [...new Set((definitionNodes.get(member.id)?.connections ?? [])
      .map((connection) => effectiveConnection(definition, connection).childId)
      .filter((id) => memberIds.has(id)))]);
  }
  const incoming = new Set([...children.values()].flat());
  const roots = [
    ...(definitionNode.loop?.startNodeId && memberIds.has(definitionNode.loop.startNodeId)
      ? [definitionNode.loop.startNodeId]
      : []),
    ...members.filter((member) => !incoming.has(member.id)).map((member) => member.id),
    ...members.map((member) => member.id),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  const depths = graphDepths(roots, children);
  const maximumDepth = Math.max(0, ...depths.values());
  const levelHeights = new Map<number, number>();
  for (const member of members) {
    const depth = depths.get(member.id) ?? 0;
    levelHeights.set(depth, Math.max(levelHeights.get(depth) ?? 0, member.height));
  }
  const levelY = new Map<number, number>([[0, 0]]);
  for (let depth = 1; depth <= maximumDepth; depth++) {
    const previousHeight = levelHeights.get(depth - 1) ?? 78;
    const currentHeight = levelHeights.get(depth) ?? 78;
    levelY.set(depth, levelY.get(depth - 1)! - previousHeight / 2 - 54 - currentHeight / 2);
  }

  const positioned = new Map<string, Point>();
  const visited = new Set<string>();
  let cursor = 0;
  for (const rootId of roots) {
    if (visited.has(rootId)) continue;
    const subtreeWidth = measureSubtree(rootId, children, memberNodes, new Set());
    placeSubtree(rootId, 0, cursor, subtreeWidth, levelY, children, memberNodes, positioned, visited);
    cursor = Math.max(cursor + subtreeWidth, ...[...positioned].map(([id, point]) =>
      point.x + (memberNodes.get(id)?.width ?? 0) / 2)) + 52;
  }

  const left = Math.min(...[...positioned].map(([id, point]) =>
    point.x - (memberNodes.get(id)?.width ?? 0) / 2));
  const right = Math.max(...[...positioned].map(([id, point]) =>
    point.x + (memberNodes.get(id)?.width ?? 0) / 2));
  const top = Math.min(...[...positioned].map(([id, point]) =>
    point.y - (memberNodes.get(id)?.height ?? 0) / 2));
  const bottom = Math.max(...[...positioned].map(([id, point]) =>
    point.y + (memberNodes.get(id)?.height ?? 0) / 2));
  const offset = {
    x: loopNode.x - (left + right) / 2,
    y: loopNode.y - (top + bottom) / 2,
  };
  for (const member of members) {
    const target = positioned.get(member.id);
    if (!target) continue;
    translateGraphNodeGroups(
      [member],
      target.x + offset.x - member.x,
      target.y + offset.y - member.y,
      graphNodes,
    );
  }
}

function loopNestingDepth(definition: FlowerDefinition, loopId: string): number {
  let depth = 0;
  let currentId = loopId;
  const visited = new Set<string>();
  while (!visited.has(currentId)) {
    visited.add(currentId);
    const owner = definition.nodes.find((node) => node.loop?.memberNodeIds?.includes(currentId));
    if (!owner) break;
    depth += 1;
    currentId = owner.id;
  }
  return depth;
}

function translateGraphNodeGroups(
  roots: GraphNode[],
  deltaX: number,
  deltaY: number,
  graphNodes: GraphNode[],
): void {
  const nodes = new Map(graphNodes.map((node) => [node.id, node]));
  const pending = roots.map((root) => root.id);
  const moved = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (moved.has(id)) continue;
    moved.add(id);
    const node = nodes.get(id);
    if (!node) continue;
    node.x += deltaX;
    node.y += deltaY;
    pending.push(...node.memberIds);
  }
}

function templatePath(
  definition: FlowerDefinition,
  startNodeId: string,
  endNodeId: string,
): string[] {
  if (startNodeId === endNodeId) return [startNodeId];
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const visit = (id: string): string[] | null => {
    if (visited.has(id)) return null;
    visited.add(id);
    for (const legacyConnection of nodes.get(id)?.connections ?? []) {
      const connection = effectiveConnection(definition, legacyConnection);
      if (connection.childId === endNodeId) return [id, endNodeId];
      const remainder = visit(connection.childId);
      if (remainder) return [id, ...remainder];
    }
    return null;
  };
  return visit(startNodeId) ?? [];
}
