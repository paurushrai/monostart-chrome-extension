import { findFirstFreeSlot, MAIN_COLS, SECTION_DEFAULT_COLS } from './grid';
import type { LinkItem, RegularLink, Section } from '../types';

export interface BookmarkTreeNodeLike {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkTreeNodeLike[];
}

export interface ImportResult {
  sectionsCreated: number;
  sectionsMerged: number;
  bookmarksImported: number;
  emptyFoldersSkipped: number;
  firstNewSectionId: string | null;
  links: LinkItem[];
}

const OTHER_SECTION_TITLE = 'Other';
const DEFAULT_SECTION_BORDER = '200 73% 52%';
const SECTION_W = 4;
const SECTION_H = 4;

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

const makeLink = (b: { title: string; url: string }, sectionId: string, index: number): RegularLink => ({
  id: `bm-${crypto.randomUUID()}`,
  type: 'link',
  url: b.url,
  title: b.title,
  viewMode: 'icon',
  w: 1,
  h: 1,
  x: index % SECTION_DEFAULT_COLS,
  y: Math.floor(index / SECTION_DEFAULT_COLS),
  parentId: sectionId,
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

const occupancyOf = (items: readonly LinkItem[]) =>
  items
    .filter((l) => !l.isHeaderLink && l.x !== undefined && l.y !== undefined)
    .map((l) => ({ x: l.x as number, y: l.y as number, w: l.w ?? 1, h: l.h ?? 1 }));

export const buildImport = (
  existingLinks: readonly LinkItem[],
  rootNodes: readonly BookmarkTreeNodeLike[],
): ImportResult => {
  const { folders, otherBookmarks } = collectFolders(rootNodes);

  const sectionByTitle = new Map<string, Section>();
  for (const item of existingLinks) {
    if (item.type === 'section') sectionByTitle.set(item.title, item as Section);
  }

  const allBuckets: FolderBucket[] = [...folders];
  if (otherBookmarks.length > 0) {
    allBuckets.push({ title: OTHER_SECTION_TITLE, bookmarks: otherBookmarks });
  }

  let nextLinks: LinkItem[] = [...existingLinks];
  let sectionsCreated = 0;
  let sectionsMerged = 0;
  let bookmarksImported = 0;
  let firstNewSectionId: string | null = null;

  for (const bucket of allBuckets) {
    const existing = sectionByTitle.get(bucket.title);
    if (existing) {
      const existingUrls = new Set(existing.links.map((l) => l.url));
      const newOnes = bucket.bookmarks.filter((b) => !existingUrls.has(b.url));
      if (newOnes.length === 0) continue;
      const startIndex = existing.links.length;
      const appended: RegularLink[] = newOnes.map((b, i) =>
        makeLink(b, existing.id, startIndex + i),
      );
      const updatedSection: Section = { ...existing, links: [...existing.links, ...appended] };
      nextLinks = nextLinks.map((l) => (l.id === existing.id ? updatedSection : l));
      sectionByTitle.set(bucket.title, updatedSection);
      sectionsMerged += 1;
      bookmarksImported += appended.length;
      continue;
    }

    const sectionId = `section-${crypto.randomUUID()}`;
    const links: RegularLink[] = bucket.bookmarks.map((b, i) => makeLink(b, sectionId, i));
    // No maxRows cap: when the existing grid is full, extend downward so new
    // sections tile in fresh space below — never stack on the same fallback slot.
    const occupancy = occupancyOf(nextLinks);
    const maxOccupiedY = occupancy.reduce((acc, r) => Math.max(acc, r.y + r.h), 0);
    const slot = findFirstFreeSlot(occupancy, SECTION_W, SECTION_H, MAIN_COLS) ?? {
      x: 0,
      y: maxOccupiedY,
    };
    const section: Section = {
      id: sectionId,
      type: 'section',
      title: bucket.title,
      borderColor: DEFAULT_SECTION_BORDER,
      cols: SECTION_DEFAULT_COLS,
      links,
      x: slot.x,
      y: slot.y,
      w: SECTION_W,
      h: SECTION_H,
    };
    nextLinks = [...nextLinks, section];
    sectionByTitle.set(bucket.title, section);
    sectionsCreated += 1;
    bookmarksImported += links.length;
    if (firstNewSectionId === null) firstNewSectionId = section.id;
  }

  return {
    sectionsCreated,
    sectionsMerged,
    bookmarksImported,
    emptyFoldersSkipped: 0,
    firstNewSectionId,
    links: nextLinks,
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
