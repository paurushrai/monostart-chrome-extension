import { useState, useEffect, useCallback } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { getLinks, saveLinks } from '../lib/storage';
import { saveLink } from '../lib/linkRepository';
import type { NewLinkInput } from '../lib/linkRepository';
import { RESIZABLE_TYPES, WidgetType } from '../lib/widgetCatalog';
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

export function useLinks(): UseLinks {
  const [links, setLinks] = useState<LinkItem[]>([]);

  useEffect(() => {
    getLinks().then(setLinks);

    // Auto-sync across extension components (popup -> tab)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        area: chrome.storage.AreaName,
      ): void => {
        if (area === 'local' && changes.dashboardLinks) {
          setLinks((changes.dashboardLinks.newValue as LinkItem[] | undefined) ?? []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const replaceLinks = useCallback((next: LinkItem[]) => {
    setLinks(next);
    saveLinks(next);
  }, []);

  const handleLayoutChange = useCallback((layout: Layout) => {
    setLinks((prevLinks) => {
      const updatedLinks = prevLinks.map((link) => {
        const item = layout.find((l) => l.i === link.id);
        if (!item) return link;
        const isResizableType = RESIZABLE_TYPES.has(link.type);
        return {
          ...link,
          x: item.x,
          y: item.y,
          ...(isResizableType ? { w: item.w, h: item.h } : {}),
        };
      });
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
      const updatedLinks = updateNested(prevLinks);
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
    // Singleton widgets: only one Google search may exist at a time.
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
    setLinks((prev) => [...prev, saved]);
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
