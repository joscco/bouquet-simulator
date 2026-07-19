import {
  FlowerDefinition,
  FlowerNodeComponent,
  FlowerNodeDefinition,
} from './flower.models';

/** Replaces a catalog definition and follows an optional change of its stable id. */
export function upsertFlowerDefinitionById(
  definitions: readonly FlowerDefinition[],
  definition: FlowerDefinition,
  previousId?: string,
): FlowerDefinition[] {
  const sourceId = previousId ?? definition.id;
  const replacement = renameDefinitionReferences(definition, sourceId, definition.id);
  let replaced = false;
  const next = definitions.map((candidate) => {
    if (candidate.id === sourceId) {
      replaced = true;
      return replacement;
    }
    return renameDefinitionReferences(candidate, sourceId, definition.id);
  });
  return replaced ? next : [...next, replacement];
}

export function definitionIdIsOccupied(
  definitions: readonly FlowerDefinition[],
  id: string,
  previousId?: string,
): boolean {
  return definitions.some((definition) => definition.id === id && definition.id !== previousId);
}

function renameDefinitionReferences(
  definition: FlowerDefinition,
  previousId: string,
  nextId: string,
): FlowerDefinition {
  if (previousId === nextId) return structuredClone(definition);
  return {
    ...structuredClone(definition),
    nodes: definition.nodes.map((node) => renameNodeReferences(node, previousId, nextId)),
  };
}

function renameNodeReferences(
  node: FlowerNodeDefinition,
  previousId: string,
  nextId: string,
): FlowerNodeDefinition {
  return {
    ...structuredClone(node),
    component: node.component
      ? renameComponentReferences(node.component, previousId, nextId)
      : undefined,
  };
}

function renameComponentReferences(
  component: FlowerNodeComponent,
  previousId: string,
  nextId: string,
): FlowerNodeComponent {
  return {
    ...structuredClone(component),
    id: component.id === previousId ? nextId : component.id,
    sourceDefinitionId: component.sourceDefinitionId === previousId
      ? nextId
      : component.sourceDefinitionId,
    nodes: component.nodes?.map((node) => renameNodeReferences(node, previousId, nextId)),
  };
}
