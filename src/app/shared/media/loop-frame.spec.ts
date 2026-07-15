import {describe, expect, it} from 'vitest';
import {loopFramePhase} from './loop-frame';

describe('loopFramePhase', () => {
  it('does not encode the duplicated zero or one endpoints', () => {
    expect(loopFramePhase(0, 180)).toBeGreaterThan(0);
    expect(loopFramePhase(179, 180)).toBeLessThan(1);
  });

  it('keeps the wrap-around step equal to every regular frame step', () => {
    const first = loopFramePhase(0, 180);
    const second = loopFramePhase(1, 180);
    const last = loopFramePhase(179, 180);

    expect(second - first).toBeCloseTo(1 / 180);
    expect(1 + first - last).toBeCloseTo(1 / 180);
  });

  it('rejects frames outside the requested recording', () => {
    expect(() => loopFramePhase(180, 180)).toThrow();
  });
});
