import { useState, type DragEvent as ReactDragEvent } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetRenderer from './WidgetRenderer';
import { useGridDimensions } from '../hooks/useGridDimensions';
import { useDashboardDrag } from '../hooks/useDashboardDrag';
import { HEADER_LINK_DRAG_TYPE } from '../hooks/useHeaderDrag';
import { MAIN_COLS, MAIN_ROWS } from '../lib/grid';
import { getWidgetMeta, WidgetType } from '../lib/widgetCatalog';
import type { WidgetMeta } from '../lib/widgetCatalog';
import type { LinkItem, DisplayItem, DragPlaceholder, GridSlot } from '../types';

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
  // Lets DashboardGrid surface "the user is dragging a grid item over the
  // header right now" up to the App so the header can highlight itself.
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
    const { minW, maxW, minH, maxH, resizable } = meta?.layout ?? {};
    const { w, h } = initialSize(link, meta);
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
  onHeaderTargetChange,
}: Props) => {
  const { rowHeight } = useGridDimensions();
  const drag = useDashboardDrag({ links, rowHeight, onMoveLink, onHeaderTargetChange });
  // Visual hover ring while a header link is being dragged over the grid.
  // The id itself rides in dataTransfer so we don't depend on cross-event
  // React state commits.
  const [isHeaderDragOver, setIsHeaderDragOver] = useState(false);

  const isHeaderLinkDrag = (e: ReactDragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes(HEADER_LINK_DRAG_TYPE);

  const handleHeaderDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isHeaderLinkDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isHeaderDragOver) setIsHeaderDragOver(true);
  };

  const handleHeaderDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsHeaderDragOver(false);
  };

  const handleHeaderDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    setIsHeaderDragOver(false);
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
      className={`w-full rounded-lg transition-colors ${isHeaderDragOver ? 'bg-primary/5 ring-2 ring-primary/40' : ''}`}
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
        // Hold the first render until WidthProvider has measured the
        // container. Without this the grid paints once at the 1280px
        // fallback then snaps to the real width on the second render —
        // visible as a layout shift / "glitch" on page load.
        measureBeforeMount={true}
        onDragStart={drag.handleDragStart}
        onDrag={drag.handleDrag}
        onDragStop={drag.handleDragStop}
        onLayoutChange={(newLayout) => onLayoutChange(newLayout)}
      >
        {displayLinks.map((item) => (
          <div key={item.id} className={`rounded-card widget-type-${item.type}`}>
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
        ))}
      </ReactGridLayout>
    </div>
  );
};

export default DashboardGrid;
