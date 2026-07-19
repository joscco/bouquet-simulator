import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  definitionIdIsOccupied,
  upsertFlowerDefinitionById,
} from './flower-definition-ids';

describe('flower definition ids', () => {
  it('replaces the old catalog entry and updates embedded references when an id changes', () => {
    const source = structuredClone(DEFAULT_FLOWERS[0]!);
    const consumer = structuredClone(DEFAULT_FLOWERS[1]!);
    consumer.nodes[0]!.component = {
      schemaVersion: 1,
      id: source.id,
      sourceDefinitionId: source.id,
      name: source.name,
      nodes: [],
    };
    const renamed = {...source, id: 'renamed-flower'};

    const definitions = upsertFlowerDefinitionById([source, consumer], renamed, source.id);

    expect(definitions.map((definition) => definition.id)).toEqual([
      'renamed-flower',
      consumer.id,
    ]);
    expect(definitions[1]!.nodes[0]!.component).toMatchObject({
      id: 'renamed-flower',
      sourceDefinitionId: 'renamed-flower',
    });
  });

  it('only treats ids belonging to another definition as occupied', () => {
    const definitions = DEFAULT_FLOWERS.slice(0, 2);

    expect(definitionIdIsOccupied(definitions, definitions[1]!.id, definitions[0]!.id)).toBe(true);
    expect(definitionIdIsOccupied(definitions, definitions[0]!.id, definitions[0]!.id)).toBe(false);
  });
});
