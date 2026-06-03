import { useState, useRef, useCallback, type RefObject, type MutableRefObject } from 'react';
import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import { MAIN_COLS, GROUP_DEFAULT_COLS } from '../lib/grid';
import { WidgetType } from '../lib/widgetCatalog';
import { pickSwapTarget } from '../lib/swapPlanner';
import type { WidgetItem, RegularLink, Group, DragCoords, GridSlot } from '../types';

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

const findGroupAtPoint = (clientX: number, clientY: number): string | null => {
  const groupElements = document.querySelectorAll<HTMLElement>('[data-group-id]');
  for (const el of groupElements) {
    if (isInsideRect(clientX, clientY, el.getBoundingClientRect())) {
      return el.getAttribute('data-group-id');
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
  links: readonly WidgetItem[];
  rowHeight: number;
  onMoveItem: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  onSwap: (draggedId: string, targetId: string, draggedSourceRect?: { x: number; y: number; w: number; h: number }) => void;
  onHeaderTargetChange?: (isOver: boolean) => void;
}

export interface UseDashboardDrag {
  gridRef: RefObject<HTMLDivElement | null>;
  activeDragGroupId: string | null;
  activeSwapTargetId: string | null;
  draggedItem: WidgetItem | null;
  dragCursorCoords: DragCoords | null;
  activeDragOutItem: WidgetItem | null;
  dragOutCoords: GridSlot | null;
  handleDragStart: RglDragHandler;
  handleDrag: RglDragHandler;
  handleDragStop: RglDragHandler;
  handleInnerDragStart: (item: RegularLink, parentGroupId: string) => void;
  handleInnerDrag: (item: RegularLink, parentGroupId: string, clientX: number, clientY: number) => void;
  handleInnerDragStop: (item: RegularLink, parentGroupId: string, clientX: number, clientY: number) => void;
  handleExternalDrop: (linkId: string, clientX: number, clientY: number) => boolean;
}

const CLICK_VS_DRAG_THRESHOLD_PX = 8;

export function useDashboardDrag({
  links,
  rowHeight,
  onMoveItem,
  onSwap,
  onHeaderTargetChange,
}: UseDashboardDragOptions): UseDashboardDrag {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastInnerDragCoordsRef: MutableRefObject<DragCoords | null> = useRef<DragCoords | null>(null);
  const dragStartCoordsRef = useRef<DragCoords | null>(null);

  const [activeDragGroupId, setActiveDragGroupId] = useState<string | null>(null);
  const [activeSwapTargetId, setActiveSwapTargetId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<WidgetItem | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<string | null>(null);
  const [dragCursorCoords, setDragCursorCoords] = useState<DragCoords | null>(null);

  const [activeDragOutItem, setActiveDragOutItem] = useState<WidgetItem | null>(null);
  const [dragOutCoords, setDragOutCoords] = useState<GridSlot | null>(null);

  const checkCollision = useCallback((x: number, y: number, w: number, h: number): boolean => {
    return links.some((item) => {
      const isGoogleSearch = item.type === WidgetType.GOOGLE_SEARCH;
      const isGroup = item.type === WidgetType.GROUP;
      const itemW = isGoogleSearch ? (item.w ?? 6) : (isGroup ? (item.w ?? 6) : (item.w ?? (item.viewMode === 'icon' ? 1 : 3)));
      const itemH = isGoogleSearch ? (item.h ?? 1) : (isGroup ? (item.h ?? 4) : (item.h ?? 1));
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
    (item: WidgetItem | RegularLink, clientX: number, clientY: number): MainDropSlot | null => {
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

  const computeGroupDropCoords = useCallback(
    (item: RegularLink, groupId: string, clientX: number, clientY: number): GridSlot | undefined => {
      const groupEl = document.querySelector(`[data-group-id="${groupId}"]`);
      const groupItem = links.find((l) => l.id === groupId) as Group | undefined;
      if (!groupEl || !groupItem) return undefined;
      const containerEl = groupEl.querySelector<HTMLElement>('.overflow-y-auto');
      if (!containerEl) return undefined;

      const rect = containerEl.getBoundingClientRect();
      const scrollLeft = containerEl.scrollLeft || 0;
      const scrollTop = containerEl.scrollTop || 0;
      const localX = clientX - rect.left + scrollLeft;
      const localY = clientY - rect.top + scrollTop;

      const isList = groupItem.layout === 'list';
      const cols = isList ? 1 : (groupItem.cols || GROUP_DEFAULT_COLS);
      const rowPitch = isList ? 31 : SECTION_INNER_ROW_HEIGHT;
      const w = isList ? 1 : Math.min(item.viewMode === 'icon' ? 1 : 3, cols);

      const colWidth = rect.width / cols;
      const placeholderX = Math.max(0, Math.min(cols - w, Math.floor(localX / colWidth)));
      const placeholderY = Math.max(0, Math.floor(localY / rowPitch));
      return { x: placeholderX, y: placeholderY };
    },
    [links],
  );

  const handleInnerDragStart = useCallback((item: RegularLink, _parentGroupId: string) => {
    setActiveDragOutItem(item);
    lastInnerDragCoordsRef.current = null;
  }, []);

  const handleInnerDrag = useCallback((item: RegularLink, parentGroupId: string, clientX: number, clientY: number) => {
    lastInnerDragCoordsRef.current = { x: clientX, y: clientY };
    setDragCursorCoords({ x: clientX, y: clientY });
    setDraggedItem(item);

    if (isPointOverHeader(clientX, clientY)) {
      onHeaderTargetChange?.(true);
      setActiveDragOutItem(item);
      setDragOutCoords(null);
      setActiveDragGroupId(null);
      return;
    }
    onHeaderTargetChange?.(false);

    const hoverGroupId = findGroupAtPoint(clientX, clientY);

    if (hoverGroupId === parentGroupId) {
      setActiveDragOutItem(null);
      setDragOutCoords(null);
      setActiveDragGroupId(null);
      return;
    }

    if (hoverGroupId && hoverGroupId !== parentGroupId) {
      setActiveDragOutItem(item);
      setDragOutCoords(null);
      setActiveDragGroupId(hoverGroupId);
      return;
    }

    setActiveDragGroupId(null);

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

  const handleInnerDragStop = useCallback((item: RegularLink, parentGroupId: string, clientX: number, clientY: number) => {
    let finalX: number | undefined = clientX;
    let finalY: number | undefined = clientY;
    if ((finalX === undefined || finalY === undefined) && lastInnerDragCoordsRef.current) {
      finalX = lastInnerDragCoordsRef.current.x;
      finalY = lastInnerDragCoordsRef.current.y;
    }

    if (finalX !== undefined && finalY !== undefined) {
      if (isPointOverHeader(finalX, finalY)) {
        onMoveItem(item.id, HEADER_TARGET);
      } else {
        const dropGroupId = findGroupAtPoint(finalX, finalY);

        if (dropGroupId && dropGroupId !== parentGroupId) {
          const targetCoords = computeGroupDropCoords(item, dropGroupId, finalX, finalY);
          onMoveItem(item.id, dropGroupId, targetCoords);
        } else if (!dropGroupId) {
          const slot = computeMainGridDropSlot(item, finalX, finalY);
          if (slot && !checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) {
            onMoveItem(item.id, null, { x: slot.gridX, y: slot.gridY });
          }
        }
      }
    }

    onHeaderTargetChange?.(false);
    setActiveDragOutItem(null);
    setDragOutCoords(null);
    setActiveDragGroupId(null);
    setDragCursorCoords(null);
    setDraggedItem(null);
    lastInnerDragCoordsRef.current = null;
  }, [computeMainGridDropSlot, computeGroupDropCoords, checkCollision, onMoveItem, onHeaderTargetChange]);

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
      setActiveDragGroupId((prev) => (prev ? null : prev));
      setActiveSwapTargetId((prev) => (prev ? null : prev));
      setDragCursorCoords(null);
      onHeaderTargetChange?.(false);
      return;
    }

    setDragCursorCoords({ x: clientX, y: clientY });

    if (draggedItemType === WidgetType.LINK) {
      if (isPointOverHeader(clientX, clientY)) {
        onHeaderTargetChange?.(true);
        setActiveDragGroupId((prev) => (prev ? null : prev));
        setActiveSwapTargetId((prev) => (prev ? null : prev));
        return;
      }
      onHeaderTargetChange?.(false);
      const targetGroupId = findGroupAtPoint(clientX, clientY);
      if (targetGroupId) {
        setActiveDragGroupId((prev) => (prev === targetGroupId ? prev : targetGroupId));
        setActiveSwapTargetId((prev) => (prev ? null : prev));
        return;
      }
      setActiveDragGroupId((prev) => (prev ? null : prev));
    } else {
      onHeaderTargetChange?.(false);
      setActiveDragGroupId((prev) => (prev ? null : prev));
    }

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
    setActiveDragGroupId(null);
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

    if (startCoords) {
      const dx = Math.abs(clientX - startCoords.x);
      const dy = Math.abs(clientY - startCoords.y);
      if (dx < CLICK_VS_DRAG_THRESHOLD_PX && dy < CLICK_VS_DRAG_THRESHOLD_PX) return;
    }

    if (isPointOverHeader(clientX, clientY)) {
      const draggedLinkForHeader = links.find((l) => l.id === newItem.i && l.type === WidgetType.LINK) as RegularLink | undefined;
      if (draggedLinkForHeader) onMoveItem(draggedLinkForHeader.id, HEADER_TARGET);
      return;
    }

    const targetGroupId = findGroupAtPoint(clientX, clientY);
    if (targetGroupId) {
      const draggedLink = links.find((l) => l.id === newItem.i && l.type === WidgetType.LINK) as RegularLink | undefined;
      if (draggedLink) {
        const targetCoords = computeGroupDropCoords(draggedLink, targetGroupId, clientX, clientY);
        onMoveItem(draggedLink.id, targetGroupId, targetCoords);
        return;
      }
    }

    const draggedItem = links.find((l) => l.id === newItem.i);
    if (!draggedItem || draggedItem.isHeaderLink) return;
    if (!oldItem) return;

    const others = links
      .filter((l) => l.id !== draggedItem.id && !l.isHeaderLink && l.x !== undefined && l.y !== undefined)
      .map((l) => ({
        id: l.id,
        rect: { x: l.x as number, y: l.y as number, w: l.w ?? 1, h: l.h ?? 1 },
      }));

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
  }, [links, dragCursorCoords, computeMainGridDropSlot, computeCursorCell, computeGroupDropCoords, onMoveItem, onSwap, onHeaderTargetChange]);

  const handleExternalDrop = useCallback((linkId: string, clientX: number, clientY: number): boolean => {
    const externalPlaceholder = { viewMode: 'icon' as const, w: 1, h: 1 } as RegularLink;
    const slot = computeMainGridDropSlot(externalPlaceholder, clientX, clientY);
    if (!slot) return false;
    if (checkCollision(slot.gridX, slot.gridY, slot.w, slot.h)) return false;
    onMoveItem(linkId, null, { x: slot.gridX, y: slot.gridY });
    return true;
  }, [computeMainGridDropSlot, checkCollision, onMoveItem]);

  return {
    gridRef,
    activeDragGroupId,
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
