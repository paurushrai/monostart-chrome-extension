import { memo } from 'react';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import TodoWidget from './widgets/TodoWidget';
import TimerWidget from './widgets/TimerWidget';
import RemindersWidget from './widgets/RemindersWidget';
import SectionWidget from './widgets/SectionWidget';
import NoteWidget from './widgets/NoteWidget';
import ImageWidget from './widgets/ImageWidget';
import LabelWidget from './widgets/LabelWidget';
import { WidgetType } from '../lib/widgetCatalog';
import type {
  DisplayItem,
  DragPlaceholder,
  LinkItem,
  RegularLink,
  Section,
  Iframe,
  TodoWidget as TodoWidgetItem,
  TimerWidget as TimerWidgetItem,
  Reminders as RemindersItem,
  Note,
  ImageWidget as ImageWidgetItem,
  Label,
  GoogleSearch,
  DragCoords,
  GridSlot,
} from '../types';

interface SectionRef {
  id: string;
  title: string;
}

interface Props {
  item: DisplayItem;
  isEditing: boolean;
  openInNewTab?: boolean;
  sections?: SectionRef[];
  onDelete: (id: string) => void;
  onViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onUpdateLink: (id: string, updates: Partial<LinkItem>) => void;
  onMoveLink?: (linkId: string, targetSectionId: string | null, targetCoords?: GridSlot) => void;
  activeDragSectionId: string | null;
  dragCursorCoords: DragCoords | null;
  draggedItem: LinkItem | null;
  onInnerDragStart: (link: RegularLink, sectionId: string) => void;
  onInnerDrag: (link: RegularLink, sectionId: string, x: number, y: number) => void;
  onInnerDragStop: (link: RegularLink, sectionId: string, x: number, y: number) => void;
}

const isPlaceholder = (item: DisplayItem): item is DragPlaceholder =>
  item.id === 'drag-out-placeholder' || item.id === 'drag-placeholder';

function WidgetRendererInner({
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
}: Readonly<Props>) {
  if (isPlaceholder(item)) {
    return (
      <div className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center bg-primary/5 transition-all duration-300 animate-pulse border-primary px-3 text-center select-none">
        <span className="text-2xs font-semibold text-primary block w-full text-center">
          {item.w === 1 ? 'Place' : 'Drop to Place'}
        </span>
      </div>
    );
  }

  const linkItem = item as LinkItem;

  switch (linkItem.type) {
    case WidgetType.GOOGLE_SEARCH:
      return <GoogleSearchWidget item={linkItem as GoogleSearch} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.IFRAME:
      return <IframeWidget item={linkItem as Iframe} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TODO:
      return <TodoWidget item={linkItem as TodoWidgetItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TIMER:
      return <TimerWidget item={linkItem as TimerWidgetItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.REMINDERS:
      return <RemindersWidget item={linkItem as RemindersItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.NOTE:
      return <NoteWidget item={linkItem as Note} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.IMAGE:
      return <ImageWidget item={linkItem as ImageWidgetItem} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.LABEL:
      return <LabelWidget item={linkItem as Label} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
    case WidgetType.SECTION:
      return (
        <SectionWidget
          item={linkItem as Section}
          onDelete={onDelete}
          onUpdateLink={onUpdateLink}
          isEditing={isEditing}
          openInNewTab={openInNewTab}
          sections={sections}
          onMoveLink={onMoveLink}
          isDraggedOver={activeDragSectionId === linkItem.id}
          dragCursorCoords={dragCursorCoords}
          onInnerDragStart={onInnerDragStart}
          onInnerDrag={onInnerDrag}
          onInnerDragStop={onInnerDragStop}
          draggedItem={draggedItem}
        />
      );
    case WidgetType.LINK:
    default:
      return (
        <LinkCard
          item={linkItem as RegularLink}
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

const WidgetRenderer = memo(WidgetRendererInner, (prev, next) => {
  const sameItem =
    prev.item === next.item ||
    (prev.item.id === next.item.id &&
      prev.item.type === next.item.type &&
      prev.item.w === next.item.w &&
      prev.item.h === next.item.h &&
      prev.item.x === next.item.x &&
      prev.item.y === next.item.y);

  if (!sameItem) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.openInNewTab !== next.openInNewTab) return false;
  if (prev.onDelete !== next.onDelete) return false;
  if (prev.onViewModeChange !== next.onViewModeChange) return false;
  if (prev.onUpdateLink !== next.onUpdateLink) return false;
  if (prev.onMoveLink !== next.onMoveLink) return false;

  if (next.item.type === 'section') {
    if (prev.activeDragSectionId !== next.activeDragSectionId) return false;
    if (prev.dragCursorCoords !== next.dragCursorCoords) return false;
    if (prev.draggedItem !== next.draggedItem) return false;
    if (prev.sections !== next.sections) return false;
    if (prev.onInnerDragStart !== next.onInnerDragStart) return false;
    if (prev.onInnerDrag !== next.onInnerDrag) return false;
    if (prev.onInnerDragStop !== next.onInnerDragStop) return false;
  }

  return true;
});

export default WidgetRenderer;
