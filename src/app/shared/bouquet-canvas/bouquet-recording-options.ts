export const DEFAULT_TURNTABLE_VIDEO_SIZE = 1080;

export interface BouquetTurntableRecordingOptions {
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  turns?: number;
  onProgress?: (progressPercent: number) => void;
}

export function validVideoDimension(value: number): number {
  if (!Number.isInteger(value) || value < 240 || value > 3840) {
    throw new Error('Ungültige Videoauflösung.');
  }
  return value;
}
