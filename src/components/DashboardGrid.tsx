import { useEffect, useLayoutEffect, useState, type DragEvent as ReactDragEvent } from 'react';
import GridLayout from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { ExternalLink } from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';
import Favicon from './Favicon';
import { useGridDimensions } from '../hooks/useGridDimensions';
import { useDashboardDrag } from '../hooks/useDashboardDrag';
import { HEADER_LINK_DRAG_TYPE } from '../hooks/useHeaderDrag';
import { MAIN_COLS, MAIN_ROWS } from '../lib/grid';
import { getWidgetMeta, WidgetType } from '../lib/widgetCatalog';
import type { WidgetMeta } from '../lib/widgetCatalog';
import type { WidgetItem, LinkItem, DisplayItem, DragPlaceholder, GridSlot, GoogleSearchItem } from '../types';

// Use GridLayout directly instead of WidthProvider. WidthProvider initializes
// width to a hardcoded 1280 and only corrects to the real container width one
// frame AFTER mount (via a post-paint ResizeObserver), which makes every item
// render at the wrong size/position on first paint and then visibly jump.
// Instead we measure the container width synchronously in useLayoutEffect
// (pre-paint) and feed it in, so items render correctly on the very first paint.
const ReactGridLayout = GridLayout;

const PLACEHOLDER_ID = 'drag-out-placeholder';

interface GroupRef {
  id: string;
  title: string;
}

interface Props {
  links: WidgetItem[];
  onLayoutChange: (layout: Layout) => void;
  onDelete: (id: string) => void;
  onViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onUpdateItem: (id: string, updates: Partial<WidgetItem>) => void;
  isEditing: boolean;
  openInNewTab?: boolean;
  groups?: GroupRef[];
  onMoveItem: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  onSwap: (draggedId: string, targetId: string, draggedSourceRect?: { x: number; y: number; w: number; h: number }) => void;
  onHeaderTargetChange?: (isOver: boolean) => void;
}

const initialSize = (link: DisplayItem, meta: WidgetMeta | undefined): { w: number; h: number } => {
  if (link.type === WidgetType.LINK) {
    return {
      w: link.w ?? (link.viewMode === 'icon' ? 1 : 3),
      h: link.h ?? 1,
    };
  }
  return {
    w: link.w ?? meta?.defaults?.w ?? 1,
    h: link.h ?? meta?.defaults?.h ?? 1,
  };
};

const buildLayout = (displayLinks: DisplayItem[]): Layout =>
  displayLinks.map((link) => {
    const isPlaceholder = link.id === PLACEHOLDER_ID;
    const meta = getWidgetMeta(link.type);
    const { minW, maxW, resizable } = meta?.layout ?? {};
    let { minH, maxH } = meta?.layout ?? {};
    const initial = initialSize(link, meta);
    const w = initial.w;
    let h = initial.h;

    if (link.type === WidgetType.GOOGLE_SEARCH) {
      const v = (link as GoogleSearchItem).variant ?? 'bar';
      if (v === 'logo') { minH = 4; maxH = 4; }
      else { minH = 1; maxH = 1; }
      if (h < minH) h = minH;
      if (h > maxH) h = maxH;
    }

    return {
      i: link.id,
      x: link.x ?? 0,
      y: link.y ?? 0,
      w,
      h,
      minW,
      maxW,
      minH,
      maxH,
      isResizable: isPlaceholder ? false : (resizable === false ? false : undefined),
    };
  });

