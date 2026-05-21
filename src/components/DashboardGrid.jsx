/* eslint-disable react/prop-types */
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetRenderer from './WidgetRenderer';
import { useGridDimensions } from '../hooks/useGridDimensions';
import { useDashboardDrag } from '../hooks/useDashboardDrag';
import { MAIN_COLS, MAIN_ROWS } from '../lib/grid';

const ReactGridLayout = WidthProvider(GridLayout);

const buildLayout = (displayLinks) => displayLinks.map(link => {
  const isSection = link.type === 'section';
  const isGoogleSearch = link.type === 'google-search';
  const isPlaceholder = link.id === 'drag-out-placeholder';
  return {
    i:    link.id,
    x:    link.x ?? 0,
    y:    link.y ?? 0,
    w:    isGoogleSearch ? 6 : (isSection ? (link.w ?? 6) : (link.w ?? (link.viewMode === 'icon' ? 1 : 3))),
    h:    isGoogleSearch ? 1 : (isSection ? (link.h ?? 4) : (link.h ?? 1)),
    minW: isGoogleSearch ? 6 : (isSection ? 3 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1)),
    maxW: isGoogleSearch ? 6 : (link.type === 'link' ? 6 : undefined),
    minH: isGoogleSearch ? 1 : (isSection ? 4 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1)),
    maxH: isGoogleSearch ? 1 : (link.type === 'link' ? 2 : undefined),
    isResizable: isPlaceholder ? false : (isGoogleSearch ? false : undefined),
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
