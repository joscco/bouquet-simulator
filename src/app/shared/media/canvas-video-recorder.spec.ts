import {describe, expect, it} from 'vitest';
import {selectCanvasVideoMimeType} from './canvas-video-recorder';

describe('selectCanvasVideoMimeType', () => {
  it('prefers H.264 MP4 when the browser supports it', () => {
    expect(selectCanvasVideoMimeType(() => true)).toBe('video/mp4;codecs=avc1.42E01E');
  });

  it('falls back to VP9 WebM when MP4 is unavailable', () => {
    expect(selectCanvasVideoMimeType((mimeType) => mimeType.startsWith('video/webm')))
      .toBe('video/webm;codecs=vp9');
  });

  it('allows the MediaRecorder default when no preferred type is supported', () => {
    expect(selectCanvasVideoMimeType(() => false)).toBeUndefined();
  });
});
