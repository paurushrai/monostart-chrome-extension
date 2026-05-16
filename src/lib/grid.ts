// Pure grid layout utilities — no I/O, no React.
// Used by linkPlacement / linkRepository to place new widgets, and by UI
// hooks for placement math (e.g. drag-placeholder positioning).

import { getWidgetMinSize } from './widgetCatalog';
import type { LinkItem, RegularLink, GridSlot } from '../types';

export const MAIN_COLS = 18;
export const MAIN_ROWS = 12;
export const SECTION_DEFAULT_COLS = 3;

export const getMinSize = (type: string | undefined) => getWidgetMinSize(type);

/** Occupied rectangle, pre-resolved (used by `findFirstFreeSlot`). */
export interface OccupiedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Core slot-finder. Given an array of occupied rectangles, find the top-left
 * position where a (w × h) item fits inside a `cols`-wide grid.
 *
 *  occupied: [{ x, y, w, h }, ...]  — already-resolved rectangles
 *  cols:     width of the grid (column count)
 *  maxRows:  row cap. Pass Infinity for grids that grow vertically (sections).
 *
 * Returns { x, y } or null if no fit within bounds.
 */
export const findFirstFreeSlot = (
  occupied: readonly OccupiedRect[],
  w: number,
  h: number,
  cols: number,
  maxRows: number = Infinity,
): GridSlot | null => {
  if (w > cols) return null;

  const grid: boolean[][] = [];
  const ensureRow = (r: number) => {
    while (grid.length <= r) grid.push(new Array(cols).fill(false));
  };

  occupied.forEach(({ x, y, w: ow, h: oh }) => {
    for (let r = y; r < y + oh; r++) {
      if (r >= maxRows) break;
      ensureRow(r);
      const row = grid[r]!;
      for (let c = x; c < x + ow && c < cols; c++) {
        if (c >= 0 && r >= 0) row[c] = true;
      }
    }
  });

  let r = 0;
  while (r + h <= maxRows) {
    ensureRow(r + h - 1);
    for (let c = 0; c <= cols - w; c++) {
      let canFit = true;
      for (let i = 0; i < h && canFit; i++) {
        const row = grid[r + i]!;
        for (let j = 0; j < w; j++) {
          if (row[c + j]) { canFit = false; break; }
        }
      }
      if (canFit) return { x: c, y: r };
    }
    r++;
  }
  return null;
};

/** Build occupied-rectangles from a links array (skips header-only items). */
const resolveOccupancy = (
  links: readonly LinkItem[],
  defaultW = 1,
  defaultH = 1,
): OccupiedRect[] =>
  links
    .filter((l): l is LinkItem & { x: number; y: number } =>
      !l.isHeaderLink && l.x !== undefined && l.y !== undefined,
    )
    .map((l) => ({
      x: l.x,
      y: l.y,
      w: l.w ?? defaultW,
      h: l.h ?? defaultH,
    }));

/** Find a slot on the bounded main dashboard grid. Returns null if no fit. */
export const findFreeSlot = (
  links: readonly LinkItem[],
  w: number,
  h: number,
  maxCols: number = MAIN_COLS,
  maxRows: number = MAIN_ROWS,
): GridSlot | null => {
  if (h > maxRows) return null;
  return findFirstFreeSlot(resolveOccupancy(links), w, h, maxCols, maxRows);
};

/** Find a slot in a section's grid (grows vertically without limit). */
export const findSlotInSection = (
  sectionLinks: readonly RegularLink[],
  itemW: number = 3,
  itemH: number = 1,
  cols: number = SECTION_DEFAULT_COLS,
): GridSlot => {
  const occupied: OccupiedRect[] = sectionLinks.map((l) => ({
    x: l.x ?? 0,
    y: l.y ?? 0,
    w: Math.min(l.w ?? itemW, cols),
    h: l.h ?? 1,
  }));
  // Sections are unbounded vertically; pass Infinity. Result is never null here.
  return findFirstFreeSlot(occupied, itemW, itemH, cols) as GridSlot;
};
