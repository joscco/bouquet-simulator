import {describe, expect, it} from 'vitest';
import {DEFAULT_FLOWERS} from '../../core/data/default-flowers';
import {createGraphLayout} from './flower-editor-graph';

describe('flower editor graph layout', () => {
  it('keeps the outer linear sequence on one vertical axis', () => {
    const layout = createGraphLayout(DEFAULT_FLOWERS[0], {});
    const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

    expect(nodes.get('base')?.x).toBe(500);
    expect(nodes.get('growth-loop')?.x).toBe(500);
    expect(nodes.get('bloom')?.x).toBe(500);
  });

  it('places the complete internal path inside its loop bounds', () => {
    const layout = createGraphLayout(DEFAULT_FLOWERS[0], {});
    const loop = layout.nodes.find((node) => node.id === 'growth-loop')!;

    for (const memberId of loop.memberIds) {
      const member = layout.nodes.find((node) => node.id === memberId)!;
      expect(member.x - member.width / 2).toBeGreaterThan(loop.x - loop.width / 2);
      expect(member.x + member.width / 2).toBeLessThan(loop.x + loop.width / 2);
      expect(member.y - member.height / 2).toBeGreaterThan(loop.y - loop.height / 2);
      expect(member.y + member.height / 2).toBeLessThan(loop.y + loop.height / 2);
    }
  });

});
