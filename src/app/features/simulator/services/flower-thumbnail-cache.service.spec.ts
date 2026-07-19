import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from '../../../core/models/flower.models';
import {FlowerThumbnailCache} from '../../../shared/flower-thumbnail/flower-thumbnail-cache.service';

describe('flower thumbnail cache', () => {
  it('reuses snapshots until the definition changes', () => {
    const cache = new FlowerThumbnailCache();
    const definition = flowerDefinition();
    const key = cache.keyFor(definition);

    cache.store(key, 'data:image/png;base64,cHJldmlldw==');

    expect(cache.snapshot(cache.keyFor(structuredClone(definition)))).toBe('data:image/png;base64,cHJldmlldw==');
    expect(cache.keyFor({...definition, name: 'Geänderte Blume'})).not.toBe(key);
    expect(cache.snapshot(cache.keyFor({...definition, name: 'Geänderte Blume'}))).toBeNull();
  });

  it('ignores invalid snapshot data', () => {
    const cache = new FlowerThumbnailCache();
    const key = cache.keyFor(flowerDefinition());

    cache.store(key, 'not-an-image');

    expect(cache.snapshot(key)).toBeNull();
  });

  it('falls back when a stored or bundled image cannot be loaded', () => {
    const cache = new FlowerThumbnailCache();
    const key = cache.keyFor(flowerDefinition());
    cache.store(key, 'data:image/png;base64,cHJldmlldw==');

    cache.markMissing(key);

    expect(cache.snapshot(key)).toBeNull();
    expect(cache.status(key)).toBe('missing');
  });
});

function flowerDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'preview',
    name: 'Vorschau',
    rootNodeId: 'root',
    stem: {color: '#008000', highlightColor: '#00a000', width: 4, taper: 0.8},
    nodes: [{id: 'root', name: 'Wurzel', draggable: false, graphic: null, connections: []}],
  };
}
