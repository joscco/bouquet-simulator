import {describe, expect, it} from 'vitest';
import {FlowerThumbnailRenderQueue} from './flower-thumbnail-render-queue.service';

describe('FlowerThumbnailRenderQueue', () => {
  it('limits concurrent WebGL renders and promotes queued thumbnails', () => {
    const queue = new FlowerThumbnailRenderQueue();

    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');

    expect([...queue.activeRequests()]).toEqual(['first']);

    queue.cancel('first');

    expect([...queue.activeRequests()]).toEqual(['second']);
  });

  it('removes queued requests when their thumbnail is destroyed', () => {
    const queue = new FlowerThumbnailRenderQueue();
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');

    queue.cancel('third');
    queue.cancel('first');

    expect([...queue.activeRequests()]).toEqual(['second']);
  });
});
