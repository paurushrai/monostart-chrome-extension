import { MAIN_COLS, MAIN_ROWS, GROUP_DEFAULT_COLS, findFirstFreeSlot } from './grid';
import type { OccupiedRect } from './grid';
import { WidgetType } from './widgetCatalog';
import type { WidgetItem, LinkItem, GroupItem, GridSlot } from '../types';

export const removeLinkAnywhere = (
  links: readonly WidgetItem[],
  linkId: string,
): { cleanedLinks: WidgetItem[]; foundLink: WidgetItem | null } => {
  let foundLink: WidgetItem | null = null;

  let cleanedLinks: WidgetItem[] = links.filter((l) => {
    if (l.id === linkId) {
      foundLink = l;
      return false;
    }
    return true;
  });

  cleanedLinks = cleanedLinks.map((item) => {
    if (item.type !== WidgetType.GROUP || !item.links) return item;
    const hasLink = item.links.some((l) => l.id === linkId);
    if (!hasLink) return item;
    foundLink = item.links.find((l) => l.id === linkId) ?? null;
    return { ...item, links: item.links.filter((l) => l.id !== linkId) };
  });

  return { cleanedLinks, foundLink };
};

const defaultLinkSize = (link: WidgetItem): { w: number; h: number } => ({
  w: link.w ?? (link.viewMode === 'icon' ? 1 : 3),
  h: link.h ?? 1,
});

export const placeInHeader = (
  cleanedLinks: readonly WidgetItem[],
  foundLink: WidgetItem,
): WidgetItem[] => {
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

const resolveGroupRect = (l: LinkItem, cols: number): OccupiedRect => ({
  x: l.x ?? 0,
  y: l.y ?? 0,
  w: Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, cols)), cols),
  h: l.h ?? 1,
});

const findGroupSlot = (
  groupLinks: readonly LinkItem[],
  cols: number,
  itemW: number,
  itemH: number,
): GridSlot =>
  findFirstFreeSlot(
    groupLinks.map((l) => resolveGroupRect(l, cols)),
    itemW,
    itemH,
    cols,
  ) as GridSlot;

export const placeInGroup = (
  cleanedLinks: readonly WidgetItem[],
  foundLink: WidgetItem,
  targetGroupId: string,
  targetCoords?: GridSlot,
): WidgetItem[] => {
  return cleanedLinks.map((item) => {
    if (item.id !== targetGroupId || item.type !== WidgetType.GROUP) return item;

    const group = item as GroupItem;
    const groupLinks = group.links || [];
    const cols = group.cols || GROUP_DEFAULT_COLS;
    const { w: rawW, h } = defaultLinkSize(foundLink);
    const w = Math.min(rawW, cols);

    let x: number;
    let y: number;
    if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
      x = Math.max(0, Math.min(cols - w, targetCoords.x));
      y = Math.max(0, targetCoords.y);
    } else {
      const slot = findGroupSlot(groupLinks, cols, w, h);
      x = slot.x;
      y = slot.y;
    }

    return {
      ...group,
      links: [
        ...groupLinks,
        { ...(foundLink as LinkItem), isHeaderLink: false, x, y, w, h },
      ],
    };
  });
};

const findMainSlot = (
  occupiedLinks: readonly WidgetItem[],
  itemW: number,
  itemH: number,
): GridSlot => {
  const occupied: OccupiedRect[] = occupiedLinks
    .filter((l): l is WidgetItem & { x: number; y: number } =>
      l.x !== undefined && l.y !== undefined,
    )
    .map((l) => ({ x: l.x, y: l.y, w: l.w || 1, h: l.h || 1 }));
  return (
    findFirstFreeSlot(occupied, itemW, itemH, MAIN_COLS, MAIN_ROWS) ??
    { x: 0, y: MAIN_ROWS - 1 }
  );
};

export const placeOnMain = (
  cleanedLinks: readonly WidgetItem[],
  foundLink: WidgetItem,
  targetCoords?: GridSlot,
): WidgetItem[] => {
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
