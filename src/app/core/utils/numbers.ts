export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Formats values for compact numeric inputs without exposing floating-point noise. */
export function formatNumericInputValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  const fixed = value.toFixed(1);
  if (Number(fixed) === 0) return '0';
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
