import {FlowerNodeComponent} from '../models/flower.models';

export function componentMatches(
  component: FlowerNodeComponent | undefined,
  id: string,
  matchSourceDefinition: boolean,
): boolean {
  if (!component) return false;
  if (component.id === id || (matchSourceDefinition && component.sourceDefinitionId === id)) return true;
  return (component.nodes ?? []).some((node) => componentMatches(node.component, id, matchSourceDefinition));
}
