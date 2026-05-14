// Link CRUD orchestration: places new widgets/links using the grid utilities,
// then persists via the storage adapter. Pure orchestration — no UI concerns.

import { getLinks, saveLinks } from './storage';
simport { getMinSize, findFreeSlot, findSlotInSection, SECTION_DEFAULT_COLS } from './grid';

/**
 * Save a new link/widget. Returns the saved item, or null if there's no room
 * on the main dashboard for even the minimum-size variant.
 */
export const saveLink = async (newLink, sectionId) => {
  const currentLinks = await getLinks();

  const id = newLink.id || `${newLink.type || 'link'}-${Date.now()}`;
  const w = newLink.w || (newLink.type === 'section' ? 6 : 2);
  const h = newLink.h || (newLink.type === 'section' ? 4 : 2);

  const linkWithId = {
    w,
    h,
    ...newLink,
    id,
    i: id,
  };

  if (sectionId) {
    // Place inside a specific section's inner grid
    const updatedLinks = currentLinks.map(item => {
      if (item.id === sectionId && item.type === 'section') {
        const innerLinks = item.links || [];
        const slot = findSlotInSection(innerLinks, w, h, item.cols ?? SECTION_DEFAULT_COLS);
        return {
          ...item,
          links: [
            ...innerLinks,
            { ...linkWithId, x: slot.x, y: slot.y }
          ]
        };
      }
      return item;
    });
    await saveLinks(updatedLinks);
    return linkWithId;
  }

  if (newLink.isHeaderLink) {
    const headerLinks = currentLinks.filter(l => l.isHeaderLink);
    const maxOrder = headerLinks.reduce((max, l) => Math.max(max, l.order || 0), -1);
    linkWithId.order = maxOrder + 1;
    linkWithId.x = undefined;
    linkWithId.y = undefined;
  } else if (newLink.x !== undefined && newLink.y !== undefined) {
    linkWithId.x = newLink.x;
    linkWithId.y = newLink.y;
  } else {
    let slot = findFreeSlot(currentLinks, w, h);
    if (!slot) {
      const { minW, minH } = getMinSize(newLink.type);
      if (minW < w || minH < h) {
        slot = findFreeSlot(currentLinks, minW, minH);
        if (slot) {
          linkWithId.w = minW;
          linkWithId.h = minH;
        }
      }
    }
    if (!slot) return null;
    linkWithId.x = slot.x;
    linkWithId.y = slot.y;
  }

  const updatedLinks = [...currentLinks, linkWithId];
  await saveLinks(updatedLinks);
  return linkWithId;
};

/**
 * Remove a link by id, recursing into sections. Currently unused in the UI
 * (App.handleDelete does the same filter inline for optimistic updates), but
 * kept as part of the repository's public surface for future callers.
 */
export const deleteLink = async (id) => {
  const currentLinks = await getLinks();
  const deleteNested = (items) => {
    return items
      .filter(item => item.id !== id)
      .map(item => {
        if (item.type === 'section' && item.links) {
          return { ...item, links: deleteNested(item.links) };
        }
        return item;
      });
  };
  await saveLinks(deleteNested(currentLinks));
};
