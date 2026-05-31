import { useEffect, useState, type DragEvent as ReactDragEvent } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { ExternalLink } from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';
import { resolveFavicon } from '../lib/favicon';
import { useGridDimensions, photoConfigFitsAt3Rows } from '../hooks/useGridDimensions';
import { useDashboardDrag } from '../hooks/useDashboardDrag';
import { HEADER_LINK_DRAG_TYPE } from '../hooks/useHeaderDrag';
import { MAIN_COLS, MAIN_ROWS } from '../lib/grid';
import { getWidgetMeta, WidgetType } from '../lib/widgetCatalog';
import type { WidgetMeta } from '../lib/widgetCatalog';
import type { LinkItem, RegularLink, DisplayItem, DragPlaceholder, GridSlot, GoogleSearch, ImageWidget } from '../types';

const ReactGridLayout = WidthProvider(GridLayout);

const PLACEHOLDER_ID = 'drag-out-placeholder';

interface SectionRef {
  id: string;
  title: string;
}

interface Props {
  links: LinkItem[];
  onLayoutChange: (layout: Layout) => void;
  onDelete: (id: string) => void;
  onViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onUpdateLink: (id: string, updates: Partial<LinkItem>) => void;
  isEditing: boolean;
  openInNewTab?: boolean;
  sections?: SectionRef[];
  onMoveLink: (linkId: string, targetSectionId: string | null, targetCoords?: GridSlot) => void;
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
    const { maxW, resizable } = meta?.layout ?? {};
    let { minW, minH, maxH } = meta?.layout ?? {};
    const initial = initialSize(link, meta);
    const w = initial.w;
    let h = initial.h;

    if (link.type === WidgetType.GOOGLE_SEARCH) {
      const v = (link as GoogleSearch).variant ?? 'bar';
      if (v === 'logo') { minH = 4; maxH = 4; }
      else { minH = 1; maxH = 1; }
      if (h < minH) h = minH;
      if (h > maxH) h = maxH;
    }

    if (link.type === WidgetType.IMAGE) {
      const hasImage = !!((link as ImageWidget).url ?? '').trim();
      const emptyMin = photoConfigFitsAt3Rows() ? 3 : 4;
      minW = hasImage ? 3 : emptyMin;
      minH = hasImage ? 3 : emptyMin;
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
  onUpdateLink,
  isEditing,
  openInNewTab,
  sections = [],
  onMoveLink,
  onSwap,
  onHeaderTargetChange,
}: Readonly<Props>) => {
  const { rowHeight } = useGridDimensions();
  const drag = useDashboardDrag({ links, rowHeight, onMoveLink, onSwap, onHeaderTargetChange });
  const dragOutLink = drag.activeDragOutItem?.type === 'link' ? (drag.activeDragOutItem as RegularLink) : null;
  const ghostFavicon = dragOutLink ? resolveFavicon(dragOutLink) : null;
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
    const overSection = !!(e.target as HTMLElement).closest('[data-section-id]');
    setIsDashboardDragOver(!overSection);
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
      <ReactGridLayout
        className="layout"
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
        measureBeforeMount={true}
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
                sections={sections}
                onDelete={onDelete}
                onViewModeChange={onViewModeChange}
                onUpdateLink={onUpdateLink}
                onMoveLink={onMoveLink}
                activeDragSectionId={drag.activeDragSectionId}
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
          {ghostFavicon ? (
            <img src={ghostFavicon} alt="" className="w-7 h-7 object-contain rounded-sm" draggable={false} />
          ) : (
            <ExternalLink size={18} className="text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardGrid;
