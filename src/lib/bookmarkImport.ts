import { findFirstFreeSlot, MAIN_COLS, GROUP_DEFAULT_COLS } from './grid';
import type { WidgetItem, LinkItem, GroupItem } from '../types';

export interface BookmarkTreeNodeLike {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNodeLike[];
}

export interface ImportResult {
  groupsCreated: number;
  groupsMerged: number;
  bookmarksImported: number;
  emptyFoldersSkipped: number;
  firstNewGroupId: string | null;
  items: WidgetItem[];
}

const OTHER_GROUP_TITLE = 'Other';
const DEFAULT_GROUP_BORDER = '200 73% 52%';
const GROUP_W = 4;
const GROUP_H = 4;

const safeTitle = (raw: string, fallback: string): string => {
  const trimmed = (raw || '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const isFolder = (node: BookmarkTreeNodeLike): boolean => !node.url;

const hostFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const flattenBookmarks = (node: BookmarkTreeNodeLike): { title: string; url: string }[] => {
  const out: { title: string; url: string }[] = [];
  const walk = (n: BookmarkTreeNodeLike) => {
    if (n.url) {
      out.push({ title: safeTitle(n.title, hostFromUrl(n.url)), url: n.url });
      return;
    }
    for (const child of n.children ?? []) walk(child);
  };
  for (const child of node.children ?? []) walk(child);
  return out;
};

const dedupeByUrl = (items: { title: string; url: string }[]): { title: string; url: string }[] => {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
};

const makeLink = (b: { title: string; url: string }, groupId: string, index: number): LinkItem => ({
  id: `bm-${crypto.randomUUID()}`,
  type: 'link',
  url: b.url,
  title: b.title,
  viewMode: 'icon',
  w: 1,
  h: 1,
  x: index % GROUP_DEFAULT_COLS,
  y: Math.floor(index / GROUP_DEFAULT_COLS),
  parentId: groupId,
});

interface FolderBucket {
  title: string;
  bookmarks: { title: string; url: string }[];
}

export const collectFolders = (
  rootNodes: readonly BookmarkTreeNodeLike[],
): { folders: FolderBucket[]; otherBookmarks: { title: string; url: string }[] } => {
  const folders: FolderBucket[] = [];
  const otherBookmarks: { title: string; url: string }[] = [];

  for (const root of rootNodes) {
    for (const child of root.children ?? []) {
      if (isFolder(child)) {
        const flattened = dedupeByUrl(flattenBookmarks(child));
        if (flattened.length === 0) continue;
        folders.push({ title: safeTitle(child.title, 'Untitled'), bookmarks: flattened });
      } else if (child.url) {
        otherBookmarks.push({ title: safeTitle(child.title, hostFromUrl(child.url)), url: child.url });
      }
    }
  }

  return { folders, otherBookmarks: dedupeByUrl(otherBookmarks) };
};

const occupancyOf = (items: readonly WidgetItem[]) =>
  items
    .filter((l) => !l.isHeaderLink && l.x !== undefined && l.y !== undefined)
    .map((l) => ({ x: l.x as number, y: l.y as number, w: l.w ?? 1, h: l.h ?? 1 }));

export const buildImport = (
  existingItems: readonly WidgetItem[],
  rootNodes: readonly BookmarkTreeNodeLike[],
): ImportResult => {
  const { folders, otherBookmarks } = collectFolders(rootNodes);

  const groupByTitle = new Map<string, GroupItem>();
  for (const item of existingItems) {
    if (item.type === 'group') groupByTitle.set(item.title, item);
  }

  const allBuckets: FolderBucket[] = [...folders];
  if (otherBookmarks.length > 0) {
    allBuckets.push({ title: OTHER_GROUP_TITLE, bookmarks: otherBookmarks });
  }

  let nextItems: WidgetItem[] = [...existingItems];
  let groupsCreated = 0;
  let groupsMerged = 0;
  let bookmarksImported = 0;
  let firstNewGroupId: string | null = null;

  for (const bucket of allBuckets) {
    const existing = groupByTitle.get(bucket.title);
    if (existing) {
      const existingUrls = new Set(existing.links.map((l) => l.url));
      const newOnes = bucket.bookmarks.filter((b) => !existingUrls.has(b.url));
      if (newOnes.length === 0) continue;
      const startIndex = existing.links.length;
      const appended: LinkItem[] = newOnes.map((b, i) =>
        makeLink(b, existing.id, startIndex + i),
      );
      const updatedGroup: GroupItem = { ...existing, links: [...existing.links, ...appended] };
      nextItems = nextItems.map((l) => (l.id === existing.id ? updatedGroup : l));
      groupByTitle.set(bucket.title, updatedGroup);
      groupsMerged += 1;
      bookmarksImported += appended.length;
      continue;
    }

    const groupId = `group-${crypto.randomUUID()}`;
    const links: LinkItem[] = bucket.bookmarks.map((b, i) => makeLink(b, groupId, i));
    // No maxRows cap: when the existing grid is full, extend downward so new
    // groups tile in fresh space below — never stack on the same fallback slot.
    const occupancy = occupancyOf(nextItems);
    const maxOccupiedY = occupancy.reduce((acc, r) => Math.max(acc, r.y + r.h), 0);
    const slot = findFirstFreeSlot(occupancy, GROUP_W, GROUP_H, MAIN_COLS) ?? {
      x: 0,
      y: maxOccupiedY,
    };
    const group: GroupItem = {
      id: groupId,
      type: 'group',
      title: bucket.title,
      borderColor: DEFAULT_GROUP_BORDER,
      cols: GROUP_DEFAULT_COLS,
      links,
      x: slot.x,
      y: slot.y,
      w: GROUP_W,
      h: GROUP_H,
    };
    nextItems = [...nextItems, group];
    groupByTitle.set(bucket.title, group);
    groupsCreated += 1;
    bookmarksImported += links.length;
    if (firstNewGroupId === null) firstNewGroupId = group.id;
  }

  return {
    groupsCreated,
    groupsMerged,
    bookmarksImported,
    emptyFoldersSkipped: 0,
    firstNewGroupId,
    items: nextItems,
  };
};

export const extractNamedRoots = (rawTree: readonly BookmarkTreeNodeLike[]): BookmarkTreeNodeLike[] => {
  const namedRoots: BookmarkTreeNodeLike[] = [];
  for (const node of rawTree) {
    if (node.url) continue;
    if ((node.title ?? '').trim() === '') {
      for (const child of node.children ?? []) {
        if (!child.url) namedRoots.push(child);
      }
      continue;
    }
    namedRoots.push(node);
  }
  return namedRoots;
};

export const readBookmarkTree = async (): Promise<BookmarkTreeNodeLike[]> => {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    throw new Error('chrome.bookmarks is not available — open as an installed extension.');
  }
  const raw = await new Promise<BookmarkTreeNodeLike[]>((resolve, reject) => {
    chrome.bookmarks.getTree((nodes) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(nodes);
    });
  });
  return extractNamedRoots(raw);
};
