import {FlowerDefinition, FlowerNodeDefinition} from '../models/flower.models';

const COMPONENT_SEPARATOR = '::';

export function flattenFlowerTemplates(definition: FlowerDefinition): Map<string, FlowerNodeDefinition> {
  const templates = new Map<string, FlowerNodeDefinition>();
  for (const node of definition.nodes) {
    templates.set(node.id, node);
    if (node.component?.nodes) addComponentTemplates(templates, node.id, node.component.nodes);
  }
  return templates;
}

export function componentTemplateKey(ownerId: string, nodeId: string): string {
  return `${ownerId}${COMPONENT_SEPARATOR}${nodeId}`;
}

export function componentOutputNodeIds(componentTemplate: FlowerNodeDefinition): string[] {
  const component = componentTemplate.component;
  if (!component?.nodes) return [];
  const ids = new Set(component.nodes.map((node) => node.id));
  if (component.outputNodeIds !== undefined) {
    return [...new Set(component.outputNodeIds)].filter((id) => ids.has(id));
  }
  const parents = new Set(component.nodes.flatMap((node) =>
    node.connections
      .filter((connection) => ids.has(connection.childId))
      .map(() => node.id)));
  return component.nodes
    .filter((node) => !parents.has(node.id))
    .map((node) => node.id);
}

function addComponentTemplates(
  templates: Map<string, FlowerNodeDefinition>,
  ownerId: string,
  nodes: FlowerNodeDefinition[],
): void {
  const internalIds = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    const key = componentTemplateKey(ownerId, node.id);
    const clone: FlowerNodeDefinition = {
      ...structuredClone(node),
      id: key,
      connections: node.connections
        .filter((connection) => internalIds.has(connection.childId))
        .map((connection) => ({
          ...connection,
          childId: componentTemplateKey(ownerId, connection.childId),
        })),
      loop: node.loop ? {
        ...node.loop,
        startNodeId: node.loop.startNodeId && internalIds.has(node.loop.startNodeId)
          ? componentTemplateKey(ownerId, node.loop.startNodeId)
          : null,
        endNodeId: node.loop.endNodeId && internalIds.has(node.loop.endNodeId)
          ? componentTemplateKey(ownerId, node.loop.endNodeId)
          : null,
        memberNodeIds: node.loop.memberNodeIds
          ?.filter((id) => internalIds.has(id))
          .map((id) => componentTemplateKey(ownerId, id)),
        continuationOutputNodeIds: node.loop.continuationOutputNodeIds
          ?.filter((id) => internalIds.has(id))
          .map((id) => componentTemplateKey(ownerId, id)),
      } : undefined,
    };
    templates.set(key, clone);
    if (node.component?.nodes) addComponentTemplates(templates, key, node.component.nodes);
  }
}
