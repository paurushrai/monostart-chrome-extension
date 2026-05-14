import { useState, useEffect, useCallback } from 'react';
import { getLinks, saveLinks } from '../lib/storage';
import { saveLink } from '../lib/linkRepository';
import { RESIZABLE_TYPES, WidgetType } from '../lib/widgetCatalog';
import {
  removeLinkAnywhere,
  placeInHeader,
  placeInSection,
  placeOnMain,
} from '../lib/linkPlacement';

const HEADER_TARGET = 'header';

export function useLinks() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    getLinks().then(setLinks);

    // Auto-sync across extension components (popup -> tab)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes, area) => {
        if (area === 'local' && changes.dashboardLinks) {
          setLinks(changes.dashboardLinks.newValue || []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const replaceLinks = useCallback((next) => {
    setLinks(next);
    saveLinks(next);
  }, []);

  const handleLayoutChange = useCallback((layout) => {
    setLinks(prevLinks => {
      const updatedLinks = prevLinks.map(link => {
        const item = layout.find(l => l.i === link.id);
        if (!item) return link;
        const isResizableType = RESIZABLE_TYPES.has(link.type);
        return {
          ...link,
          x: item.x,
          y: item.y,
          ...(isResizableType ? { w: item.w, h: item.h } : {})
        };
      });
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleDelete = useCallback((id) => {
    const deleteNested = (items) => {
      return items
        .filter(item => item.id !== id)
        .map(item => {
          if (item.type === WidgetType.SECTION && item.links) {
            return { ...item, links: deleteNested(item.links) };
          }
          return item;
        });
    };
    setLinks(prev => {
      const next = deleteNested(prev);
      saveLinks(next);
      return next;
    });
  }, []);

  const handleViewModeChange = useCallback((id, newMode) => {
    const isIconOnly = newMode === 'icon';
    setLinks(prevLinks => {
      const updateNested = (items) => {
        return items.map(l => {
          if (l.id === id) {
            return {
              ...l,
              viewMode: newMode,
              w: isIconOnly ? 1 : 3,
              h: isIconOnly ? 1 : 1
            };
          }
          if (l.type === WidgetType.SECTION && l.links) {
            return { ...l, links: updateNested(l.links) };
          }
          return l;
        });
      };
      const updatedLinks = updateNested(prevLinks);
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleUpdateLink = useCallback((id, updates) => {
    setLinks(prevLinks => {
      const updateNested = (items) => {
        return items.map(l => {
          if (l.id === id) {
            return { ...l, ...updates };
          }
          if (l.type === WidgetType.SECTION && l.links) {
            return { ...l, links: updateNested(l.links) };
          }
          return l;
        });
      };
      const updatedLinks = updateNested(prevLinks);
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const handleMoveLink = useCallback((linkId, targetSectionId, targetCoords) => {
    setLinks(prevLinks => {
      const { cleanedLinks, foundLink } = removeLinkAnywhere(prevLinks, linkId);
      if (!foundLink) return prevLinks;

      let updatedLinks;
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

  const handleHeaderLinkReorder = useCallback((draggedId, targetId) => {
    setLinks(prevLinks => {
      const headerLinks = prevLinks.filter(l => l.isHeaderLink).sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedIndex = headerLinks.findIndex(l => l.id === draggedId);
      const targetIndex = headerLinks.findIndex(l => l.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prevLinks;

      const updatedHeaderLinks = [...headerLinks];
      const [draggedLink] = updatedHeaderLinks.splice(draggedIndex, 1);
      updatedHeaderLinks.splice(targetIndex, 0, draggedLink);

      const orderedHeaderLinks = updatedHeaderLinks.map((link, index) => ({
        ...link,
        order: index
      }));

      const updatedLinks = prevLinks.map(link => {
        const headerMatch = orderedHeaderLinks.find(hl => hl.id === link.id);
        return headerMatch ? headerMatch : link;
      });

      saveLinks(updatedLinks);
      return updatedLinks;
    });
  }, []);

  const addWidget = useCallback(async (widget) => {
    const saved = await saveLink({
      type: widget.type,
      ...widget.defaults,
    });
    if (!saved) return null;
    setLinks(prev => [...prev, saved]);
    return saved;
  }, []);

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
