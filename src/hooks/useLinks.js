import { useState, useEffect, useCallback } from 'react';
import { getLinks, saveLinks } from '../lib/storage';
import { saveLink } from '../lib/linkRepository';

const RESIZABLE_TYPES = ['section', 'todo', 'timer', 'iframe', 'note', 'image', 'label', 'link'];

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
        const isResizableType = RESIZABLE_TYPES.includes(link.type);
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
          if (item.type === 'section' && item.links) {
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
          if (l.type === 'section' && l.links) {
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
          if (l.type === 'section' && l.links) {
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
      let foundLink = null;

      // Remove from top level or sections
      let cleanedLinks = prevLinks.filter(l => {
        if (l.id === linkId) {
          foundLink = l;
          return false;
        }
        return true;
      });

      cleanedLinks = cleanedLinks.map(item => {
        if (item.type === 'section' && item.links) {
          const hasLink = item.links.some(l => l.id === linkId);
          if (hasLink) {
            foundLink = item.links.find(l => l.id === linkId);
            return {
              ...item,
              links: item.links.filter(l => l.id !== linkId)
            };
          }
        }
        return item;
      });

      if (!foundLink) return prevLinks;

      let updatedLinks = [];
      if (targetSectionId === 'header') {
        const headerLinks = cleanedLinks.filter(l => l.isHeaderLink);
        const maxOrder = headerLinks.reduce((max, l) => Math.max(max, l.order || 0), -1);
        const nextOrder = maxOrder + 1;

        updatedLinks = [
          ...cleanedLinks,
          {
            ...foundLink,
            isHeaderLink: true,
            parentId: null,
            order: nextOrder,
            x: undefined,
            y: undefined
          }
        ];
      } else if (targetSectionId) {
        updatedLinks = cleanedLinks.map(item => {
          if (item.id === targetSectionId && item.type === 'section') {
            const sectionLinks = item.links || [];
            const sectionCols = item.cols || 3;
            const w = Math.min(foundLink.w ?? (foundLink.viewMode === 'icon' ? 1 : 3), sectionCols);
            const h = foundLink.h ?? 1;

            let newX = 0;
            let newY = 0;

            if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
              const cols = item.cols || 3;
              newX = Math.max(0, Math.min(cols - w, targetCoords.x));
              newY = Math.max(0, targetCoords.y);
            } else {
              const cols = item.cols || 3;
              const grid = [];
              sectionLinks.forEach(l => {
                const lx = l.x ?? 0;
                const ly = l.y ?? 0;
                const lw = Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, cols)), cols);
                const lh = l.h ?? 1;
                for (let r = ly; r < ly + lh; r++) {
                  while (grid.length <= r) grid.push(Array(cols).fill(false));
                  for (let c = lx; c < lx + lw && c < cols; c++) {
                    grid[r][c] = true;
                  }
                }
              });

              let placed = false;
              let r = 0;

              while (!placed) {
                while (grid.length <= r + h) grid.push(Array(cols).fill(false));
                for (let c = 0; c <= cols - w; c++) {
                  let canFit = true;
                  for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                      if (grid[r + i][c + j]) {
                        canFit = false;
                        break;
                      }
                    }
                    if (!canFit) break;
                  }
                  if (canFit) {
                    newX = c;
                    newY = r;
                    placed = true;
                    break;
                  }
                }
                r++;
              }
            }

            return {
              ...item,
              links: [
                ...sectionLinks,
                {
                  ...foundLink,
                  isHeaderLink: false,
                  x: newX,
                  y: newY,
                  w,
                  h
                }
              ]
            };
          }
          return item;
        });
      } else {
        // Put back in main dashboard grid
        const w = foundLink.w ?? (foundLink.viewMode === 'icon' ? 1 : 3);
        const h = foundLink.h ?? 1;

        let newX = 0;
        let newY = 0;

        if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
          const maxCols = 18;
          newX = Math.max(0, Math.min(maxCols - w, targetCoords.x));
          newY = Math.max(0, targetCoords.y);
        } else {
          const maxCols = 18;
          const maxRows = 12;
          const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));

          cleanedLinks.forEach(link => {
            if (link.x !== undefined && link.y !== undefined) {
              for (let r = link.y; r < link.y + (link.h || 1) && r < maxRows; r++) {
                for (let c = link.x; c < link.x + (link.w || 1) && c < maxCols; c++) {
                  grid[r][c] = true;
                }
              }
            }
          });

          let placed = false;

          for (let r = 0; r <= maxRows - h && !placed; r++) {
            for (let c = 0; c <= maxCols - w && !placed; c++) {
              let canFit = true;
              for (let i = 0; i < h; i++) {
                for (let j = 0; j < w; j++) {
                  if (grid[r + i][c + j]) {
                    canFit = false;
                    break;
                  }
                }
                if (!canFit) break;
              }
              if (canFit) {
                newX = c;
                newY = r;
                placed = true;
              }
            }
          }

          if (!placed) {
            newX = 0;
            newY = 11;
          }
        }

        updatedLinks = [
          ...cleanedLinks,
          {
            ...foundLink,
            isHeaderLink: false,
            x: newX,
            y: newY,
            w,
            h
          }
        ];
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
