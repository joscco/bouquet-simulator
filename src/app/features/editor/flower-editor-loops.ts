import {FlowerDefinition, FlowerNodeDefinition} from '../../core/models/flower.models';
import {effectiveConnection} from '../../core/models/flower-connections';

export interface LoopMembershipUpdate {
  definition: FlowerDefinition;
  loopId: string | null;
  addedNodeIds: string[];
}

/**
 * Returns the visible outputs of a member-based loop. A member is an output
 * when it already points outside the loop or when it is an internal leaf.
 */
export function loopOutputNodeIds(
  definition: FlowerDefinition,
  memberNodeIds: string[],
): string[] {
  const members = new Set(memberNodeIds);
  const externalParents = definition.nodes
    .filter((node) => members.has(node.id))
    .filter((node) => node.connections.some((connection) =>
      !members.has(effectiveConnection(definition, connection).childId)))
    .map((node) => node.id);
  const internalParents = new Set(definition.nodes
    .filter((node) => members.has(node.id))
    .flatMap((node) => node.connections
      .filter((connection) => members.has(effectiveConnection(definition, connection).childId))
      .map(() => node.id)));
  const leaves = definition.nodes
    .filter((node) => members.has(node.id) && !internalParents.has(node.id))
    .map((node) => node.id);
  return [...new Set([...externalParents, ...leaves])];
}

/**
 * A connection that starts inside a loop should extend that loop instead of
 * silently creating a branch that the loop renderer ignores. The connected
 * ordinary subtree is absorbed as one unit so prebuilt branches keep working.
 */
export function absorbConnectedSubtreeIntoLoop(
  definition: FlowerDefinition,
  sourceId: string,
  targetId: string,
): LoopMembershipUpdate {
  const owner = definition.nodes.find((node) =>
    node.loop?.memberNodeIds?.includes(sourceId));
  const currentMembers = owner?.loop?.memberNodeIds;
  if (!owner?.loop || !currentMembers?.length || currentMembers.includes(targetId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const target = nodes.get(targetId);
  if (!target || target.loop || targetId === definition.rootNodeId) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const membersOfOtherLoops = new Set(definition.nodes
    .filter((node) => node.id !== owner.id)
    .flatMap((node) => node.loop?.memberNodeIds ?? []));
  if (membersOfOtherLoops.has(targetId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const existing = new Set(currentMembers);
  const addedNodeIds: string[] = [];
  const pending = [targetId];
  while (pending.length) {
    const id = pending.pop()!;
    if (existing.has(id) || addedNodeIds.includes(id)) continue;
    const node = nodes.get(id);
    if (
      !node
      || node.loop
      || id === owner.id
      || id === definition.rootNodeId
      || membersOfOtherLoops.has(id)
    ) {
      continue;
    }
    addedNodeIds.push(id);
    for (const connection of node.connections) {
      pending.push(effectiveConnection(definition, connection).childId);
    }
  }

  if (!addedNodeIds.includes(targetId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const memberNodeIds = [...currentMembers, ...addedNodeIds];
  const provisional: FlowerDefinition = {
    ...definition,
    nodes: definition.nodes.map((node) => node.id === owner.id && node.loop
      ? {
          ...node,
          connections: node.connections.filter((connection) =>
            !memberNodeIds.includes(effectiveConnection(definition, connection).childId)),
          loop: {...node.loop, memberNodeIds},
        }
      : node),
  };
  const continuationOutputNodeIds = loopOutputNodeIds(provisional, memberNodeIds);
  const nextDefinition: FlowerDefinition = {
    ...provisional,
    nodes: provisional.nodes.map((node) => node.id === owner.id && node.loop
      ? {
          ...node,
          loop: {
            ...node.loop,
            memberNodeIds,
            continuationOutputNodeIds,
            endNodeId: continuationOutputNodeIds[0] ?? node.loop.endNodeId,
          },
        }
      : node),
  };

  return {definition: nextDefinition, loopId: owner.id, addedNodeIds};
}

export function activeLoopOutputNodeIds(
  definition: FlowerDefinition,
  node: FlowerNodeDefinition,
): string[] {
  const members = node.loop?.memberNodeIds ?? [];
  if (!members.length) return [];
  const possible = loopOutputNodeIds(definition, members);
  const preferred = node.loop?.continuationOutputNodeIds?.filter((id) => possible.includes(id)) ?? [];
  return preferred.length ? preferred : possible;
}
