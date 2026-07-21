/**
 * Samples a loop in the middle of each frame interval. This keeps both exact
 * endpoints out of the encoded video and gives the wrap-around the same step
 * size as every other transition.
 */
export function loopFramePhase(frame: number, frameCount: number, turns: number): number {
  if (!Number.isInteger(frame) || !Number.isInteger(frameCount) || frameCount <= 0
    || frame < 0 || frame >= frameCount) {
    throw new Error('Ungültiger Frame für eine Loop-Animation.');
  }
  return (frame + 0.5) / (frameCount / turns);
}
