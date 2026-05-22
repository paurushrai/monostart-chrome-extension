// Pure link-placement helpers. Each function takes an immutable links array
// + a link to insert, and returns a NEW links array with the link placed.
// No React, no I/O, no storage.

import { MAIN_COLS, MAIN_ROWS, SECTION_DEFAULT_COLS, findFirstFreeSlot } from './grid';
import type { OccupiedRect } from './grid';
import { WidgetType } from './widgetCatalog';
import type { LinkItem, RegularLink, Section, GridSlot } from '../types';

/**
 * Remove a link by id from anywhere — top-level or inside a section.
 * Returns { cleanedLinks, foundLink } where foundLink is null if not found.
 */
export const removeLinkAnywhere = (
  links: readonly LinkItem[],
  linkId: string,
): { cleanedLinks: LinkItem[]; foundLink: LinkItem | null } => {
  let foundLink: LinkItem | null = null;

  let cleanedLinks: LinkItem[] = links.filter((l) => {
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
    foundLink = item.links.find((l) => l.id === linkId) ?? null;
    return { ...item, links: item.links.filter((l) => l.id !== linkId) };
  });

  return { cleanedLinks, foundLink };
};

/** Default placement size when an item's w/h is missing. */
const defaultLinkSize = (link: LinkItem): { w: number; h: number } => ({
  w: link.w ?? (link.viewMode === 'icon' ? 1 : 3),
  h: link.h ?? 1,
});

/** Insert link as a new header link at the end of the header row. */
export const placeInHeader = (
  cleanedLinks: readonly LinkItem[],
  foundLink: LinkItem,
): LinkItem[] => {
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
const resolveSectionRect = (l: RegularLink, cols: number): OccupiedRect => ({
  x: l.x ?? 0,
  y: l.y ?? 0,
  w: Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, cols)), cols),
  h: l.h ?? 1,
});

/** Find first free slot in a section (unbounded rows). */
const findSectionSlot = (
  sectionLinks: readonly RegularLink[],
  cols: number,
  itemW: number,
  itemH: number,
): GridSlot =>
  findFirstFreeSlot(
    sectionLinks.map((l) => resolveSectionRect(l, cols)),
    itemW,
    itemH,
    cols,
  ) as GridSlot; // unbounded rows → never null

/** Insert link into a specific section at targetCoords (or next free slot). */
export const placeInSection = (
  cleanedLinks: readonly LinkItem[],
  foundLink: LinkItem,
  targetSectionId: string,
  targetCoords?: GridSlot,
): LinkItem[] => {
  return cleanedLinks.map((item) => {
    if (item.id !== targetSectionId || item.type !== WidgetType.SECTION) return item;

    const section = item as Section;
    const sectionLinks = section.links || [];
    const cols = section.cols || SECTION_DEFAULT_COLS;
    const { w: rawW, h } = defaultLinkSize(foundLink);
    const w = Math.min(rawW, cols);

    let x: number;
    let y: number;
    if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
      x = Math.max(0, Math.min(cols - w, targetCoords.x));
      y = Math.max(0, targetCoords.y);
    } else {
      const slot = findSectionSlot(sectionLinks, cols, w, h);
      x = slot.x;
      y = slot.y;
    }

    return {
      ...section,
      links: [
        ...sectionLinks,
        { ...(foundLink as RegularLink), isHeaderLink: false, x, y, w, h },
      ],
    };
  });
};

/** Find first free slot on the main dashboard grid. Falls back to last row if no fit. */
const findMainSlot = (
  occupiedLinks: readonly LinkItem[],
  itemW: number,
  itemH: number,
): GridSlot => {
  const occupied: OccupiedRect[] = occupiedLinks
    .filter((l): l is LinkItem & { x: number; y: number } =>
      l.x !== undefined && l.y !== undefined,
    )
    .map((l) => ({ x: l.x, y: l.y, w: l.w || 1, h: l.h || 1 }));
  return (
    findFirstFreeSlot(occupied, itemW, itemH, MAIN_COLS, MAIN_ROWS) ??
    { x: 0, y: MAIN_ROWS - 1 }
  );
};

/** Insert link onto the main dashboard at targetCoords (or next free slot). */
export const placeOnMain = (
  cleanedLinks: readonly LinkItem[],
  foundLink: LinkItem,
  targetCoords?: GridSlot,
): LinkItem[] => {
  const { w, h } = defaultLinkSize(foundLink);

  let x: number;
  let y: number;
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
