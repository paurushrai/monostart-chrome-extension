import { useState, useCallback } from 'react';

export function useHeaderDrag(onReorder) {
  const [draggedHeaderLinkId, setDraggedHeaderLinkId] = useState(null);
  const [dragOverHeaderLinkId, setDragOverHeaderLinkId] = useState(null);

  const onDragStart = useCallback((id) => {
    setDraggedHeaderLinkId(id);
  }, []);

  const onDragOver = useCallback((e, id) => {
    e.preventDefault();
    setDragOverHeaderLinkId((prev) => (prev === id ? prev : id));
  }, []);

  const onDrop = useCallback((targetId) => {
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
