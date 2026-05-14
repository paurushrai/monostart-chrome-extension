/* eslint-disable react/prop-types */
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import TodoWidget from './widgets/TodoWidget';
import TimerWidget from './widgets/TimerWidget';
import SectionWidget from './widgets/SectionWidget';
import NoteWidget from './widgets/NoteWidget';
import ImageWidget from './widgets/ImageWidget';
import LabelWidget from './widgets/LabelWidget';
import { WidgetType } from '../lib/widgetCatalog';

/**
 * Renders the appropriate widget for a top-level grid item. Section widgets
 * receive extra drag-coordination props so they can react to drag-into-section.
 */
export default function WidgetRenderer({
  item,
  isEditing,
  openInNewTab,
  sections,
  onDelete,
  onViewModeChange,
  onUpdateLink,
  onMoveLink,
  activeDragSectionId,
  dragCursorCoords,
  draggedItem,
  onInnerDragStart,
  onInnerDrag,
  onInnerDragStop,
}) {
  if (item.id === 'drag-out-placeholder') {
    return (
      <div className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center bg-primary/5 transition-all duration-300 animate-pulse border-primary px-3 text-center select-none">
        <span className="text-2xs font-semibold text-primary block w-full text-center">
          {item.w === 1 ? 'Place' : 'Drop to Place'}
        </span>
      </div>
    );
  }

  switch (item.type) {
    case WidgetType.GOOGLE_SEARCH:
      return <GoogleSearchWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.IFRAME:
      return <IframeWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TODO:
      return <TodoWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TIMER:
      return <TimerWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.NOTE:
      return <NoteWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.IMAGE:
      return <ImageWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.LABEL:
      return <LabelWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.SECTION:
      return (
        <SectionWidget
          item={item}
          onDelete={onDelete}
          onUpdateLink={onUpdateLink}
          isEditing={isEditing}
          openInNewTab={openInNewTab}
          sections={sections}
          onMoveLink={onMoveLink}
          isDraggedOver={activeDragSectionId === item.id}
          dragCursorCoords={dragCursorCoords}
          onInnerDragStart={onInnerDragStart}
          onInnerDrag={onInnerDrag}
          onInnerDragStop={onInnerDragStop}
          draggedItem={draggedItem}
        />
      );
    default:
      return (
        <LinkCard
          item={item}
          onDelete={onDelete}
          onViewModeChange={onViewModeChange}
          onUpdateLink={onUpdateLink}
          isEditing={isEditing}
          openInNewTab={openInNewTab}
          sections={sections}
          onMoveLink={onMoveLink}
          parentId={undefined}
        />
      );
  }
}
