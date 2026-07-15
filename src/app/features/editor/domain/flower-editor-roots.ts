import {effectiveConnection} from '../../../core/models/flower-connections';
import {FlowerDefinition} from '../../../core/models/flower.models';

export interface FlowerEditorForest {
  rootCandidateIds: string[];
  activeRootId: string | null;
  activeNodeIds: Set<string>;
}

/** Ermittelt die äußersten Wurzeln und den aktuell sichtbaren Baum. */
export function resolveFlowerEditorForest(
  definition: FlowerDefinition,
  preferredNodeId?: string | null,
): FlowerEditorForest {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const incoming = new Set(definition.nodes.flatMap((node) => node.connections
    .map((connection) => effectiveConnection(definition, connection).childId)
    .filter((id) => nodes.has(id))));
  const loopMembers = new Set(definition.nodes.flatMap((node) => node.loop?.memberNodeIds ?? []));
  const rootCandidateIds = definition.nodes
    .filter((node) => !incoming.has(node.id) && !loopMembers.has(node.id))
    .map((node) => node.id);
  const reachableByRoot = new Map(rootCandidateIds.map((id) => [
    id,
    reachableNodeIds(definition, id),
  ]));

  const preferredRoot = preferredNodeId
    ? rootCandidateIds.find((id) => reachableByRoot.get(id)?.has(preferredNodeId))
    : undefined;
  const storedRoot = rootCandidateIds.includes(definition.rootNodeId)
    ? definition.rootNodeId
    : undefined;
  const activeRootId = rootCandidateIds.length === 1
    ? rootCandidateIds[0]
    : preferredRoot ?? storedRoot ?? rootCandidateIds[0] ?? null;

  return {
    rootCandidateIds,
    activeRootId,
    activeNodeIds: activeRootId ? reachableByRoot.get(activeRootId) ?? new Set([activeRootId]) : new Set(),
  };
}

/** Aktualisiert nur den kompatibel serialisierten Zeiger auf die abgeleitete Aktivwurzel. */
export function withDerivedFlowerRoot(
  definition: FlowerDefinition,
  preferredNodeId?: string | null,
): FlowerDefinition {
  const activeRootId = resolveFlowerEditorForest(definition, preferredNodeId).activeRootId;
  const rootNodeId = activeRootId ?? '';
  return definition.rootNodeId === rootNodeId ? definition : {...definition, rootNodeId};
}

function reachableNodeIds(definition: FlowerDefinition, rootId: string): Set<string> {
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const reachable = new Set<string>();
  const pending = [rootId];
  while (pending.length) {
    const id = pending.pop()!;
    if (reachable.has(id)) continue;
    const node = nodes.get(id);
    if (!node) continue;
    reachable.add(id);
    pending.push(...node.connections.map((connection) =>
      effectiveConnection(definition, connection).childId));
    pending.push(...(node.loop?.memberNodeIds ?? []));
  }
  return reachable;
}
