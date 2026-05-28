import { useState, useCallback } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';

export const HEADER_LINK_DRAG_TYPE = 'application/x-monostart-header-link';

export interface UseHeaderDrag {
  draggedHeaderLinkId: string | null;
  dragOverHeaderLinkId: string | null;
  onDragStart: (id: string, e: ReactDragEvent) => void;
  onDragOver: (e: ReactDragEvent, id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
}

export function useHeaderDrag(
  onReorder: (draggedId: string, targetId: string) => void,
): UseHeaderDrag {
  const [draggedHeaderLinkId, setDraggedHeaderLinkId] = useState<string | null>(null);
  const [dragOverHeaderLinkId, setDragOverHeaderLinkId] = useState<string | null>(null);

  const onDragStart = useCallback((id: string, e: ReactDragEvent) => {
    e.dataTransfer.setData(HEADER_LINK_DRAG_TYPE, id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedHeaderLinkId(id);
  }, []);

  const onDragOver = useCallback((e: ReactDragEvent, id: string) => {
    e.preventDefault();
    setDragOverHeaderLinkId((prev) => (prev === id ? prev : id));
  }, []);

  const onDrop = useCallback((targetId: string) => {
    if (draggedHeaderLinkId && draggedHeaderLinkId !== targetId) {
      onReorder(draggedHeaderLinkId, targetId);
    }
    setDraggedHeaderLinkId(null);
    setDragOverHeaderLinkId(null);
  }, [draggedHeaderLinkId, onReorder]);

  const onDragEnd = useCallback(() => {
    setDraggedHeaderLinkId(null);
    setDragOverHeaderLinkId(null);
  }, []);

  return {
    draggedHeaderLinkId,
    dragOverHeaderLinkId,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}
