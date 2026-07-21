import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from './default-flowers';
import {
  isDefaultFlowerDefinitionId,
  upsertBuiltInFlowerDefinition,
} from './default-flower-catalog';

describe('default flower catalog', () => {
  it('replaces an existing bundled definition while keeping the rest of the default catalog', () => {
    const source = structuredClone(DEFAULT_FLOWERS[0]!);
    source.name = `${source.name} bearbeitet`;

    const definitions = upsertBuiltInFlowerDefinition(source, DEFAULT_FLOWERS[0]!.id);

    expect(definitions).toHaveLength(DEFAULT_FLOWERS.length);
    expect(definitions.find((definition) => definition.id === source.id)?.name).toBe(source.name);
    expect(definitions[1]).toEqual(DEFAULT_FLOWERS[1]);
  });

  it('adds a newly authored flower to the bundled default catalog', () => {
    const source = structuredClone(DEFAULT_FLOWERS[0]!);
    source.id = 'lokal-neu-gebaut';
    source.name = 'Lokal neu gebaut';

    const definitions = upsertBuiltInFlowerDefinition(source, source.id);

    expect(definitions).toHaveLength(DEFAULT_FLOWERS.length + 1);
    expect(definitions.at(-1)?.id).toBe(source.id);
    expect(isDefaultFlowerDefinitionId(source.id)).toBe(false);
  });
});
