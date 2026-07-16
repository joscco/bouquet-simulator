import {canEncodeCanvasMp4, encodeCanvasMp4} from './canvas-mp4-encoder';

export interface CanvasVideoRecording {
  blob: Blob;
  extension: 'mp4' | 'webm';
  mimeType: string;
}

export interface CanvasVideoRecordingOptions {
  frames: number;
  fps: number;
  videoBitsPerSecond?: number;
  drawFrame: (frame: number) => void;
  onProgress?: (progressPercent: number) => void;
}

const MIME_TYPE_PREFERENCES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const;

export function canRecordCanvasVideo(): boolean {
  if (typeof HTMLCanvasElement === 'undefined') return false;
  return canEncodeCanvasMp4() || canRecordCanvasWithMediaRecorder();
}

export function selectCanvasVideoMimeType(
  isSupported: (mimeType: string) => boolean,
): string | undefined {
  return MIME_TYPE_PREFERENCES.find(isSupported);
}

export async function recordCanvasVideo(
  canvas: HTMLCanvasElement,
  options: CanvasVideoRecordingOptions,
): Promise<CanvasVideoRecording> {
  if (!Number.isInteger(options.frames) || options.frames <= 0 || options.fps <= 0) {
    throw new Error('Ungültige Einstellungen für die Videoaufnahme.');
  }
  if (canEncodeCanvasMp4()) return encodeCanvasMp4(canvas, options);
  if (!canRecordCanvasWithMediaRecorder()) {
    throw new Error('Dieser Browser unterstützt keine Videoaufnahme aus dem 3D-Canvas.');
  }
  return recordCanvasWithMediaRecorder(canvas, options);
}

async function recordCanvasWithMediaRecorder(
  canvas: HTMLCanvasElement,
  options: CanvasVideoRecordingOptions,
): Promise<CanvasVideoRecording> {
  const mimeType = selectCanvasVideoMimeType((candidate) => MediaRecorder.isTypeSupported(candidate));
  const stream = canvas.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  if (!videoTrack) throw new Error('Der 3D-Canvas konnte nicht als Videospur geöffnet werden.');
  if (typeof videoTrack.requestFrame !== 'function') {
    for (const track of stream.getTracks()) track.stop();
    throw new Error('Dieser Browser unterstützt keine framegenaue Canvas-Videoaufnahme.');
  }

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? {mimeType} : {}),
      videoBitsPerSecond: options.videoBitsPerSecond ?? 8_000_000,
    });
  } catch {
    for (const track of stream.getTracks()) track.stop();
    throw new Error('Der Browser konnte den Video-Encoder nicht starten.');
  }
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => resolve(), {once: true});
    recorder.addEventListener('error', () => reject(new Error('Die Browser-Videoaufnahme ist fehlgeschlagen.')), {
      once: true,
    });
  });

  const frameDuration = 1000 / options.fps;
  const startedAt = performance.now();
  let started = false;
  try {
    recorder.start();
    started = true;
    for (let frame = 0; frame < options.frames; frame += 1) {
      options.drawFrame(frame);
      videoTrack.requestFrame();
      options.onProgress?.(Math.round((frame + 1) / options.frames * 100));
      await wait(Math.max(0, startedAt + (frame + 1) * frameDuration - performance.now()));
    }
  } finally {
    try {
      if (started) {
        if (recorder.state !== 'inactive') recorder.stop();
        await stopped;
      }
    } finally {
      for (const track of stream.getTracks()) track.stop();
    }
  }

  if (!chunks.length) throw new Error('Der Browser hat keine Videodaten erzeugt.');
  const resolvedMimeType = recorder.mimeType || mimeType || 'video/webm';
  return {
    blob: new Blob(chunks, {type: resolvedMimeType}),
    extension: 'webm',
    mimeType: resolvedMimeType,
  };
}

function canRecordCanvasWithMediaRecorder(): boolean {
  return typeof HTMLCanvasElement.prototype.captureStream === 'function'
    && typeof MediaRecorder !== 'undefined';
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
