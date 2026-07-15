import {FlowerDefinition, FlowerNodeDefinition} from './flower.models';
import {createFlowerDefinitionComponent} from './flower-subtree';

export function materializeDefinitionComponents(
  definitions: FlowerDefinition[],
): FlowerDefinition[] {
  const definitionsById = new Map<string, FlowerDefinition>();
  for (const definition of definitions) {
    if (!definitionsById.has(definition.id)) definitionsById.set(definition.id, definition);
  }
  return definitions.map((definition) =>
    materializeDefinitionComponentReferences(definition, definitionsById, new Set([definition.id])));
}

function materializeDefinitionComponentReferences(
  definition: FlowerDefinition,
  definitionsById: Map<string, FlowerDefinition>,
  definitionStack: Set<string>,
): FlowerDefinition {
  return {
    ...structuredClone(definition),
    nodes: definition.nodes.map((node) =>
      materializeComponentReferencesInNode(node, definitionsById, definitionStack)),
  };
}

function materializeComponentReferencesInNode(
  node: FlowerNodeDefinition,
  definitionsById: Map<string, FlowerDefinition>,
  definitionStack: Set<string>,
): FlowerNodeDefinition {
  const clone = structuredClone(node);
  if (!clone.component) return clone;

  const sourceDefinitionId = clone.component.sourceDefinitionId;
  const sourceDefinition = sourceDefinitionId ? definitionsById.get(sourceDefinitionId) : undefined;
  if (sourceDefinition && !definitionStack.has(sourceDefinition.id)) {
    const resolvedSource = materializeDefinitionComponentReferences(
      sourceDefinition,
      definitionsById,
      new Set([...definitionStack, sourceDefinition.id]),
    );
    clone.component = createFlowerDefinitionComponent(resolvedSource);
    return clone;
  }

  clone.component = {
    ...clone.component,
    nodes: (clone.component.nodes ?? []).map((innerNode) =>
      materializeComponentReferencesInNode(innerNode, definitionsById, definitionStack)),
  };
  return clone;
}
