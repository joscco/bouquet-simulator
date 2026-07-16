export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
