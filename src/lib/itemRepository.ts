import { getLinks, saveLinks } from './storage';
import { getMinSize, findFreeSlot, findSlotInGroup, GROUP_DEFAULT_COLS } from './grid';
import { WidgetType } from './widgetCatalog';
import type { WidgetItem, RegularLink, Group } from '../types';

export type NewItemInput = Partial<WidgetItem> & { type: WidgetItem['type'] };

export const saveItem = async (
  newLink: NewItemInput,
  groupId?: string,
): Promise<WidgetItem | null> => {
  const currentLinks = await getLinks();

  const id = newLink.id || `${newLink.type || WidgetType.LINK}-${Date.now()}`;
  const w = newLink.w || (newLink.type === WidgetType.GROUP ? 6 : 2);
  const h = newLink.h || (newLink.type === WidgetType.GROUP ? 4 : 2);

  const linkWithId: NewItemInput & { id: string; i: string; w: number; h: number } = {
    w,
    h,
    ...newLink,
    id,
    i: id,
  };

  if (groupId) {
    const updatedLinks = currentLinks.map((item) => {
      if (item.id === groupId && item.type === WidgetType.GROUP) {
        const group = item;
        const innerLinks = group.links || [];
        const slot = findSlotInGroup(innerLinks, w, h, group.cols ?? GROUP_DEFAULT_COLS);
        return {
          ...group,
          links: [
            ...innerLinks,
            { ...(linkWithId as unknown as RegularLink), x: slot.x, y: slot.y },
          ],
        };
      }
      return item;
    });
    await saveLinks(updatedLinks);
    return linkWithId as unknown as WidgetItem;
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

  const updatedLinks: WidgetItem[] = [...currentLinks, linkWithId as unknown as WidgetItem];
  await saveLinks(updatedLinks);
  return linkWithId as unknown as WidgetItem;
};

export const deleteItem = async (id: string): Promise<void> => {
  const currentLinks = await getLinks();
  const deleteNested = (items: WidgetItem[]): WidgetItem[] => {
    return items
      .filter((item) => item.id !== id)
      .map((item) => {
        if (item.type === WidgetType.GROUP && item.links) {
          const group = item as Group;
          return {
            ...group,
            links: deleteNested(group.links as unknown as WidgetItem[]) as unknown as Group['links'],
          };
        }
        return item;
      });
  };
  await saveLinks(deleteNested(currentLinks));
};
