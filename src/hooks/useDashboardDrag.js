import { useState, useRef, useCallback } from 'react';
import { MAIN_COLS, SECTION_DEFAULT_COLS } from '../lib/grid';
import { WidgetType } from '../lib/widgetCatalog';

const ROW_MARGIN_PX = 16;
const SECTION_INNER_ROW_HEIGHT = 58; // 50 rowHeight + 8 margin

const getEventCoords = (e) => {
  const x = e?.clientX ?? (e?.touches?.[0]?.clientX ?? e?.changedTouches?.[0]?.clientX);
  const y = e?.clientY ?? (e?.touches?.[0]?.clientY ?? e?.changedTouches?.[0]?.clientY);
  return { x, y };
};

const isInsideRect = (x, y, rect) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const findSectionAtPoint = (clientX, clientY) => {
  const sectionElements = document.querySelectorAll('[data-section-id]');
  for (const el of sectionElements) {
    if (isInsideRect(clientX, clientY, el.getBoundingClientRect())) {
      return el.getAttribute('data-section-id');
    }
  }
  return null;
};

/**
 * Owns all cross-grid drag coordination state for the dashboard:
 * - "drag link from main grid INTO a section"   (handleDragStart/Drag/Stop)
 * - "drag link OUT of a section onto main grid" (handleInnerDragStart/Drag/Stop)
 * Exposes gridRef (attach to main grid container), the live drag state for
 * rendering, and the handler callbacks for RGL / SectionWidget to forward.
 */
