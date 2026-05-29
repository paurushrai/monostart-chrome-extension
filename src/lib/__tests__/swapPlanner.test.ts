import { describe, it, expect } from 'vitest';
import { pickSwapTarget, resolveSwap, type Rect } from '../swapPlanner';

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

describe('pickSwapTarget', () => {
  it('returns null when nothing overlaps', () => {
    expect(pickSwapTarget(r(0, 0, 2, 2), [
      { id: 'a', rect: r(5, 5, 1, 1) },
      { id: 'b', rect: r(8, 0, 1, 1) },
    ])).toBeNull();
  });

  it('returns the only overlapping target', () => {
    expect(pickSwapTarget(r(0, 0, 2, 2), [
      { id: 'hit', rect: r(1, 1, 2, 2) },
      { id: 'miss', rect: r(5, 5, 1, 1) },
    ])).toBe('hit');
  });

  it('picks the candidate with the largest overlap area', () => {
    // dropped covers (0,0)-(4,4) — 16 cells
    // a overlaps 1 cell at (3,3)
    // b overlaps 4 cells at (2,2)-(4,4)
    expect(pickSwapTarget(r(0, 0, 4, 4), [
      { id: 'a', rect: r(3, 3, 1, 1) },
      { id: 'b', rect: r(2, 2, 2, 2) },
    ])).toBe('b');
  });

  it('on tied overlap area, picks the top-left target', () => {
    expect(pickSwapTarget(r(0, 0, 4, 4), [
      { id: 'bottomRight', rect: r(2, 2, 2, 2) },
      { id: 'topLeft', rect: r(0, 0, 2, 2) },
    ])).toBe('topLeft');
  });

  it('ignores the dragged item itself when not passed in others', () => {
    // (others should already exclude the dragged item; verify empty case)
    expect(pickSwapTarget(r(0, 0, 2, 2), [])).toBeNull();
  });
});

describe('resolveSwap', () => {
  it('exchanges position and size when both within bounds', () => {
    const out = resolveSwap(
      { rect: r(0, 0, 4, 4), bounds: { minW: 1, minH: 1 } },
      { rect: r(4, 0, 2, 2), bounds: { minW: 1, minH: 1 } },
    );
    expect(out.draggedRect).toEqual(r(4, 0, 2, 2));
    expect(out.targetRect).toEqual(r(0, 0, 4, 4));
  });

  it('clamps dragged to its own minimum if target slot is smaller', () => {
    // Dragged minimum is 3x3; target is only 2x2
    const out = resolveSwap(
      { rect: r(0, 0, 4, 4), bounds: { minW: 3, minH: 3 } },
      { rect: r(4, 0, 2, 2), bounds: { minW: 1, minH: 1 } },
    );
    expect(out.draggedRect).toEqual({ x: 4, y: 0, w: 3, h: 3 });
    // Target adopts dragged's old size & position
    expect(out.targetRect).toEqual(r(0, 0, 4, 4));
  });

  it('clamps target to its own minimum if dragged slot is smaller', () => {
    // Target minimum is 3x3; dragged was 2x2
    const out = resolveSwap(
      { rect: r(0, 0, 2, 2), bounds: { minW: 1, minH: 1 } },
      { rect: r(4, 0, 4, 4), bounds: { minW: 3, minH: 3 } },
    );
    expect(out.draggedRect).toEqual(r(4, 0, 4, 4));
    expect(out.targetRect).toEqual({ x: 0, y: 0, w: 3, h: 3 });
  });

  it('respects max bounds when adopting a larger size', () => {
    const out = resolveSwap(
      { rect: r(0, 0, 1, 1), bounds: { minW: 1, minH: 1, maxW: 2, maxH: 2 } },
      { rect: r(4, 0, 6, 6), bounds: { minW: 1, minH: 1 } },
    );
    expect(out.draggedRect).toEqual({ x: 4, y: 0, w: 2, h: 2 });
    expect(out.targetRect).toEqual(r(0, 0, 1, 1));
  });

  it('handles a fixed-height widget (height min == max)', () => {
    // Google search bar variant: minH=1, maxH=1, but adoptable width
    const out = resolveSwap(
      { rect: r(0, 0, 6, 1), bounds: { minW: 6, maxW: 8, minH: 1, maxH: 1 } },
      { rect: r(6, 0, 8, 4), bounds: { minW: 1, minH: 1 } },
    );
    // Dragged adopts target's w=8 (within its 6..8 range), but h clamped to 1
    expect(out.draggedRect).toEqual({ x: 6, y: 0, w: 8, h: 1 });
    expect(out.targetRect).toEqual(r(0, 0, 6, 1));
  });

  it('when dragged minW exceeds target slot width, stays at its own min (target slot may not fully contain it)', () => {
    // Documented worst-case: target slot is narrower than dragged's minW.
    // Dragged keeps its minW; visual overflow into adjacent cells is accepted.
    const out = resolveSwap(
      { rect: r(0, 0, 6, 1), bounds: { minW: 6, minH: 1, maxH: 1 } },
      { rect: r(6, 0, 4, 4), bounds: { minW: 1, minH: 1 } },
    );
    expect(out.draggedRect).toEqual({ x: 6, y: 0, w: 6, h: 1 });
    expect(out.targetRect).toEqual(r(0, 0, 6, 1));
  });

  it('no-op when sizes already match (pure position exchange)', () => {
    const out = resolveSwap(
      { rect: r(0, 0, 2, 2), bounds: { minW: 1, minH: 1 } },
      { rect: r(4, 4, 2, 2), bounds: { minW: 1, minH: 1 } },
    );
    expect(out.draggedRect).toEqual(r(4, 4, 2, 2));
    expect(out.targetRect).toEqual(r(0, 0, 2, 2));
  });
});
