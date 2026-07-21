import {describe, expect, it} from 'vitest';
import {materializeDefinitionComponents} from '../models/flower-components';
import {flowerThumbnailKey} from '../../shared/flower-thumbnail/flower-thumbnail-key';
import {DEFAULT_FLOWER_PREVIEWS} from './default-flower-previews';
import {DEFAULT_FLOWERS} from './default-flowers';

describe('DEFAULT_FLOWER_PREVIEWS', () => {
  it('contains a content-addressed PNG for every materialized default definition', () => {
    const definitions = materializeDefinitionComponents(DEFAULT_FLOWERS);

    expect(Object.keys(DEFAULT_FLOWER_PREVIEWS).sort()).toEqual(
      definitions.map((definition) => definition.id).sort(),
    );
    for (const definition of definitions) {
      expect(DEFAULT_FLOWER_PREVIEWS[definition.id]).toEqual({
        key: flowerThumbnailKey(definition),
        url: `previews/${definition.id}.png`,
      });
    }
  });
});
