/* eslint-disable react/prop-types */
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetRenderer from './WidgetRenderer';
import { useGridDimensions } from '../hooks/useGridDimensions';
import { useDashboardDrag } from '../hooks/useDashboardDrag';
import { MAIN_COLS, MAIN_ROWS } from '../lib/grid';
import { getWidgetMeta, WidgetType } from '../lib/widgetCatalog';

const ReactGridLayout = WidthProvider(GridLayout);

const PLACEHOLDER_ID = 'drag-out-placeholder';

// Initial w/h for an item: prefer persisted value, fall back to catalog defaults,
// with the historical link-specific viewMode rule preserved.
const initialSize = (link, meta) => {
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

const buildLayout = (displayLinks) => displayLinks.map(link => {
  const isPlaceholder = link.id === PLACEHOLDER_ID;
  const meta = getWidgetMeta(link.type);
  const { minW, maxW, minH, maxH, resizable } = meta?.layout ?? {};
  const { w, h } = initialSize(link, meta);
  return {
    i:    link.id,
    x:    link.x ?? 0,
    y:    link.y ?? 0,
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
}) => {
  const { rowHeight } = useGridDimensions();
  const drag = useDashboardDrag({ links, rowHeight, onMoveLink });

  // Add a transient drag-out placeholder while a link is being dragged out of a section
  const displayLinks = [...links];
  if (drag.activeDragOutItem && drag.dragOutCoords) {
    const w = drag.activeDragOutItem.w ?? (drag.activeDragOutItem.viewMode === 'icon' ? 1 : 3);
    const h = drag.activeDragOutItem.h ?? 1;
    displayLinks.push({
      id: 'drag-out-placeholder',
      type: 'link',
      title: 'Drop to Place',
      url: '',
      w,
      h,
      x: drag.dragOutCoords.x,
      y: drag.dragOutCoords.y,
    });
  }

  const layout = buildLayout(displayLinks);

  return (
    <div className="w-full" ref={drag.gridRef}>
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
        onDragStart={drag.handleDragStart}
        onDrag={drag.handleDrag}
        onDragStop={drag.handleDragStop}
        onLayoutChange={(newLayout) => onLayoutChange(newLayout)}
      >
        {displayLinks.map((item) => (
          <div key={item.id} className="rounded-card">
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
