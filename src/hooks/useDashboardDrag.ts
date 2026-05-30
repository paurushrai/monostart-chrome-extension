import { useState, useRef, useCallback, type RefObject, type MutableRefObject } from 'react';
import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import { MAIN_COLS, SECTION_DEFAULT_COLS } from '../lib/grid';
import { WidgetType } from '../lib/widgetCatalog';
import { pickSwapTarget } from '../lib/swapPlanner';
import type { LinkItem, RegularLink, Section, DragCoords, GridSlot } from '../types';

const ROW_MARGIN_PX = 16;
const SECTION_INNER_ROW_HEIGHT = 58; // 50 rowHeight + 8 margin

interface MainDropSlot {
  gridX: number;
  gridY: number;
  w: number;
  h: number;
}

type RglDragHandler = (
  layout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null,
  placeholder: LayoutItem | null,
  event: Event,
  element: HTMLElement | null,
) => void;

const getEventCoords = (e: Event | undefined): { x: number | undefined; y: number | undefined } => {
  const me = e as MouseEvent | undefined;
  const te = e as TouchEvent | undefined;
  const x = me?.clientX ?? te?.touches?.[0]?.clientX ?? te?.changedTouches?.[0]?.clientX;
  const y = me?.clientY ?? te?.touches?.[0]?.clientY ?? te?.changedTouches?.[0]?.clientY;
  return { x, y };
};

const isInsideRect = (x: number, y: number, rect: DOMRect): boolean =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const findSectionAtPoint = (clientX: number, clientY: number): string | null => {
  const sectionElements = document.querySelectorAll<HTMLElement>('[data-section-id]');
  for (const el of sectionElements) {
    if (isInsideRect(clientX, clientY, el.getBoundingClientRect())) {
      return el.getAttribute('data-section-id');
    }
  }
  return null;
};

const HEADER_TARGET = 'header';

const isPointOverHeader = (clientX: number, clientY: number): boolean => {
  const el = document.querySelector<HTMLElement>('[data-header-drop-target]');
  if (!el) return false;
  return isInsideRect(clientX, clientY, el.getBoundingClientRect());
};

interface UseDashboardDragOptions {
  links: readonly LinkItem[];
  rowHeight: number;
  onMoveLink: (linkId: string, targetSectionId: string | null, targetCoords?: GridSlot) => void;
  onSwap: (draggedId: string, targetId: string, draggedSourceRect?: { x: number; y: number; w: number; h: number }) => void;
  onHeaderTargetChange?: (isOver: boolean) => void;
}

export interface UseDashboardDrag {
  gridRef: RefObject<HTMLDivElement | null>;
  activeDragSectionId: string | null;
  activeSwapTargetId: string | null;
  draggedItem: LinkItem | null;
  dragCursorCoords: DragCoords | null;
  activeDragOutItem: LinkItem | null;
  dragOutCoords: GridSlot | null;
  handleDragStart: RglDragHandler;
  handleDrag: RglDragHandler;
  handleDragStop: RglDragHandler;
  handleInnerDragStart: (item: RegularLink, parentSectionId: string) => void;
  handleInnerDrag: (item: RegularLink, parentSectionId: string, clientX: number, clientY: number) => void;
  handleInnerDragStop: (item: RegularLink, parentSectionId: string, clientX: number, clientY: number) => void;
  handleExternalDrop: (linkId: string, clientX: number, clientY: number) => boolean;
}

const CLICK_VS_DRAG_THRESHOLD_PX = 8;

