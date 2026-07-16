import {NumberRange} from '../../core/models/flower.models';
import {clamp, roundToStep} from '../../core/utils/numbers';

export function sortedRange(first: number, second: number): NumberRange {
  return {min: Math.min(first, second), max: Math.max(first, second)};
}

export function boundedRange(range: NumberRange, minimum: number, maximum: number): NumberRange {
  const sorted = sortedRange(range.min, range.max);
  return {
    min: clamp(sorted.min, minimum, maximum),
    max: clamp(sorted.max, minimum, maximum),
  };
}

export function rangePercentage(value: number, minimum: number, maximum: number): number {
  const span = maximum - minimum;
  if (span <= 0) return 0;
  return clamp((value - minimum) / span * 100, 0, 100);
}

export function expandedRange(
  value: number,
  minimum: number,
  maximum: number,
  step: number,
): NumberRange {
  const expansion = Math.max(step, (maximum - minimum) * 0.1);
  let min = clamp(roundToStep(value - expansion / 2, step), minimum, maximum);
  let max = clamp(roundToStep(value + expansion / 2, step), minimum, maximum);
  if (min === max) {
    if (max < maximum) max = clamp(max + step, minimum, maximum);
    else min = clamp(min - step, minimum, maximum);
  }
  return sortedRange(min, max);
}