const DashboardGrid = ({
  links,
  onLayoutChange,
  onDelete,
  onViewModeChange,
  onUpdateItem,
  isEditing,
  openInNewTab,
  groups = [],
  onMoveItem,
  onSwap,
  onHeaderTargetChange,
}: Readonly<Props>) => {
  const { rowHeight: fallbackRowHeight } = useGridDimensions();
  const [rowHeight, setRowHeight] = useState(fallbackRowHeight);
  const [gridWidth, setGridWidth] = useState(0);
  const drag = useDashboardDrag({ links, rowHeight, onMoveItem, onSwap, onHeaderTargetChange });

  useLayoutEffect(() => {
    const el = drag.gridRef.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const GRID_MARGIN = 16;
    const measure = () => {
      const cs = getComputedStyle(host);
      const available =
        host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const next = Math.max(
        30,
        (available - 2 * GRID_MARGIN - (MAIN_ROWS - 1) * GRID_MARGIN) / MAIN_ROWS,
      );
      if (Number.isFinite(next)) setRowHeight((prev) => (prev === next ? prev : next));
      const w = el.clientWidth;
      if (w > 0) setGridWidth((prev) => (prev === w ? prev : w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [drag.gridRef]);
  const dragOutLink = drag.activeDragOutItem?.type === 'link' ? (drag.activeDragOutItem as LinkItem) : null;
  const showGhost = !!dragOutLink && !!drag.dragCursorCoords;
  const [isDashboardDragOver, setIsDashboardDragOver] = useState(false);

  useEffect(() => {
    const clear = () => setIsDashboardDragOver(false);
    document.addEventListener('dragend', clear);
    return () => document.removeEventListener('dragend', clear);
  }, []);

  const isHeaderLinkDrag = (e: ReactDragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes(HEADER_LINK_DRAG_TYPE);

  const handleHeaderDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isHeaderLinkDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const overGroup = !!(e.target as HTMLElement).closest('[data-group-id]');
    setIsDashboardDragOver(!overGroup);
  };

  const handleHeaderDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDashboardDragOver(false);
  };

  const handleHeaderDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    setIsDashboardDragOver(false);
    if (!isHeaderLinkDrag(e)) return;
    e.preventDefault();
    const linkId = e.dataTransfer.getData(HEADER_LINK_DRAG_TYPE);
    if (!linkId) return;
    drag.handleExternalDrop(linkId, e.clientX, e.clientY);
  };

  const displayLinks: DisplayItem[] = [...links];
  if (drag.activeDragOutItem && drag.dragOutCoords) {
    const w = drag.activeDragOutItem.w ?? (drag.activeDragOutItem.viewMode === 'icon' ? 1 : 3);
    const h = drag.activeDragOutItem.h ?? 1;
    const placeholder: DragPlaceholder = {
      id: 'drag-out-placeholder',
      type: 'link',
      title: 'Drop to Place',
      url: '',
      w,
      h,
      x: drag.dragOutCoords.x,
      y: drag.dragOutCoords.y,
    };
    displayLinks.push(placeholder);
  }

  const layout = buildLayout(displayLinks);

  return (
    <div
      className={`w-full min-h-full rounded-lg transition-colors ${isDashboardDragOver ? 'bg-primary/5 ring-2 ring-primary/40' : ''}`}
      ref={drag.gridRef}
      onDragOver={handleHeaderDragOver}
      onDragLeave={handleHeaderDragLeave}
      onDrop={handleHeaderDrop}
    >
      {gridWidth > 0 && (
      <ReactGridLayout
        className="layout"
        width={gridWidth}
        layout={layout}
        cols={MAIN_COLS}
        maxRows={MAIN_ROWS}
        rowHeight={rowHeight}
        margin={[16, 16]}
        compactType={null}
        preventCollision={true}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        onDragStart={drag.handleDragStart}
        onDrag={drag.handleDrag}
        onDragStop={drag.handleDragStop}
        onLayoutChange={(newLayout) => onLayoutChange(newLayout)}
      >
        {displayLinks.map((item) => {
          const isSwapTarget = drag.activeSwapTargetId === item.id;
          return (
          <div
            key={item.id}
            data-item-id={item.id}
            className={`rounded-card widget-type-${item.type} relative ${isSwapTarget ? 'ring-2 ring-primary ring-offset-0 rounded-lg transition-shadow' : ''}`}
          >
            {isSwapTarget && (
              <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground text-2xs font-semibold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-in fade-in zoom-in-95">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 16l-4-4 4-4" />
                  <path d="M3 12h14" />
                  <path d="M17 8l4 4-4 4" />
                  <path d="M7 12h14" />
                </svg>
                Swap
              </div>
            )}
            <div className="w-full h-full">
              <WidgetRenderer
                item={item}
                isEditing={isEditing}
                openInNewTab={openInNewTab}
                groups={groups}
                onDelete={onDelete}
                onViewModeChange={onViewModeChange}
                onUpdateItem={onUpdateItem}
                onMoveItem={onMoveItem}
                activeDragGroupId={drag.activeDragGroupId}
                dragCursorCoords={drag.dragCursorCoords}
                draggedItem={drag.draggedItem}
                onInnerDragStart={drag.handleInnerDragStart}
                onInnerDrag={drag.handleInnerDrag}
                onInnerDragStop={drag.handleInnerDragStop}
              />
            </div>
          </div>
          );
        })}
      </ReactGridLayout>
      )}
      {showGhost && drag.dragCursorCoords && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-md bg-card border border-border shadow-lg flex items-center justify-center"
          style={{
            left: drag.dragCursorCoords.x - 20,
            top: drag.dragCursorCoords.y - 20,
            width: 40,
            height: 40,
            opacity: 0.85,
          }}
        >
          {dragOutLink && (
            <Favicon
              item={dragOutLink}
              className="w-7 h-7 object-contain rounded-sm"
              fallback={<ExternalLink size={18} className="text-muted-foreground" />}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardGrid;
