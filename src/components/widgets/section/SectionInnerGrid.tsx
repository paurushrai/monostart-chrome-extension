import type { RefObject, MouseEvent as ReactMouseEvent } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import { Folder } from 'lucide-react';
import LinkCard from '../../LinkCard';
import { Button } from "../../ui/button";
import { findFirstFreeSlot } from '../../../lib/grid';
import type { RegularLink, DragPlaceholder, DragCoords, LinkItem, GridSlot } from '../../../types';
import type { UseSectionDragOut } from '../../../hooks/useSectionDragOut';

const ReactGridLayout = WidthProvider(GridLayout);

interface SectionRef {
  id: string;
  title: string;
}

interface Props {
  sectionId: string;
  cols: number;
  isEditing: boolean;
  links: RegularLink[];
  isDraggedOver: boolean;
  draggedItem: LinkItem | null;
  dragCursorCoords: DragCoords | null;
  openInNewTab?: boolean;
  sections?: SectionRef[];
  onMoveLink?: (linkId: string, targetSectionId: string | null, targetCoords?: GridSlot) => void;
  borderCssColor: string;
  textCssColor: string;
  containerRef: RefObject<HTMLDivElement | null>;
  onInnerLayoutChange: (newLayout: Layout) => void;
  onRglDragStart: UseSectionDragOut['handleRglDragStart'];
  onRglDrag: UseSectionDragOut['handleRglDrag'];
  onRglDragStop: UseSectionDragOut['handleRglDragStop'];
  onInnerDelete: (id: string) => void;
  onInnerViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onInnerUpdateLink: (id: string, updates: Partial<RegularLink>) => void;
  onAddFirstLink: () => void;
}

const findPlaceholderSlot = (
  links: readonly RegularLink[],
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

export default function SectionInnerGrid({
  sectionId,
  cols,
  isEditing,
  links,
  isDraggedOver,
  draggedItem,
  dragCursorCoords,
  openInNewTab,
  sections,
  onMoveLink,
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
  type RowItem = RegularLink | DragPlaceholder;
  const displayLinks: RowItem[] = [...links];

  if (isDraggedOver) {
    const draggedW = draggedItem?.w ?? (draggedItem?.viewMode === 'icon' ? 1 : 3);
    const w = Math.min(draggedW, cols);
    const h = draggedItem?.h ?? 1;
    let placeholderX = 0;
    let placeholderY = 0;

    if (dragCursorCoords && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft || 0;
      const scrollTop = containerRef.current.scrollTop || 0;
      const localX = dragCursorCoords.x - rect.left + scrollLeft;
      const localY = dragCursorCoords.y - rect.top + scrollTop;

      const colWidth = rect.width / cols;
      const rowHeight = 58;

      placeholderX = Math.floor(localX / colWidth);
      placeholderY = Math.floor(localY / rowHeight);

      placeholderX = Math.max(0, Math.min(cols - w, placeholderX));
      placeholderY = Math.max(0, placeholderY);
    } else {
      const { x, y } = findPlaceholderSlot(links, cols, w, h);
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

  const layout = displayLinks.map((l) => {
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
      maxH: 2,
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
      className="relative flex-1 overflow-x-hidden overflow-y-auto px-1.5 pt-0 pb-1.5 select-none custom-scrollbar min-h-0 z-0 isolate"
      onMouseDown={handleBodyMouseDown}
    >
      {displayLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[120px]">
          <Folder size={28} className="text-muted-foreground/30 mb-1.5" />
          <span className="text-xs text-muted-foreground/60 font-medium">Empty Section</span>
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
      ) : (
        <ReactGridLayout
          className="layout inner-grid-layout"
          layout={layout}
          cols={cols}
          rowHeight={50}
          margin={[8, 8]}
          compactType="vertical"
          preventCollision={false}
          isDraggable={isEditing}
          isResizable={isEditing}
          draggableHandle=".inner-drag-handle"
          measureBeforeMount={true}
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
                    onUpdateLink={onInnerUpdateLink}
                    isEditing={isEditing}
                    openInNewTab={openInNewTab}
                    sections={sections}
                    onMoveLink={onMoveLink}
                    parentId={sectionId}
                  />
                </div>
              )}
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
