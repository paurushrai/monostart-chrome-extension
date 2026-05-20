import { useRef, useCallback } from 'react';

/**
 * Wraps a section's inner-RGL drag callbacks with "is the cursor outside this
 * section?" tracking. The wrapped callbacks forward to the consumer's outer
 * callbacks (handleInnerDragStart / handleInnerDrag / handleInnerDragStop in
 * DashboardGrid) AND mark `isMovingOutRef.current = true` if the drag ends
 * outside the section, so the section's own onLayoutChange knows to skip
 * persisting the now-stale inner layout.
 */
export function useSectionDragOut({
  containerRef,
  sectionId,
  links,
  onInnerDragStart,
  onInnerDrag,
  onInnerDragStop,
}) {
  const isMovingOutRef = useRef(false);
  const lastCursorCoordsRef = useRef(null);

  const handleRglDragStart = useCallback((layout, oldItem, newItem) => {
    lastCursorCoordsRef.current = null;
    if (onInnerDragStart) {
      const subItem = links.find(l => l.id === newItem.i);
      if (subItem) onInnerDragStart(subItem, sectionId);
    }
  }, [links, sectionId, onInnerDragStart]);

  const handleRglDrag = useCallback((layout, oldItem, newItem, placeholder, e) => {
    if (!onInnerDrag || !e) return;
    const subItem = links.find(l => l.id === newItem.i);
    if (!subItem) return;
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;
    lastCursorCoordsRef.current = { x: clientX, y: clientY };
    onInnerDrag(subItem, sectionId, clientX, clientY);
  }, [links, sectionId, onInnerDrag]);

  const handleRglDragStop = useCallback((layout, oldItem, newItem, placeholder, e) => {
    let clientX = e?.clientX ?? (e?.touches?.[0]?.clientX ?? e?.changedTouches?.[0]?.clientX);
    let clientY = e?.clientY ?? (e?.touches?.[0]?.clientY ?? e?.changedTouches?.[0]?.clientY);

    if ((clientX === undefined || clientY === undefined) && lastCursorCoordsRef.current) {
      clientX = lastCursorCoordsRef.current.x;
      clientY = lastCursorCoordsRef.current.y;
    }

    let isOutside = false;
    if (clientX !== undefined && clientY !== undefined && containerRef.current) {
      const parentWidgetEl = containerRef.current.closest('[data-section-id]');
      if (parentWidgetEl) {
        const parentRect = parentWidgetEl.getBoundingClientRect();
        isOutside =
          clientX < parentRect.left ||
          clientX > parentRect.right ||
          clientY < parentRect.top ||
          clientY > parentRect.bottom;
      }
    }

    isMovingOutRef.current = isOutside;

    if (onInnerDragStop && clientX !== undefined && clientY !== undefined) {
      const subItem = links.find(l => l.id === newItem.i);
      if (subItem) {
        onInnerDragStop(subItem, sectionId, clientX, clientY);
      }
    }

    lastCursorCoordsRef.current = null;
  }, [containerRef, links, sectionId, onInnerDragStop]);

  return {
    isMovingOutRef,
    handleRglDragStart,
    handleRglDrag,
    handleRglDragStop,
  };
}
