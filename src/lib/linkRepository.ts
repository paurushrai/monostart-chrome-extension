import { getLinks, saveLinks } from './storage';
import { getMinSize, findFreeSlot, findSlotInSection, SECTION_DEFAULT_COLS } from './grid';
import { WidgetType } from './widgetCatalog';
import type { LinkItem, RegularLink, Section } from '../types';

export type NewLinkInput = Partial<LinkItem> & { type: LinkItem['type'] };

export const saveLink = async (
  newLink: NewLinkInput,
  sectionId?: string,
): Promise<LinkItem | null> => {
  const currentLinks = await getLinks();

  const id = newLink.id || `${newLink.type || WidgetType.LINK}-${Date.now()}`;
  const w = newLink.w || (newLink.type === WidgetType.SECTION ? 6 : 2);
  const h = newLink.h || (newLink.type === WidgetType.SECTION ? 4 : 2);

  const linkWithId: NewLinkInput & { id: string; i: string; w: number; h: number } = {
    w,
    h,
    ...newLink,
    id,
    i: id,
  };

  if (sectionId) {
    const updatedLinks = currentLinks.map((item) => {
      if (item.id === sectionId && item.type === WidgetType.SECTION) {
        const section = item;
        const innerLinks = section.links || [];
        const slot = findSlotInSection(innerLinks, w, h, section.cols ?? SECTION_DEFAULT_COLS);
        return {
          ...section,
          links: [
            ...innerLinks,
            { ...(linkWithId as unknown as RegularLink), x: slot.x, y: slot.y },
          ],
        };
      }
      return item;
    });
    await saveLinks(updatedLinks);
    return linkWithId as unknown as LinkItem;
  }

  if (newLink.isHeaderLink) {
    const headerLinks = currentLinks.filter((l) => l.isHeaderLink);
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

  const updatedLinks: LinkItem[] = [...currentLinks, linkWithId as unknown as LinkItem];
  await saveLinks(updatedLinks);
  return linkWithId as unknown as LinkItem;
};

export const deleteLink = async (id: string): Promise<void> => {
  const currentLinks = await getLinks();
  const deleteNested = (items: LinkItem[]): LinkItem[] => {
    return items
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.type === WidgetType.SECTION && item.links) {
          const section = item as Section;
          return {
            ...section,
            links: deleteNested(section.links as unknown as LinkItem[]) as unknown as Section['links'],
          };
        }
        return item;
      });
  };
  await saveLinks(deleteNested(currentLinks));
};
