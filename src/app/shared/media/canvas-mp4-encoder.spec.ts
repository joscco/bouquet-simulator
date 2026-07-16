import {describe, expect, it} from 'vitest';
import {canvasVideoFrameTiming} from './canvas-mp4-encoder';

describe('canvas MP4 frame timing', () => {
  it('assigns every frame an exact constant-frame-rate timestamp and duration', () => {
    expect(canvasVideoFrameTiming(0, 30)).toEqual({timestamp: 0, duration: 1 / 30});
    expect(canvasVideoFrameTiming(179, 30)).toEqual({timestamp: 179 / 30, duration: 1 / 30});
  });
});
