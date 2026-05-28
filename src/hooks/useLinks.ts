import { useState, useEffect, useCallback } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { getLinks, getLinksSync, saveLinks } from '../lib/storage';
import { saveLink } from '../lib/linkRepository';
import type { NewLinkInput } from '../lib/linkRepository';
import { RESIZABLE_TYPES, WidgetType } from '../lib/widgetCatalog';
import { findFirstFreeSlot, MAIN_COLS, MAIN_ROWS } from '../lib/grid';
import { cleanupOrphanedWidgetData, removeWidgetDataForId } from '../lib/widgetDataCleanup';
import {
  removeLinkAnywhere,
  placeInHeader,
  placeInSection,
  placeOnMain,
} from '../lib/linkPlacement';
import type { LinkItem, Section, GridSlot } from '../types';

const HEADER_TARGET = 'header';

export interface UseLinks {
  links: LinkItem[];
  replaceLinks: (next: LinkItem[]) => void;
  handleLayoutChange: (layout: Layout) => void;
  handleDelete: (id: string) => void;
  handleViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  handleUpdateLink: (id: string, updates: Partial<LinkItem>) => void;
  handleMoveLink: (linkId: string, targetSectionId: string | null | undefined, targetCoords?: GridSlot) => void;
  handleHeaderLinkReorder: (draggedId: string, targetId: string) => void;
  addWidget: (widget: { type: LinkItem['type']; defaults?: Partial<LinkItem> }) => Promise<LinkItem | null>;
}

const migrateGoogleSearchHeight = (items: LinkItem[]): LinkItem[] =>
  items.map((l) =>
    l.type === WidgetType.GOOGLE_SEARCH && (l.h ?? 1) > 1 ? { ...l, h: 1 } : l,
  );

const dedupeById = (items: LinkItem[]): LinkItem[] => {
  const seen = new Set<string>();
  const out: LinkItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
};

const normalize = (items: LinkItem[]): LinkItem[] => dedupeById(migrateGoogleSearchHeight(items));