export function useDashboardDrag({
  links,
  rowHeight,
  onMoveLink,
  onSwap,
  onHeaderTargetChange,
}: UseDashboardDragOptions): UseDashboardDrag {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastInnerDragCoordsRef: MutableRefObject<DragCoords | null> = useRef<DragCoords | null>(null);
  const dragStartCoordsRef = useRef<DragCoords | null>(null);

  const [activeDragSectionId, setActiveDragSectionId] = useState<string | null>(null);
  const [activeSwapTargetId, setActiveSwapTargetId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<LinkItem | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<string | null>(null);
  const [dragCursorCoords, setDragCursorCoords] = useState<DragCoords | null>(null);

  const [activeDragOutItem, setActiveDragOutItem] = useState<LinkItem | null>(null);
  const [dragOutCoords, setDragOutCoords] = useState<GridSlot | null>(null);

  const checkCollision = useCallback((x: number, y: number, w: number, h: number): boolean => {
    return links.some((item) => {
      const isGoogleSearch = item.type === WidgetType.GOOGLE_SEARCH;
      const isSection = item.type === WidgetType.SECTION;
      const itemW = isGoogleSearch ? (item.w ?? 6) : (isSection ? (item.w ?? 6) : (item.w ?? (item.viewMode === 'icon' ? 1 : 3)));
      const itemH = isGoogleSearch ? (item.h ?? 1) : (isSection ? (item.h ?? 4) : (item.h ?? 1));
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

  const computeMainGridDropSlot = useCallback(
    (item: LinkItem | RegularLink, clientX: number, clientY: number): MainDropSlot | null => {
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
    },
    [rowHeight],
  );

  const computeCursorCell = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const gridEl = gridRef.current;
      if (!gridEl) return null;
      const gridRect = gridEl.getBoundingClientRect();
      const colWidth = gridRect.width / MAIN_COLS;
      const rowH = rowHeight + ROW_MARGIN_PX;
      const scrollLeft = gridEl.scrollLeft || 0;
      const scrollTop = gridEl.scrollTop || 0;
      const localX = clientX - gridRect.left + scrollLeft;
      const localY = clientY - gridRect.top + scrollTop;
      return { x: Math.floor(localX / colWidth), y: Math.floor(localY / rowH) };
    },
    [rowHeight],
  );

  const computeSectionDropCoords = useCallback(
    (item: RegularLink, sectionId: string, clientX: number, clientY: number): GridSlot | undefined => {
      const sectionEl = document.querySelector(`[data-section-id="${sectionId}"]`);
      const sectionItem = links.find((l) => l.id === sectionId) as Section | undefined;
      if (!sectionEl || !sectionItem) return undefined;
      const containerEl = sectionEl.querySelector<HTMLElement>('.overflow-y-auto');
      if (!containerEl) return undefined;

      const rect = containerEl.getBoundingClientRect();
      const scrollLeft = containerEl.scrollLeft || 0;
      const scrollTop = containerEl.scrollTop || 0;
      const localX = clientX - rect.left + scrollLeft;
      const localY = clientY - rect.top + scrollTop;

      const cols = sectionItem.cols || SECTION_DEFAULT_COLS;
      const w = Math.min(item.viewMode === 'icon' ? 1 : 3, cols);

      const colWidth = rect.width / cols;
      const placeholderX = Math.max(0, Math.min(cols - w, Math.floor(localX / colWidth)));
      const placeholderY = Math.max(0, Math.floor(localY / SECTION_INNER_ROW_HEIGHT));
      return { x: placeholderX, y: placeholderY };
    },
    [links],
  );

  const handleInnerDragStart = useCallback((item: RegularLink, _parentSectionId: string) => {
    setActiveDragOutItem(item);
    lastInnerDragCoordsRef.current = null;
  }, []);

  const handleInnerDrag = useCallback((item: RegularLink, parentSectionId: string, clientX: number, clientY: number) => {
    lastInnerDragCoordsRef.current = { x: clientX, y: clientY };

    if (isPointOverHeader(clientX, clientY)) {
      onHeaderTargetChange?.(true);
      setActiveDragOutItem(item);
      setDragOutCoords(null);
      setActiveDragSectionId(null);
      setDragCursorCoords(null);
      setDraggedItem(null);
      return;
    }
    onHeaderTargetChange?.(false);

    const hoverSectionId = findSectionAtPoint(clientX, clientY);

    if (hoverSectionId === parentSectionId) {
      setActiveDragOutItem(null);
      setDragOutCoords(null);
      setActiveDragSectionId(null);
      setDragCursorCoords(null);
      setDraggedItem(null);
      return;
    }

    if (hoverSectionId && hoverSectionId !== parentSectionId) {
      setActiveDragOutItem(item);
      setDragOutCoords(null);
      setActiveDragSectionId(hoverSectionId);
      setDragCursorCoords({ x: clientX, y: clientY });
      setDraggedItem(item);
      return;
    }

    setActiveDragSectionId(null);
    setDragCursorCoords(null);
    setDraggedItem(null);

    const slot = computeMainGridDropSlot(item, clientX, clientY);
    if (!slot) {
      setDragOutCoords(null);
      return;
    }

    setActiveDragOutItem(item);
    if (checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) {
      setDragOutCoords(null);
    } else {
      setDragOutCoords({ x: slot.gridX, y: slot.gridY });
    }
  }, [computeMainGridDropSlot, checkCollision, onHeaderTargetChange]);

  const handleInnerDragStop = useCallback((item: RegularLink, parentSectionId: string, clientX: number, clientY: number) => {
    let finalX: number | undefined = clientX;
    let finalY: number | undefined = clientY;
    if ((finalX === undefined || finalY === undefined) && lastInnerDragCoordsRef.current) {
      finalX = lastInnerDragCoordsRef.current.x;
      finalY = lastInnerDragCoordsRef.current.y;
    }

    if (finalX !== undefined && finalY !== undefined) {
      if (isPointOverHeader(finalX, finalY)) {
        onMoveLink(item.id, HEADER_TARGET);
      } else {
        const dropSectionId = findSectionAtPoint(finalX, finalY);

        if (dropSectionId && dropSectionId !== parentSectionId) {
          const targetCoords = computeSectionDropCoords(item, dropSectionId, finalX, finalY);
          onMoveLink(item.id, dropSectionId, targetCoords);
        } else if (!dropSectionId) {
          const slot = computeMainGridDropSlot(item, finalX, finalY);
          if (slot && !checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) {
            onMoveLink(item.id, null, { x: slot.gridX, y: slot.gridY });
          }
        }
      }
    }

    onHeaderTargetChange?.(false);
    setActiveDragOutItem(null);
    setDragOutCoords(null);
    setActiveDragSectionId(null);
    setDragCursorCoords(null);
    setDraggedItem(null);
    lastInnerDragCoordsRef.current = null;
  }, [computeMainGridDropSlot, computeSectionDropCoords, checkCollision, onMoveLink, onHeaderTargetChange]);

  const handleDragStart: RglDragHandler = useCallback((_layout, _oldItem, newItem, _placeholder, e) => {
    if (!newItem) return;
    const item = links.find((l) => l.id === newItem.i);
    setDraggedItem(item || null);
    setDraggedItemType(item?.type || null);
    const coords = getEventCoords(e);
    dragStartCoordsRef.current = coords.x !== undefined && coords.y !== undefined
      ? { x: coords.x, y: coords.y }
      : null;
  }, [links]);

  const handleDrag: RglDragHandler = useCallback((_layout, _oldItem, newItem, _placeholder, e) => {
    if (!e) return;

    const { x: clientX, y: clientY } = getEventCoords(e);
    if (clientX === undefined || clientY === undefined) {
      setActiveDragSectionId((prev) => (prev ? null : prev));
      setActiveSwapTargetId((prev) => (prev ? null : prev));
      setDragCursorCoords(null);
      onHeaderTargetChange?.(false);
      return;
    }

    setDragCursorCoords({ x: clientX, y: clientY });

    // Existing LINK-drag affordances (header target, section drop target)
    if (draggedItemType === WidgetType.LINK) {
      if (isPointOverHeader(clientX, clientY)) {
        onHeaderTargetChange?.(true);
        setActiveDragSectionId((prev) => (prev ? null : prev));
        setActiveSwapTargetId((prev) => (prev ? null : prev));
        return;
      }
      onHeaderTargetChange?.(false);
      const targetSectionId = findSectionAtPoint(clientX, clientY);
      if (targetSectionId) {
        setActiveDragSectionId((prev) => (prev === targetSectionId ? prev : targetSectionId));
        setActiveSwapTargetId((prev) => (prev ? null : prev));
        return;
      }
      setActiveDragSectionId((prev) => (prev ? null : prev));
    } else {
      onHeaderTargetChange?.(false);
      setActiveDragSectionId((prev) => (prev ? null : prev));
    }

    // Live swap-target preview: whichever widget the cursor is over (excluding self).
    if (!newItem) return;
    const cursorCell = computeCursorCell(clientX, clientY);
    if (!cursorCell) {
      setActiveSwapTargetId((prev) => (prev ? null : prev));
      return;
    }
    const hit = links.find((l) =>
      l.id !== newItem.i &&
      !l.isHeaderLink &&
      l.x !== undefined && l.y !== undefined &&
      cursorCell.x >= l.x && cursorCell.x < l.x + (l.w ?? 1) &&
      cursorCell.y >= l.y && cursorCell.y < l.y + (l.h ?? 1),
    );
    const next = hit?.id ?? null;
    setActiveSwapTargetId((prev) => (prev === next ? prev : next));
  }, [draggedItemType, links, computeCursorCell, onHeaderTargetChange]);

  const handleDragStop: RglDragHandler = useCallback((_layout, oldItem, newItem, _placeholder, e) => {
    setActiveDragSectionId(null);
    setActiveSwapTargetId(null);
    setDraggedItemType(null);
    setDraggedItem(null);
    setDragCursorCoords(null);
    onHeaderTargetChange?.(false);

    const startCoords = dragStartCoordsRef.current;
    dragStartCoordsRef.current = null;

    if (!e || !newItem) return;

    let { x: clientX, y: clientY } = getEventCoords(e);
    if ((clientX === undefined || clientY === undefined) && dragCursorCoords) {
      clientX = dragCursorCoords.x;
      clientY = dragCursorCoords.y;
    }
    if (clientX === undefined || clientY === undefined) return;

    // Distinguish a click from a real drag. RGL fires onDragStop even for tiny
    // pointer jitter on a click, which would falsely trigger swaps. Require the
    // cursor to have moved at least CLICK_VS_DRAG_THRESHOLD_PX in either axis.
    if (startCoords) {
      const dx = Math.abs(clientX - startCoords.x);
      const dy = Math.abs(clientY - startCoords.y);
      if (dx < CLICK_VS_DRAG_THRESHOLD_PX && dy < CLICK_VS_DRAG_THRESHOLD_PX) return;
    }

    if (isPointOverHeader(clientX, clientY)) {
      const draggedLinkForHeader = links.find((l) => l.id === newItem.i && l.type === WidgetType.LINK) as RegularLink | undefined;
      if (draggedLinkForHeader) onMoveLink(draggedLinkForHeader.id, HEADER_TARGET);
      return;
    }

    const targetSectionId = findSectionAtPoint(clientX, clientY);
    if (targetSectionId) {
      const draggedLink = links.find((l) => l.id === newItem.i && l.type === WidgetType.LINK) as RegularLink | undefined;
      if (draggedLink) {
        // Link drag-INTO section: existing behavior
        const targetCoords = computeSectionDropCoords(draggedLink, targetSectionId, clientX, clientY);
        onMoveLink(draggedLink.id, targetSectionId, targetCoords);
        return;
      }
      // Non-link widget dragged onto a section: fall through to swap detection
      // (the dragged item can't enter the section; the section becomes the swap target)
    }

    // Main-grid swap detection: react-grid-layout with preventCollision=true
    // doesn't reject collisions — it snaps the dragged item to the closest
    // non-colliding slot. So `newItem` ≠ `oldItem` is meaningless. Instead we
    // check the user's cursor-intent: does the slot the user actually aimed at
    // overlap another widget? If yes, swap them (using the PRE-drag rect so the
    // exchange is clean, ignoring whatever intermediate slot RGL moved the
    // dragged item to).
    const draggedItem = links.find((l) => l.id === newItem.i);
    if (!draggedItem || draggedItem.isHeaderLink) return;
    if (!oldItem) return;

    const others = links
      .filter((l) => l.id !== draggedItem.id && !l.isHeaderLink && l.x !== undefined && l.y !== undefined)
      .map((l) => ({
        id: l.id,
        rect: { x: l.x as number, y: l.y as number, w: l.w ?? 1, h: l.h ?? 1 },
      }));

    // Primary: whatever the cursor lands on. Most forgiving — "drop on this widget = swap with it".
    let swapTargetId: string | null = null;
    const cursorCell = computeCursorCell(clientX, clientY);
    if (cursorCell) {
      const hit = others.find((o) =>
        cursorCell.x >= o.rect.x &&
        cursorCell.x < o.rect.x + o.rect.w &&
        cursorCell.y >= o.rect.y &&
        cursorCell.y < o.rect.y + o.rect.h,
      );
      if (hit) swapTargetId = hit.id;
    }

    // Fallback: cursor missed all widgets (e.g., between cells), but the dragged
    // item's intended slot overlaps something. Use overlap-area winner.
    if (!swapTargetId) {
      const slot = computeMainGridDropSlot(draggedItem, clientX, clientY);
      if (slot) {
        const intendedRect = { x: slot.gridX, y: slot.gridY, w: slot.w, h: slot.h };
        swapTargetId = pickSwapTarget(intendedRect, others);
      }
    }

    if (swapTargetId) {
      onSwap(draggedItem.id, swapTargetId, {
        x: oldItem.x, y: oldItem.y, w: oldItem.w, h: oldItem.h,
      });
    }
  }, [links, dragCursorCoords, computeMainGridDropSlot, computeCursorCell, computeSectionDropCoords, onMoveLink, onSwap, onHeaderTargetChange]);

  const handleExternalDrop = useCallback((linkId: string, clientX: number, clientY: number): boolean => {
    const externalPlaceholder = { viewMode: 'icon' as const, w: 1, h: 1 } as RegularLink;
    const slot = computeMainGridDropSlot(externalPlaceholder, clientX, clientY);
    if (!slot) return false;
    if (checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) return false;
    onMoveLink(linkId, null, { x: slot.gridX, y: slot.gridY });
    return true;
  }, [computeMainGridDropSlot, checkCollision, onMoveLink]);

  return {
    gridRef,
    activeDragSectionId,
    activeSwapTargetId,
    draggedItem,
    dragCursorCoords,
    activeDragOutItem,
    dragOutCoords,
    handleDragStart,
    handleDrag,
    handleDragStop,
    handleInnerDragStart,
    handleInnerDrag,
    handleInnerDragStop,
    handleExternalDrop,
  };
}
