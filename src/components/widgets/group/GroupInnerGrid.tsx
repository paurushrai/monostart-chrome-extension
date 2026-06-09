import { useLayoutEffect, useState, type RefObject, type MouseEvent as ReactMouseEvent } from 'react';
import GridLayout from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import { Folder } from 'lucide-react';
import LinkCard from '../../LinkCard';
import { Button } from "../../ui/button";
import { findFirstFreeSlot } from '../../../lib/grid';
import type { LinkItem, DragPlaceholder, DragCoords, WidgetItem, GridSlot } from '../../../types';
import type { UseGroupDragOut } from '../../../hooks/useGroupDragOut';

// Use GridLayout directly instead of WidthProvider. WidthProvider initializes
// width to a hardcoded 1280 and only corrects to the real container width one
// frame AFTER mount (via a post-paint ResizeObserver), so inner items render at
// 1280-grid positions on first paint and then visibly slide to their real spots
// — the load glitch. Instead we measure the container width synchronously in
// useLayoutEffect (pre-paint) and gate the grid on it, so items paint once at
// the correct width. Mirrors the top-level DashboardGrid fix.
const ReactGridLayout = GridLayout;

interface GroupRef {
  id: string;
  title: string;
}

interface Props {
  groupId: string;
  cols: number;
  groupLayout?: 'grid' | 'list';
  isEditing: boolean;
  links: LinkItem[];
  isDraggedOver: boolean;
  draggedItem: WidgetItem | null;
  dragCursorCoords: DragCoords | null;
  openInNewTab?: boolean;
  groups?: GroupRef[];
  onMoveItem?: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  borderCssColor: string;
  textCssColor: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onInnerLayoutChange: (newLayout: Layout) => void;
  onRglDragStart: UseGroupDragOut['handleRglDragStart'];
  onRglDrag: UseGroupDragOut['handleRglDrag'];
  onRglDragStop: UseGroupDragOut['handleRglDragStop'];
  onInnerDelete: (id: string) => void;
  onInnerViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onInnerUpdateLink: (id: string, updates: Partial<LinkItem>) => void;
  onAddFirstLink: () => void;
}

const findPlaceholderSlot = (
  links: readonly LinkItem[],
  cols: number,
  itemW: number,
  itemH: number,
): GridSlot => {
  const occupied = links.map((l) => ({
    x: l.x ?? 0,
    y: l.y ?? 0,
    w: Math.min(l.w ?? 1, cols),
    h: l.h ?? 1,
  }));
  return findFirstFreeSlot(occupied, itemW, itemH, cols) as GridSlot;
};