export function useLinks(): UseLinks {
  const [links, setLinks] = useState<LinkItem[]>(() => normalize(getLinksSync()));

  useEffect(() => {
    getLinks().then((stored) => {
      const migrated = normalize(stored);
      if (JSON.stringify(migrated) !== JSON.stringify(stored)) {
        saveLinks(migrated);
      }
      setLinks((prev) => {
        if (prev.length === migrated.length && JSON.stringify(prev) === JSON.stringify(migrated)) return prev;
        return migrated;
      });
      const liveIds = new Set<string>(migrated.map((l) => l.id));
      cleanupOrphanedWidgetData(liveIds).catch(() => { /* empty */ });
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        area: chrome.storage.AreaName,
      ): void => {
        if (area !== 'local' || !changes.dashboardLinks) return;
        const incoming = dedupeById((changes.dashboardLinks.newValue as LinkItem[] | undefined) ?? []);
        setLinks((prev) => {
          if (prev.length === incoming.length && JSON.stringify(prev) === JSON.stringify(incoming)) {
            return prev;
          }
          return incoming;
        });
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const replaceLinks = useCallback((next: LinkItem[]) => {
    const clean = dedupeById(next);
    setLinks(clean);
    saveLinks(clean);
  }, []);

  const handleLayoutChange = useCallback((layout: Layout) => {
    setLinks((prevLinks) => {
      const layoutById = new Map(layout.map((l) => [l.i, l]));
      let mutated = false;
      const updatedLinks = prevLinks.map((link) => {
        if (link.isHeaderLink) return link;
        const item = layoutById.get(link.id);
        if (!item) return link;
        const isResizableType = RESIZABLE_TYPES.has(link.type);
        const nextW = isResizableType ? item.w : link.w;
        const nextH = isResizableType ? item.h : link.h;
        if (link.x === item.x && link.y === item.y && link.w === nextW && link.h === nextH) {
          return link;
        }
        mutated = true;
        return {
          ...link,
          x: item.x,
          y: item.y,
          ...(isResizableType ? { w: item.w, h: item.h } : {}),
        };
      });
      if (!mutated) return prevLinks;
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    const deleteNested = (items: LinkItem[]): LinkItem[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.type === WidgetType.SECTION && (item as Section).links) {
            const section = item as Section;
            return {
              ...section,
              links: deleteNested(section.links as unknown as LinkItem[]) as unknown as Section['links'],
            };
          }
          return item;
        });
    };
    setLinks((prev) => {
      const next = deleteNested(prev);
      saveLinks(next);
      removeWidgetDataForId(id);
      return next;
    });
  }, []);

  const handleViewModeChange = useCallback((id: string, newMode: 'icon' | 'icon+text') => {
    const isIconOnly = newMode === 'icon';
    setLinks((prevLinks) => {
      const updateNested = (items: LinkItem[]): LinkItem[] => {
        return items.map((l) => {
          if (l.id === id) {
            return {
              ...l,
              viewMode: newMode,
              w: isIconOnly ? 1 : 3,
              h: isIconOnly ? 1 : 1,
            };
          }
          if (l.type === WidgetType.SECTION && (l as Section).links) {
            const section = l as Section;
            return {
              ...section,
              links: updateNested(section.links as unknown as LinkItem[]) as unknown as Section['links'],
            };
          }
          return l;
        });
      };
      const updatedLinks = updateNested(prevLinks);
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleUpdateLink = useCallback((id: string, updates: Partial<LinkItem>) => {
    setLinks((prevLinks) => {
      const updateNested = (items: LinkItem[]): LinkItem[] => {
        return items.map((l) => {
          if (l.id === id) {
            return { ...l, ...updates } as LinkItem;
          }
          if (l.type === WidgetType.SECTION && (l as Section).links) {
            const section = l as Section;
            return {
              ...section,
              links: updateNested(section.links as unknown as LinkItem[]) as unknown as Section['links'],
            };
          }
          return l;
        });
      };
      let updatedLinks = updateNested(prevLinks);

      const isSizeChange = updates.w !== undefined || updates.h !== undefined;
      if (isSizeChange) {
        const updated = updatedLinks.find((l) => l.id === id);
        if (updated && !updated.isHeaderLink && updated.x !== undefined && updated.y !== undefined) {
          const w = updated.w ?? 1;
          const h = updated.h ?? 1;
          const x = updated.x;
          const y = updated.y;
          const others = updatedLinks
            .filter((l) => l.id !== id && !l.isHeaderLink && l.x !== undefined && l.y !== undefined)
            .map((l) => ({ x: l.x as number, y: l.y as number, w: l.w ?? 1, h: l.h ?? 1 }));
          const overlaps = others.some(
            (o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y,
          );
          if (overlaps) {
            const slot = findFirstFreeSlot(others, w, h, MAIN_COLS, MAIN_ROWS);
            if (slot) {
              updatedLinks = updatedLinks.map((l) =>
                l.id === id ? { ...l, x: slot.x, y: slot.y } : l,
              );
            }
          }
        }
      }

      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleMoveLink = useCallback((
    linkId: string,
    targetSectionId: string | null | undefined,
    targetCoords?: GridSlot,
  ) => {
    setLinks((prevLinks) => {
      const { cleanedLinks, foundLink } = removeLinkAnywhere(prevLinks, linkId);
      if (!foundLink) return prevLinks;

      let updatedLinks: LinkItem[];
      if (targetSectionId === HEADER_TARGET) {
        updatedLinks = placeInHeader(cleanedLinks, foundLink);
      } else if (targetSectionId) {
        updatedLinks = placeInSection(cleanedLinks, foundLink, targetSectionId, targetCoords);
      } else {
        updatedLinks = placeOnMain(cleanedLinks, foundLink, targetCoords);
      }

      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleHeaderLinkReorder = useCallback((draggedId: string, targetId: string) => {
    setLinks((prevLinks) => {
      const headerLinks = prevLinks
        .filter((l) => l.isHeaderLink)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedIndex = headerLinks.findIndex((l) => l.id === draggedId);
      const targetIndex = headerLinks.findIndex((l) => l.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prevLinks;

      const updatedHeaderLinks = [...headerLinks];
      const [draggedLink] = updatedHeaderLinks.splice(draggedIndex, 1);
      if (!draggedLink) return prevLinks;
      updatedHeaderLinks.splice(targetIndex, 0, draggedLink);

      const orderedHeaderLinks = updatedHeaderLinks.map((link, index) => ({
        ...link,
        order: index,
      }));

      const updatedLinks = prevLinks.map((link) => {
        const headerMatch = orderedHeaderLinks.find((hl) => hl.id === link.id);
        return headerMatch ? headerMatch : link;
      });

      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const addWidget = useCallback(async (widget: { type: LinkItem['type']; defaults?: Partial<LinkItem> }) => {
    if (widget.type === WidgetType.GOOGLE_SEARCH) {
      const alreadyExists = links.some((l) => l.type === WidgetType.GOOGLE_SEARCH);
      if (alreadyExists) return null;
    }

    const input: NewLinkInput = {
      type: widget.type,
      ...widget.defaults,
    };
    const saved = await saveLink(input);
    if (!saved) return null;
    setLinks((prev) => (prev.some((l) => l.id === saved.id) ? prev : [...prev, saved]));
    return saved;
  }, [links]);

  return {
    links,
    replaceLinks,
    handleLayoutChange,
    handleDelete,
    handleViewModeChange,
    handleUpdateLink,
    handleMoveLink,
    handleHeaderLinkReorder,
    addWidget,
  };
}
