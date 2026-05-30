import { describe, it, expect } from 'vitest';
import {
  findFirstFreeSlot,
  findFreeSlot,
  findSlotInSection,
  getMinSize,
  MAIN_COLS,
  MAIN_ROWS,
  SECTION_DEFAULT_COLS,
} from '../grid';
import type { LinkItem, RegularLink } from '../../types';

const link = (id: string, x: number, y: number, w = 1, h = 1, extra: Partial<RegularLink> = {}): RegularLink => ({
  id,
  type: 'link',
  url: `https://example.com/${id}`,
  title: id,
  x,
  y,
  w,
  h,
  ...extra,
});

describe('findFirstFreeSlot', () => {
  it('places at (0,0) when the grid is empty', () => {
    expect(findFirstFreeSlot([], 1, 1, MAIN_COLS, MAIN_ROWS)).toEqual({ x: 0, y: 0 });
  });

  it('places after an occupying rect on the same row', () => {
    const occupied = [{ x: 0, y: 0, w: 3, h: 1 }];
    expect(findFirstFreeSlot(occupied, 1, 1, MAIN_COLS, MAIN_ROWS)).toEqual({ x: 3, y: 0 });
  });

  it('drops to next row when current row is full', () => {
    const occupied = [{ x: 0, y: 0, w: MAIN_COLS, h: 1 }];
    expect(findFirstFreeSlot(occupied, 1, 1, MAIN_COLS, MAIN_ROWS)).toEqual({ x: 0, y: 1 });
  });

  it('returns null when item width exceeds grid width', () => {
    expect(findFirstFreeSlot([], MAIN_COLS + 1, 1, MAIN_COLS, MAIN_ROWS)).toBeNull();
  });

  it('returns null when no fit within maxRows', () => {
    const occupied = Array.from({ length: MAIN_ROWS }, (_, y) => ({ x: 0, y, w: MAIN_COLS, h: 1 }));
    expect(findFirstFreeSlot(occupied, 1, 1, MAIN_COLS, MAIN_ROWS)).toBeNull();
  });

  it('handles 2D items (w>1, h>1) and finds the first gap', () => {
    const occupied = [{ x: 0, y: 0, w: 2, h: 2 }];
    expect(findFirstFreeSlot(occupied, 2, 2, 4, 4)).toEqual({ x: 2, y: 0 });
  });

  it('finds slots in unbounded (Infinity rows) grids', () => {
    const occupied = [{ x: 0, y: 0, w: 3, h: 100 }];
    const slot = findFirstFreeSlot(occupied, 1, 1, 3, Infinity);
    expect(slot).toEqual({ x: 0, y: 100 });
  });
});

describe('findFreeSlot (main grid)', () => {
  it('ignores header-only links (no x/y)', () => {
    const links: LinkItem[] = [
      { ...link('h1', 0, 0), isHeaderLink: true, x: undefined, y: undefined },
      link('a', 0, 0, 3, 1),
    ];
    expect(findFreeSlot(links, 3, 1)).toEqual({ x: 3, y: 0 });
  });

  it('returns null when h exceeds MAIN_ROWS', () => {
    expect(findFreeSlot([], 1, MAIN_ROWS + 1)).toBeNull();
  });

  it('defaults missing w/h on existing links to 1×1', () => {
    // Build a link with x/y but explicitly missing w/h via overrides
    const stub: LinkItem = { ...link('a', 0, 0), w: undefined, h: undefined };
    const links: LinkItem[] = [stub];
    // Existing link occupies just (0,0); next item goes to (1,0)
    expect(findFreeSlot(links, 1, 1)).toEqual({ x: 1, y: 0 });
  });
});

describe('findSlotInSection', () => {
  it('places at (0,0) in an empty section', () => {
    expect(findSlotInSection([], 1, 1)).toEqual({ x: 0, y: 0 });
  });

  it('grows vertically without limit', () => {
    const sectionLinks: RegularLink[] = Array.from({ length: 50 }, (_, y) =>
      link(`l-${y}`, 0, y, 3, 1),
    );
    const slot = findSlotInSection(sectionLinks, 1, 1, SECTION_DEFAULT_COLS);
    expect(slot.y).toBe(50);
  });

  it('respects per-section cols', () => {
    // 6-column section, place a 3-wide item next to an existing 3-wide one
    const sectionLinks: RegularLink[] = [link('a', 0, 0, 3, 1)];
    expect(findSlotInSection(sectionLinks, 3, 1, 6)).toEqual({ x: 3, y: 0 });
  });

  it('clamps an oversized existing link to cols when computing occupancy', () => {
    // Link with w=10 in a 3-col section should still allow new items below it
    const sectionLinks: RegularLink[] = [link('a', 0, 0, 10, 1)];
    expect(findSlotInSection(sectionLinks, 1, 1, 3)).toEqual({ x: 0, y: 1 });
  });
});

describe('getMinSize', () => {
  it.each([
    ['google-search', { minW: 6, minH: 1 }],
    ['section', { minW: 3, minH: 4 }],
    ['todo', { minW: 3, minH: 3 }],
    ['timer', { minW: 3, minH: 3 }],
    ['iframe', { minW: 3, minH: 3 }],
    ['note', { minW: 3, minH: 3 }],
    ['image', { minW: 4, minH: 4 }],
    ['label', { minW: 2, minH: 1 }],
    ['link', { minW: 1, minH: 1 }],
  ])('returns correct min size for %s', (type, expected) => {
    expect(getMinSize(type)).toEqual(expected);
  });

  it('falls back to 1×1 for unknown types', () => {
    expect(getMinSize('what-is-this')).toEqual({ minW: 1, minH: 1 });
  });
});
