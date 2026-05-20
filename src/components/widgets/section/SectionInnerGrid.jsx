/* eslint-disable react/prop-types */
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import { Folder } from 'lucide-react';
import LinkCard from '../../LinkCard';
import { Button } from "../../ui/button";

const ReactGridLayout = WidthProvider(GridLayout);

/**
 * Find the first free slot for a placeholder of size (itemW, itemH).
 * Kept local because the placeholder-positioning logic uses a default-w
 * of 1 (vs grid.findSlotInSection which defaults to 3).
 */
const findPlaceholderSlot = (links, cols, itemW, itemH) => {
  const grid = [];
  links.forEach(l => {
    const lx = l.x ?? 0;
    const ly = l.y ?? 0;
    const lw = Math.min(l.w ?? 1, cols);
    const lh = l.h ?? 1;
    for (let r = ly; r < ly + lh; r++) {
      while (grid.length <= r) grid.push(new Array(cols).fill(false));
      for (let c = lx; c < lx + lw && c < cols; c++) {
        grid[r][c] = true;
      }
    }
  });

  let placed = false;
  let r = 0;
  let newX = 0;
  let newY = 0;

  while (!placed) {
    while (grid.length <= r + itemH) {
      grid.push(new Array(cols).fill(false));
    }
    for (let c = 0; c <= cols - itemW; c++) {
      let canFit = true;
      for (let i = 0; i < itemH; i++) {
        for (let j = 0; j < itemW; j++) {
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
  return { x: newX, y: newY };
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
}) {
  // Compute displayLinks (real links + optional drop-placeholder while dragging-over)
  const displayLinks = [...links];
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
      const rowHeight = 58; // 50 rowHeight + 8 margin

      placeholderX = Math.floor(localX / colWidth);
      placeholderY = Math.floor(localY / rowHeight);

      placeholderX = Math.max(0, Math.min(cols - w, placeholderX));
      placeholderY = Math.max(0, placeholderY);
    } else {
      const { x, y } = findPlaceholderSlot(links, cols, w, h);
      placeholderX = x;
      placeholderY = y;
    }

    displayLinks.push({
      id: 'drag-placeholder',
      type: 'link',
      title: 'Drop to Add',
      url: '',
      w,
      h,
      x: placeholderX,
      y: placeholderY,
      viewMode: w === 1 ? 'icon' : 'card'
    });
  }

  const layout = displayLinks.map(l => {
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
      isResizable: l.id !== 'drag-placeholder'
    };
  });

  const handleBodyMouseDown = (e) => {
    if (!isEditing) return;

    // If clicked on the scrollbar track, stop propagation
    const rect = e.currentTarget.getBoundingClientRect();
    const isClickOnScrollbar = e.clientX >= rect.left + e.currentTarget.clientWidth;
    if (isClickOnScrollbar) {
      e.stopPropagation();
      return;
    }

    // Only treat as "inner card" if the matched .rounded-card is inside THIS section body.
    // (The section itself is wrapped in .rounded-card by DashboardGrid.)
    const closestCard = e.target.closest('.rounded-card');
    const isInnerCard = closestCard && containerRef.current?.contains(closestCard);

    const isCardOrInteractive = isInnerCard ||
                               e.target.closest('button') ||
                               e.target.closest('form') ||
                               e.target.closest('input') ||
                               e.target.closest('[role="menuitem"]') ||
                               e.target.closest('[role="menu"]');
    if (isCardOrInteractive) {
      e.stopPropagation();
    }
  };

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
          onLayoutChange={onInnerLayoutChange}
          onDragStart={onRglDragStart}
          onDrag={onRglDrag}
          onDragStop={onRglDragStop}
        >
          {displayLinks.map((subItem) => (
            <div key={subItem.id} className="rounded-card">
              {subItem.id === 'drag-placeholder' ? (
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