export function useDashboardDrag({ links, rowHeight, onMoveLink }) {
  const gridRef = useRef(null);
  const lastInnerDragCoordsRef = useRef(null);

  // Drag-INTO-section state
  const [activeDragSectionId, setActiveDragSectionId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedItemType, setDraggedItemType] = useState(null);
  const [dragCursorCoords, setDragCursorCoords] = useState(null);

  // Drag-OUT-of-section state (visualized as a placeholder on the main grid)
  const [activeDragOutItem, setActiveDragOutItem] = useState(null);
  const [dragOutCoords, setDragOutCoords] = useState(null);

  const checkCollision = useCallback((x, y, w, h) => {
    return links.some(item => {
      const isGoogleSearch = item.type === WidgetType.GOOGLE_SEARCH;
      const isSection = item.type === WidgetType.SECTION;
      const itemW = isGoogleSearch ? 6 : (isSection ? (item.w ?? 6) : (item.w ?? (item.viewMode === 'icon' ? 1 : 3)));
      const itemH = isGoogleSearch ? 1 : (isSection ? (item.h ?? 4) : (item.h ?? 1));
      const itemX = item.x ?? 0;
      const itemY = item.y ?? 0;
      return (
        x < itemX + itemW &&
        x + w > itemX &&
        y < itemY + itemH &&
        y + h > itemY
      );
    });
  }, [links]);

  const computeMainGridDropSlot = useCallback((item, clientX, clientY) => {
    const gridEl = gridRef.current;
    if (!gridEl) return null;
    const gridRect = gridEl.getBoundingClientRect();
    const colWidth = gridRect.width / MAIN_COLS;
    const rowH = rowHeight + ROW_MARGIN_PX;

    const scrollLeft = gridEl.scrollLeft || 0;
    const scrollTop = gridEl.scrollTop || 0;
    const localX = clientX - gridRect.left + scrollLeft;
    const localY = clientY - gridRect.top + scrollTop;

    const w = item.w ?? (item.viewMode === 'icon' ? 1 : 3);
    const h = item.h ?? 1;

    const gridX = Math.max(0, Math.min(MAIN_COLS - w, Math.floor(localX / colWidth)));
    const gridY = Math.max(0, Math.floor(localY / rowH));

    return { gridX, gridY, w, h };
  }, [rowHeight]);

  // --- Drag-out from a section -----------------------------------------------

  const handleInnerDragStart = useCallback((item /* , parentSectionId */) => {
    setActiveDragOutItem(item);
    lastInnerDragCoordsRef.current = null;
  }, []);

  const handleInnerDrag = useCallback((item, parentSectionId, clientX, clientY) => {
    lastInnerDragCoordsRef.current = { x: clientX, y: clientY };
    const sectionEl = document.querySelector(`[data-section-id="${parentSectionId}"]`);
    if (!sectionEl) return;

    const isOutside = !isInsideRect(clientX, clientY, sectionEl.getBoundingClientRect());

    if (!isOutside) {
      setDragOutCoords(null);
      return;
    }

    const slot = computeMainGridDropSlot(item, clientX, clientY);
    if (!slot) return;

    setActiveDragOutItem(item);

    if (checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) {
      setDragOutCoords(null);
    } else {
      setDragOutCoords({ x: slot.gridX, y: slot.gridY });
    }
  }, [computeMainGridDropSlot, checkCollision]);

  const handleInnerDragStop = useCallback((item, parentSectionId, clientX, clientY) => {
    let finalX = clientX;
    let finalY = clientY;
    if ((finalX === undefined || finalY === undefined) && lastInnerDragCoordsRef.current) {
      finalX = lastInnerDragCoordsRef.current.x;
      finalY = lastInnerDragCoordsRef.current.y;
    }

    if (finalX !== undefined && finalY !== undefined) {
      const sectionEl = document.querySelector(`[data-section-id="${parentSectionId}"]`);
      if (sectionEl && !isInsideRect(finalX, finalY, sectionEl.getBoundingClientRect())) {
        const slot = computeMainGridDropSlot(item, finalX, finalY);
        if (slot && !checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) {
          onMoveLink(item.id, null, { x: slot.gridX, y: slot.gridY });
        }
      }
    }

    setActiveDragOutItem(null);
    setDragOutCoords(null);
    lastInnerDragCoordsRef.current = null;
  }, [computeMainGridDropSlot, checkCollision, onMoveLink]);

  // --- Drag from main grid INTO a section ------------------------------------

  const handleDragStart = useCallback((_layout, _oldItem, newItem) => {
    const item = links.find(l => l.id === newItem.i);
    setDraggedItem(item || null);
    setDraggedItemType(item?.type || null);
  }, [links]);

  const handleDrag = useCallback((_layout, _oldItem, _newItem, _placeholder, e) => {
    if (!e || draggedItemType !== WidgetType.LINK) return;

    const { x: clientX, y: clientY } = getEventCoords(e);
    if (clientX === undefined || clientY === undefined) {
      setActiveDragSectionId((prev) => (prev ? null : prev));
      setDragCursorCoords(null);
      return;
    }

    setDragCursorCoords({ x: clientX, y: clientY });

    const targetSectionId = findSectionAtPoint(clientX, clientY);
    setActiveDragSectionId((prev) => (prev === targetSectionId ? prev : targetSectionId));
  }, [draggedItemType]);

  const handleDragStop = useCallback((_layout, _oldItem, newItem, _placeholder, e) => {
    setActiveDragSectionId(null);
    setDraggedItemType(null);
    setDraggedItem(null);
    setDragCursorCoords(null);

    if (!e) return;

    let { x: clientX, y: clientY } = getEventCoords(e);
    if ((clientX === undefined || clientY === undefined) && dragCursorCoords) {
      clientX = dragCursorCoords.x;
      clientY = dragCursorCoords.y;
    }
    if (clientX === undefined || clientY === undefined) return;

    const targetSectionId = findSectionAtPoint(clientX, clientY);
    if (!targetSectionId) return;

    const draggedLink = links.find(l => l.id === newItem.i && l.type === WidgetType.LINK);
    if (!draggedLink) return;

    // Compute drop slot inside the target section's inner container
    const sectionEl = document.querySelector(`[data-section-id="${targetSectionId}"]`);
    const sectionItem = links.find(l => l.id === targetSectionId);

    let targetCoords;
    if (sectionEl && sectionItem) {
      const containerEl = sectionEl.querySelector('.overflow-y-auto');
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const scrollLeft = containerEl.scrollLeft || 0;
        const scrollTop = containerEl.scrollTop || 0;
        const localX = clientX - rect.left + scrollLeft;
        const localY = clientY - rect.top + scrollTop;

        const cols = sectionItem.cols || SECTION_DEFAULT_COLS;
        const isIcon = draggedLink.viewMode === 'icon';
        const w = Math.min(isIcon ? 1 : 3, cols);

        const colWidth = rect.width / cols;
        const placeholderX = Math.max(0, Math.min(cols - w, Math.floor(localX / colWidth)));
        const placeholderY = Math.max(0, Math.floor(localY / SECTION_INNER_ROW_HEIGHT));

        targetCoords = { x: placeholderX, y: placeholderY };
      }
    }

    onMoveLink(draggedLink.id, targetSectionId, targetCoords);
  }, [links, dragCursorCoords, onMoveLink]);

  return {
    gridRef,
    // Drag state for renderers / placeholders
    activeDragSectionId,
    draggedItem,
    dragCursorCoords,
    activeDragOutItem,
    dragOutCoords,
    // Handlers
    handleDragStart,
    handleDrag,
    handleDragStop,
    handleInnerDragStart,
    handleInnerDrag,
    handleInnerDragStop,
  };
}
