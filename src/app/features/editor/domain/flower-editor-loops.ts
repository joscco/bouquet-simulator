import {
  FlowerDefinition,
  FlowerNodeDefinition,
  FlowerNodeIncomingConnection,
  ResolvedFlowerNodeConnection,
} from '../../../core/models/flower.models';
import {effectiveConnection, incomingConnectionReference} from '../../../core/models/flower-connections';

export interface LoopMembershipUpdate {
  definition: FlowerDefinition;
  loopId: string | null;
  addedNodeIds: string[];
}

export interface LoopMembershipPrune {
  definition: FlowerDefinition;
  removedNodeIds: string[];
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
 * Nimmt den ersten Knoten in eine noch leere Wiederholung auf. Ein bestehender
 * Elternanschluss des Knotens wird auf den Schleifenrahmen umgebogen; seine
 * bisherigen Kinder bleiben als Ausgänge außerhalb der Ein-Knoten-Schleife.
 */
export function initializeEmptyLoopWithNode(
  definition: FlowerDefinition,
  loopId: string,
  targetId: string,
): LoopMembershipUpdate {
  const owner = definition.nodes.find((node) => node.id === loopId);
  const target = definition.nodes.find((node) => node.id === targetId);
  if (
    !owner?.loop
    || (owner.loop.memberNodeIds?.length ?? 0) > 0
    || !target
    || targetId === loopId
  ) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const memberOfOtherLoop = definition.nodes.some((node) =>
    node.id !== loopId && node.loop?.memberNodeIds?.includes(targetId));
  if (memberOfOtherLoop || hasConnectionPath(definition, targetId, loopId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const ownerParent = incomingConnectionReference(definition, loopId);
  const targetParent = incomingConnectionReference(definition, targetId);
  if (ownerParent && targetParent && targetParent.sourceId !== loopId) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const targetIncoming = target.incoming ?? (targetParent
    ? incomingWithoutChildId(targetParent.connection)
    : undefined);
  const outgoingConnections = uniqueConnections(definition, [
    ...owner.connections.filter((connection) =>
      effectiveConnection(definition, connection).childId !== targetId),
    ...target.connections,
  ]);

  const nextDefinition: FlowerDefinition = {
    ...definition,
    nodes: definition.nodes.map((node) => {
      if (node.id === loopId && node.loop) {
        return {
          ...node,
          incoming: ownerParent || !targetIncoming ? node.incoming : targetIncoming,
          connections: outgoingConnections,
          loop: {
            ...node.loop,
            startNodeId: targetId,
            endNodeId: targetId,
            memberNodeIds: [targetId],
            continuationOutputNodeIds: [targetId],
          },
        };
      }
      if (node.id === targetId) return {...node, connections: []};
      if (!ownerParent && targetParent && node.id === targetParent.sourceId) {
        return {
          ...node,
          connections: node.connections.map((connection) =>
            effectiveConnection(definition, connection).childId === targetId
              ? {...connection, childId: loopId}
              : connection),
        };
      }
      return node;
    }),
  };
  return {definition: nextDefinition, loopId, addedNodeIds: [targetId]};
}

/**
 * Extends a loop in either direction. A connection from a member absorbs the
 * appended target subtree. A connection from an outside subtree to a member
 * prepends that subtree and turns its root into the new loop start.
 */
export function absorbConnectedSubtreeIntoLoop(
  definition: FlowerDefinition,
  sourceId: string,
  targetId: string,
): LoopMembershipUpdate {
  const sourceOwner = definition.nodes.find((node) =>
    node.loop?.memberNodeIds?.includes(sourceId));
  const targetOwner = definition.nodes.find((node) =>
    node.loop?.memberNodeIds?.includes(targetId));
  const prepend = !sourceOwner && !!targetOwner;
  const owner = sourceOwner ?? targetOwner;
  const currentMembers = owner?.loop?.memberNodeIds;
  if (
    !owner?.loop
    || !currentMembers?.length
    || (!!sourceOwner && currentMembers.includes(targetId))
    || (prepend && currentMembers.includes(sourceId))
  ) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const subtreeRootId = prepend ? sourceId : targetId;
  const subtreeRoot = nodes.get(subtreeRootId);
  if (!subtreeRoot) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const membersOfOtherLoops = new Set(definition.nodes
    .filter((node) => node.id !== owner.id)
    .flatMap((node) => node.loop?.memberNodeIds ?? []));
  if (membersOfOtherLoops.has(subtreeRootId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const existing = new Set(currentMembers);
  const addedNodeIds: string[] = [];
  const pending = [subtreeRootId];
  while (pending.length) {
    const id = pending.pop()!;
    if (existing.has(id) || addedNodeIds.includes(id)) continue;
    const node = nodes.get(id);
    if (
      !node
      || id === owner.id
      || membersOfOtherLoops.has(id)
    ) {
      continue;
    }
    addedNodeIds.push(id);
    // A nested loop is one member of the outer loop. Its own members keep
    // belonging exclusively to the nested loop and must not be flattened.
    if (node.loop) continue;
    for (const connection of node.connections) {
      pending.push(effectiveConnection(definition, connection).childId);
    }
  }

  if (!addedNodeIds.includes(subtreeRootId)) {
    return {definition, loopId: null, addedNodeIds: []};
  }

  const memberNodeIds = prepend
    ? [...addedNodeIds, ...currentMembers]
    : [...currentMembers, ...addedNodeIds];
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
  const possibleOutputNodeIds = loopOutputNodeIds(provisional, memberNodeIds);
  const retainedOutputNodeIds = (owner.loop.continuationOutputNodeIds ?? [])
    .filter((id) => possibleOutputNodeIds.includes(id));
  const addedOutputNodeIds = possibleOutputNodeIds.filter((id) => addedNodeIds.includes(id));
  const continuationOutputNodeIds = [...new Set([
    ...retainedOutputNodeIds,
    ...addedOutputNodeIds,
  ])];
  if (!continuationOutputNodeIds.length) {
    continuationOutputNodeIds.push(...possibleOutputNodeIds);
  }
  const nextDefinition: FlowerDefinition = {
    ...provisional,
    nodes: provisional.nodes.map((node) => node.id === owner.id && node.loop
      ? {
          ...node,
          loop: {
            ...node.loop,
            startNodeId: prepend ? sourceId : node.loop.startNodeId,
            memberNodeIds,
            continuationOutputNodeIds,
            endNodeId: continuationOutputNodeIds[0] ?? node.loop.endNodeId,
          },
        }
      : node),
  };

  return {definition: nextDefinition, loopId: owner.id, addedNodeIds};
}

function hasConnectionPath(
  definition: FlowerDefinition,
  startId: string,
  targetId: string,
  visited = new Set<string>(),
): boolean {
  if (startId === targetId) return true;
  if (visited.has(startId)) return false;
  visited.add(startId);
  const node = definition.nodes.find((candidate) => candidate.id === startId);
  return (node?.connections ?? []).some((connection) =>
    hasConnectionPath(definition, effectiveConnection(definition, connection).childId, targetId, visited));
}

function incomingWithoutChildId(
  connection: ResolvedFlowerNodeConnection,
): FlowerNodeIncomingConnection {
  const {childId: _childId, ...incoming} = structuredClone(connection);
  return incoming;
}

function uniqueConnections(
  definition: FlowerDefinition,
  connections: FlowerNodeDefinition['connections'],
): FlowerNodeDefinition['connections'] {
  const seen = new Set<string>();
  return connections.filter((connection) => {
    const childId = effectiveConnection(definition, connection).childId;
    if (seen.has(childId)) return false;
    seen.add(childId);
    return true;
  });
}

/**
 * Removes members that are no longer reachable from their loop start. New
 * members are still added explicitly by absorbConnectedSubtreeIntoLoop.
 */
export function pruneDisconnectedLoopMembers(
  definition: FlowerDefinition,
): LoopMembershipPrune {
  let nextDefinition = definition;
  const removedNodeIds: string[] = [];

  for (const originalOwner of definition.nodes.filter((node) => node.loop?.memberNodeIds?.length)) {
    const owner = nextDefinition.nodes.find((node) => node.id === originalOwner.id);
    const currentMembers = owner?.loop?.memberNodeIds ?? [];
    if (!owner?.loop || !currentMembers.length) continue;

    const nodes = new Map(nextDefinition.nodes.map((node) => [node.id, node]));
    const members = new Set(currentMembers.filter((id) => nodes.has(id)));
    const reachable = new Set<string>();
    const pending = owner.loop.startNodeId && members.has(owner.loop.startNodeId)
      ? [owner.loop.startNodeId]
      : [];
    while (pending.length) {
      const id = pending.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const connection of nodes.get(id)?.connections ?? []) {
        const targetId = effectiveConnection(nextDefinition, connection).childId;
        if (members.has(targetId)) pending.push(targetId);
      }
    }

    const memberNodeIds = currentMembers.filter((id) => reachable.has(id));
    removedNodeIds.push(...currentMembers.filter((id) => !reachable.has(id)));
    if (memberNodeIds.length === currentMembers.length) continue;

    const provisional: FlowerDefinition = {
      ...nextDefinition,
      nodes: nextDefinition.nodes.map((node) => node.id === owner.id && node.loop
        ? {...node, loop: {...node.loop, memberNodeIds}}
        : node),
    };
    const continuationOutputNodeIds = loopOutputNodeIds(provisional, memberNodeIds);
    nextDefinition = {
      ...provisional,
      nodes: provisional.nodes.map((node) => node.id === owner.id && node.loop
        ? {
            ...node,
            loop: {
              ...node.loop,
              startNodeId: memberNodeIds.includes(node.loop.startNodeId ?? '')
                ? node.loop.startNodeId
                : null,
              endNodeId: continuationOutputNodeIds[0] ?? null,
              memberNodeIds,
              continuationOutputNodeIds,
            },
          }
        : node),
    };
  }

  return {definition: nextDefinition, removedNodeIds: [...new Set(removedNodeIds)]};
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
