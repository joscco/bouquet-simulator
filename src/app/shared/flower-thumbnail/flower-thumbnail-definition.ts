import {FlowerDefinition} from '../../core/models/flower.models';

/** Makes a component's incoming root segment visible in a standalone preview. */
export function flowerDefinitionWithPreviewAnchor(definition: FlowerDefinition): FlowerDefinition {
  const root = definition.nodes.find((node) => node.id === definition.rootNodeId);
  if (!root?.incoming) return definition;

  const occupiedIds = new Set(definition.nodes.map((node) => node.id));
  let anchorId = '__thumbnail-root__';
  while (occupiedIds.has(anchorId)) anchorId += '_';
  return {
    ...definition,
    rootNodeId: anchorId,
    nodes: [{
      id: anchorId,
      name: '',
      draggable: false,
      graphic: null,
      connections: [{childId: root.id}],
    }, ...definition.nodes],
  };
}
