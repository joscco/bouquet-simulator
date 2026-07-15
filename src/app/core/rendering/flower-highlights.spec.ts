import {describe, expect, it} from 'vitest';
import {isFlowerTemplateHighlighted} from './flower-highlights';

describe('flower highlights', () => {
  it('matches every directly selected template', () => {
    const selected = new Set(['leaf', 'petal']);

    expect(isFlowerTemplateHighlighted('leaf', selected)).toBe(true);
    expect(isFlowerTemplateHighlighted('petal', selected)).toBe(true);
    expect(isFlowerTemplateHighlighted('stem', selected)).toBe(false);
  });

  it('matches materialized templates below a selected component', () => {
    const selected = new Set(['flower-head']);

    expect(isFlowerTemplateHighlighted('flower-head::petal', selected)).toBe(true);
    expect(isFlowerTemplateHighlighted('flower-head-copy::petal', selected)).toBe(false);
  });
});
