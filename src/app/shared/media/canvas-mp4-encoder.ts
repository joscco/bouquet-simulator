import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';
import type {
  CanvasVideoRecording,
  CanvasVideoRecordingOptions,
} from './canvas-video-recorder';

const MP4_MIME_TYPE = 'video/mp4';
const DEFAULT_VIDEO_BIT_RATE = 8_000_000;

export function canEncodeCanvasMp4(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

export function canvasVideoFrameTiming(frame: number, fps: number): {
  timestamp: number;
  duration: number;
} {
  return {
    timestamp: frame / fps,
    duration: 1 / fps,
  };
}

export async function encodeCanvasMp4(
  canvas: HTMLCanvasElement,
  options: CanvasVideoRecordingOptions,
): Promise<CanvasVideoRecording> {
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({fastStart: 'in-memory'}),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: options.videoBitsPerSecond ?? DEFAULT_VIDEO_BIT_RATE,
    bitrateMode: 'variable',
    latencyMode: 'quality',
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, {frameRate: options.fps});

  try {
    await output.start();
    for (let frame = 0; frame < options.frames; frame += 1) {
      options.drawFrame(frame);
      const timing = canvasVideoFrameTiming(frame, options.fps);
      await videoSource.add(timing.timestamp, timing.duration);
      options.onProgress?.(Math.round((frame + 1) / options.frames * 100));
    }
    videoSource.close();
    await output.finalize();
  } catch (error: unknown) {
    if (output.state !== 'canceled' && output.state !== 'finalized') {
      await output.cancel().catch(() => undefined);
    }
    throw new Error('Das schnittkompatible MP4-Video konnte nicht kodiert werden.', {cause: error});
  }

  if (!target.buffer) throw new Error('Der MP4-Encoder hat keine Videodaten erzeugt.');
  return {
    blob: new Blob([target.buffer], {type: MP4_MIME_TYPE}),
    extension: 'mp4',
    mimeType: MP4_MIME_TYPE,
  };
}
