// Pure grid layout utilities — no I/O, no React, no globals.
// Used by linkRepository to place new widgets, and by UI hooks for placement math.

export const MAIN_COLS = 18;
export const MAIN_ROWS = 12;
export const SECTION_DEFAULT_COLS = 3;

export const getMinSize = (type) => {
  if (type === 'google-search') return { minW: 6, minH: 1 };
  if (type === 'section') return { minW: 3, minH: 4 };
  if (type === 'todo' || type === 'timer') return { minW: 3, minH: 3 };
  return { minW: 1, minH: 1 };
};

/**
 * Find the first free slot in the main dashboard grid.
 * Returns { x, y } or null if no fit.
 */
export const findFreeSlot = (links, w, h, maxCols = MAIN_COLS, maxRows = MAIN_ROWS) => {
  if (w > maxCols || h > maxRows) return null;
  const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
  links.forEach(link => {
    if (link.isHeaderLink) return;
    if (link.x === undefined || link.y === undefined) return;
    const lw = link.w || 1;
    const lh = link.h || 1;
    for (let r = link.y; r < link.y + lh && r < maxRows; r++) {
      for (let c = link.x; c < link.x + lw && c < maxCols; c++) {
        if (r >= 0 && c >= 0) grid[r][c] = true;
      }
    }
  });
  for (let r = 0; r <= maxRows - h; r++) {
    for (let c = 0; c <= maxCols - w; c++) {
      let canFit = true;
      for (let i = 0; i < h && canFit; i++) {
        for (let j = 0; j < w; j++) {
          if (grid[r + i][c + j]) { canFit = false; break; }
        }
      }
      if (canFit) return { x: c, y: r };
    }
  }
  return null;
};

/**
 * Find the first free slot inside a section's inner grid.
 * Sections grow vertically without limit, so this always returns a slot.
 */
export const findSlotInSection = (sectionLinks, itemW = 3, itemH = 1, cols = SECTION_DEFAULT_COLS) => {
  const grid = [];

  sectionLinks.forEach(link => {
    const lx = link.x ?? 0;
    const ly = link.y ?? 0;
    const lw = link.w ?? 3;
    const lh = link.h ?? 1;
    for (let r = ly; r < ly + lh; r++) {
      while (grid.length <= r) grid.push(Array(cols).fill(false));
      for (let c = lx; c < lx + lw && c < cols; c++) {
        grid[r][c] = true;
      }
    }
  });

  let r = 0;
  while (true) {
    while (grid.length <= r + itemH) grid.push(Array(cols).fill(false));
    for (let c = 0; c <= cols - itemW; c++) {
      let canFit = true;
      for (let i = 0; i < itemH; i++) {
        for (let j = 0; j < itemW; j++) {
          if (grid[r + i][c + j]) {
            canFit = false;
            break;
          }
        }
        if (!canFit) break;
      }
      if (canFit) {
        return { x: c, y: r };
      }
    }
    r++;
  }
};
