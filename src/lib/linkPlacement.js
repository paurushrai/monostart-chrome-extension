// Pure link-placement helpers. Each function takes an immutable links array
// + a link to insert, and returns a NEW links array with the link placed.
// No React, no I/O, no storage.

import { MAIN_COLS, MAIN_ROWS, SECTION_DEFAULT_COLS, findFirstFreeSlot } from './grid';
import { WidgetType } from './widgetCatalog';

/**
 * Remove a link by id from anywhere — top-level or inside a section.
 * Returns { cleanedLinks, foundLink } where foundLink is null if not found.
 */
export const removeLinkAnywhere = (links, linkId) => {
  let foundLink = null;

  let cleanedLinks = links.filter((l) => {
    if (l.id === linkId) {
      foundLink = l;
      return false;
    }
    return true;
  });

  cleanedLinks = cleanedLinks.map((item) => {
    if (item.type !== WidgetType.SECTION || !item.links) return item;
    const hasLink = item.links.some((l) => l.id === linkId);
    if (!hasLink) return item;
    foundLink = item.links.find((l) => l.id === linkId);
    return { ...item, links: item.links.filter((l) => l.id !== linkId) };
  });

  return { cleanedLinks, foundLink };
};

/** Default placement size when an item's w/h is missing. */
const defaultLinkSize = (link) => ({
  w: link.w ?? (link.viewMode === 'icon' ? 1 : 3),
  h: link.h ?? 1,
});

/** Insert link as a new header link at the end of the header row. */
export const placeInHeader = (cleanedLinks, foundLink) => {
  const headerLinks = cleanedLinks.filter((l) => l.isHeaderLink);
  const maxOrder = headerLinks.reduce((max, l) => Math.max(max, l.order || 0), -1);
  return [
    ...cleanedLinks,
    {
      ...foundLink,
      isHeaderLink: true,
      parentId: null,
      order: maxOrder + 1,
      x: undefined,
      y: undefined,
    },
  ];
};

/** Resolve a section link's occupied rect with viewMode-aware default sizing. */
const resolveSectionRect = (l, cols) => ({
  x: l.x ?? 0,
  y: l.y ?? 0,
  w: Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, cols)), cols),
  h: l.h ?? 1,
});

/** Find first free slot in a section (unbounded rows). */
const findSectionSlot = (sectionLinks, cols, itemW, itemH) =>
  findFirstFreeSlot(
    sectionLinks.map((l) => resolveSectionRect(l, cols)),
    itemW,
    itemH,
    cols,
  );

/** Insert link into a specific section at targetCoords (or next free slot). */
export const placeInSection = (cleanedLinks, foundLink, targetSectionId, targetCoords) => {
  return cleanedLinks.map((item) => {
    if (item.id !== targetSectionId || item.type !== WidgetType.SECTION) return item;

    const sectionLinks = item.links || [];
    const cols = item.cols || SECTION_DEFAULT_COLS;
    const { w: rawW, h } = defaultLinkSize(foundLink);
    const w = Math.min(rawW, cols);

    let x;
    let y;
    if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
      x = Math.max(0, Math.min(cols - w, targetCoords.x));
      y = Math.max(0, targetCoords.y);
    } else {
      const slot = findSectionSlot(sectionLinks, cols, w, h);
      x = slot.x;
      y = slot.y;
    }

    return {
      ...item,
      links: [
        ...sectionLinks,
        { ...foundLink, isHeaderLink: false, x, y, w, h },
      ],
    };
  });
};

/** Find first free slot on the main dashboard grid. Falls back to last row if no fit. */
const findMainSlot = (occupiedLinks, itemW, itemH) => {
  const occupied = occupiedLinks
    .filter((l) => l.x !== undefined && l.y !== undefined)
    .map((l) => ({ x: l.x, y: l.y, w: l.w || 1, h: l.h || 1 }));
  return (
    findFirstFreeSlot(occupied, itemW, itemH, MAIN_COLS, MAIN_ROWS) ??
    { x: 0, y: MAIN_ROWS - 1 }
  );
};

/** Insert link onto the main dashboard at targetCoords (or next free slot). */
export const placeOnMain = (cleanedLinks, foundLink, targetCoords) => {
  const { w, h } = defaultLinkSize(foundLink);

  let x;
  let y;
  if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
    x = Math.max(0, Math.min(MAIN_COLS - w, targetCoords.x));
    y = Math.max(0, targetCoords.y);
  } else {
    const slot = findMainSlot(cleanedLinks, w, h);
    x = slot.x;
    y = slot.y;
  }

  return [
    ...cleanedLinks,
    { ...foundLink, isHeaderLink: false, x, y, w, h },
  ];
};
