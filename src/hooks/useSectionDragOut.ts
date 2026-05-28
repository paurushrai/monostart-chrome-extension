import { useRef, useCallback, type RefObject, type MutableRefObject } from 'react';
import type { Layout, LayoutItem } from 'react-grid-layout/legacy';
import type { RegularLink, DragCoords } from '../types';

type RglDragHandler = (
  layout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null,
  placeholder: LayoutItem | null,
  event: Event,
  element: HTMLElement | null,
) => void;

type InnerDragCallback = (link: RegularLink, sectionId: string) => void;
type InnerDragMoveCallback = (link: RegularLink, sectionId: string, clientX: number, clientY: number) => void;

interface UseSectionDragOutOptions {
  containerRef: RefObject<HTMLElement | null>;
  sectionId: string;
  links: readonly RegularLink[];
  onInnerDragStart?: InnerDragCallback;
  onInnerDrag?: InnerDragMoveCallback;
  onInnerDragStop?: InnerDragMoveCallback;
}

export interface UseSectionDragOut {
  isMovingOutRef: MutableRefObject<boolean>;
  handleRglDragStart: RglDragHandler;
  handleRglDrag: RglDragHandler;
  handleRglDragStop: RglDragHandler;
}

export function useSectionDragOut({
  containerRef,
  sectionId,
  links,
  onInnerDragStart,
  onInnerDrag,
  onInnerDragStop,
}: UseSectionDragOutOptions): UseSectionDragOut {
  const isMovingOutRef = useRef<boolean>(false);
  const lastCursorCoordsRef = useRef<DragCoords | null>(null);

  const handleRglDragStart: RglDragHandler = useCallback((_layout, _oldItem, newItem) => {
    lastCursorCoordsRef.current = null;
    if (onInnerDragStart && newItem) {
      const subItem = links.find((l) => l.id === newItem.i);
      if (subItem) onInnerDragStart(subItem, sectionId);
    }
  }, [links, sectionId, onInnerDragStart]);

  const handleRglDrag: RglDragHandler = useCallback((_layout, _oldItem, newItem, _placeholder, e) => {
    if (!onInnerDrag || !e || !newItem) return;
    const subItem = links.find((l) => l.id === newItem.i);
    if (!subItem) return;
    const me = e as MouseEvent;
    const te = e as TouchEvent;
    const clientX = me.clientX ?? te.touches?.[0]?.clientX ?? te.changedTouches?.[0]?.clientX;
    const clientY = me.clientY ?? te.touches?.[0]?.clientY ?? te.changedTouches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;
    lastCursorCoordsRef.current = { x: clientX, y: clientY };
    onInnerDrag(subItem, sectionId, clientX, clientY);
  }, [links, sectionId, onInnerDrag]);

  const handleRglDragStop: RglDragHandler = useCallback((_layout, _oldItem, newItem, _placeholder, e) => {
    const me = e as MouseEvent | undefined;
    const te = e as TouchEvent | undefined;
    let clientX = me?.clientX ?? te?.touches?.[0]?.clientX ?? te?.changedTouches?.[0]?.clientX;
    let clientY = me?.clientY ?? te?.touches?.[0]?.clientY ?? te?.changedTouches?.[0]?.clientY;

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

    if (onInnerDragStop && clientX !== undefined && clientY !== undefined && newItem) {
      const subItem = links.find((l) => l.id === newItem.i);
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