export default function GroupInnerGrid({
  groupId,
  cols,
  groupLayout = 'grid',
  isEditing,
  links,
  isDraggedOver,
  draggedItem,
  dragCursorCoords,
  openInNewTab,
  groups,
  onMoveItem,
  borderCssColor,
  textCssColor,
  containerRef,
  onInnerLayoutChange,
  onRglDragStart,
  onRglDrag,
  onRglDragStop,
  onInnerDelete,
  onInnerViewModeChange,
  onInnerUpdateLink,
  onAddFirstLink,
}: Readonly<Props>) {
  const isList = groupLayout === 'list';
  const gridCols = isList ? 1 : cols;
  const rowPx = isList ? 25 : 50;
  const rowMarginY = isList ? 6 : 8;
  const rowPitch = rowPx + rowMarginY;

  // Measure the scroll container's width synchronously before paint so the grid
  // renders once at the correct width (see ReactGridLayout comment above).
  const [gridWidth, setGridWidth] = useState(0);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setGridWidth((prev) => (prev === w ? prev : w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  type RowItem = LinkItem | DragPlaceholder;
  const displayLinks: RowItem[] = [...links];

  if (isDraggedOver) {
    const draggedW = draggedItem?.w ?? (draggedItem?.viewMode === 'icon' ? 1 : 3);
    const w = Math.min(draggedW, gridCols);
    const h = draggedItem?.h ?? 1;
    let placeholderX = 0;
    let placeholderY = 0;

    if (dragCursorCoords && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft || 0;
      const scrollTop = containerRef.current.scrollTop || 0;
      const localX = dragCursorCoords.x - rect.left + scrollLeft;
      const localY = dragCursorCoords.y - rect.top + scrollTop;

      const colWidth = rect.width / gridCols;
      const rowHeight = rowPitch;

      placeholderX = Math.floor(localX / colWidth);
      placeholderY = Math.floor(localY / rowHeight);

      placeholderX = Math.max(0, Math.min(gridCols - w, placeholderX));
      placeholderY = Math.max(0, placeholderY);
    } else {
      const { x, y } = findPlaceholderSlot(links, gridCols, w, h);
      placeholderX = x;
      placeholderY = y;
    }

    const placeholder: DragPlaceholder = {
      id: 'drag-placeholder',
      type: 'link',
      title: 'Drop to Add',
      url: '',
      w,
      h,
      x: placeholderX,
      y: placeholderY,
      viewMode: w === 1 ? 'icon' : 'card',
    };
    displayLinks.push(placeholder);
  }

  const layout = displayLinks.map((l, idx) => {
    if (isList) {
      return {
        i: l.id,
        x: 0,
        y: idx,
        w: 1,
        h: 1,
        minW: 1,
        maxW: 1,
        minH: 1,
        maxH: 1,
        isResizable: false,
      };
    }
    const defaultW = l.viewMode === 'icon' ? 1 : Math.min(3, cols);
    const w = Math.min(l.w ?? defaultW, cols);
    return {
      i: l.id,
      x: Math.min(l.x ?? 0, cols - w),
      y: l.y ?? 0,
      w,
      h: l.h ?? 1,
      minW: 1,
      maxW: cols,
      minH: 1,
      maxH: 1,
      isResizable: l.id === 'drag-placeholder' ? false : undefined,
    };
  });

  const handleBodyMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isClickOnScrollbar = e.clientX >= rect.left + e.currentTarget.clientWidth;
    if (isClickOnScrollbar) {
      e.stopPropagation();
      return;
    }

    const target = e.target as Element;
    const closestCard = target.closest('.rounded-card');
    const isInnerCard = closestCard && containerRef.current?.contains(closestCard);

    const isCardOrInteractive =
      isInnerCard ||
      target.closest('button') ||
      target.closest('form') ||
      target.closest('input') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="menu"]');
    if (isCardOrInteractive) {
      e.stopPropagation();
    }
  };

  const isPlaceholder = (it: RowItem): it is DragPlaceholder => it.id === 'drag-placeholder';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-x-hidden overflow-y-auto pt-0 pb-1.5 select-none custom-scrollbar min-h-0 z-0 isolate"
      onMouseDown={handleBodyMouseDown}
    >
      {displayLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[120px]">
          <Folder size={28} className="text-muted-foreground/30 mb-1.5" />
          <span className="text-xs text-muted-foreground/60 font-medium">Empty Group</span>
          {isEditing && (
            <Button
              variant="link"
              size="sm"
              onClick={onAddFirstLink}
              className="text-2xs text-primary mt-0.5 hover:no-underline px-2 h-auto"
            >
              Add first link
            </Button>
          )}
        </div>
      ) : gridWidth > 0 ? (
        <ReactGridLayout
          className="layout inner-grid-layout"
          width={gridWidth}
          layout={layout}
          cols={gridCols}
          rowHeight={rowPx}
          margin={[8, rowMarginY]}
          compactType="vertical"
          preventCollision={false}
          isDraggable={isEditing}
          isResizable={isEditing && !isList}
          draggableHandle=".inner-drag-handle"
          onLayoutChange={onInnerLayoutChange}
          onDragStart={onRglDragStart}
          onDrag={onRglDrag}
          onDragStop={onRglDragStop}
        >
          {displayLinks.map((subItem) => (
            <div key={subItem.id} className="rounded-card">
              {isPlaceholder(subItem) ? (
                <div
                  className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center bg-primary/5 transition-all duration-300 animate-pulse px-3 text-center select-none"
                  style={{ borderColor: borderCssColor }}
                >
                  <span className="text-2xs font-semibold block w-full text-center" style={{ color: textCssColor }}>
                    {subItem.w === 1 ? 'Add' : 'Drop to Add'}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full">
                  <LinkCard
                    item={subItem}
                    onDelete={onInnerDelete}
                    onViewModeChange={onInnerViewModeChange}
                    onUpdateItem={onInnerUpdateLink}
                    isEditing={isEditing}
                    openInNewTab={openInNewTab}
                    groups={groups}
                    onMoveItem={onMoveItem}
                    parentId={groupId}
                    displayMode={isList ? 'list' : undefined}
                  />
                </div>
              )}
            </div>
          ))}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
