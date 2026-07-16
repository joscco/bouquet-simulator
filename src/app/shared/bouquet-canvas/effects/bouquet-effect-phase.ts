const EFFECT_LOOP_SECONDS = 6;

export function normalizedBouquetEffectPhase(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  return ((phase % 1) + 1) % 1;
}

/** Returns the normalized phase of the fixed six-second live-preview loop. */
export function bouquetEffectLoopPhase(timeSeconds: number): number {
  return normalizedBouquetEffectPhase(timeSeconds / EFFECT_LOOP_SECONDS);
}
