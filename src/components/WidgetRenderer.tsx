import { memo } from 'react';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import TodoWidget from './widgets/TodoWidget';
import TimerWidget from './widgets/TimerWidget';
import RemindersWidget from './widgets/RemindersWidget';
import GroupWidget from './widgets/GroupWidget';
import NoteWidget from './widgets/NoteWidget';
import ImageWidget from './widgets/ImageWidget';
import LabelWidget from './widgets/LabelWidget';
import { WidgetType } from '../lib/widgetCatalog';
import type {
  DisplayItem,
  DragPlaceholder,
  WidgetItem,
  LinkItem,
  GroupItem,
  IframeItem,
  TodoItem,
  TimerItem,
  RemindersItem,
  NoteItem,
  ImageItem,
  LabelItem,
  GoogleSearchItem,
  DragCoords,
  GridSlot,
} from '../types';

interface GroupRef {
  id: string;
  title: string;
}

interface Props {
  item: DisplayItem;
  isEditing: boolean;
  openInNewTab?: boolean;
  groups?: GroupRef[];
  onDelete: (id: string) => void;
  onViewModeChange: (id: string, newMode: 'icon' | 'icon+text') => void;
  onUpdateItem: (id: string, updates: Partial<WidgetItem>) => void;
  onMoveItem?: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  activeDragGroupId: string | null;
  dragCursorCoords: DragCoords | null;
  draggedItem: WidgetItem | null;
  onInnerDragStart: (link: LinkItem, groupId: string) => void;
  onInnerDrag: (link: LinkItem, groupId: string, x: number, y: number) => void;
  onInnerDragStop: (link: LinkItem, groupId: string, x: number, y: number) => void;
}

const isPlaceholder = (item: DisplayItem): item is DragPlaceholder =>
  item.id === 'drag-out-placeholder' || item.id === 'drag-placeholder';

function WidgetRendererInner({
  item,
  isEditing,
  openInNewTab,
  groups,
  onDelete,
  onViewModeChange,
  onUpdateItem,
  onMoveItem,
  activeDragGroupId,
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

  const linkItem = item as WidgetItem;

  switch (linkItem.type) {
    case WidgetType.GOOGLE_SEARCH:
      return <GoogleSearchWidget item={linkItem as GoogleSearchItem} onDelete={onDelete} onUpdateItem={onUpdateItem} isEditing={isEditing} />;
    case WidgetType.IFRAME:
      return <IframeWidget item={linkItem as IframeItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TODO:
      return <TodoWidget item={linkItem as TodoItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.TIMER:
      return <TimerWidget item={linkItem as TimerItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.REMINDERS:
      return <RemindersWidget item={linkItem as RemindersItem} onDelete={onDelete} isEditing={isEditing} />;
    case WidgetType.NOTE:
      return <NoteWidget item={linkItem as NoteItem} onDelete={onDelete} onUpdateItem={onUpdateItem} isEditing={isEditing} />;
    case WidgetType.IMAGE:
      return <ImageWidget item={linkItem as ImageItem} onDelete={onDelete} onUpdateItem={onUpdateItem} isEditing={isEditing} />;
    case WidgetType.LABEL:
      return <LabelWidget item={linkItem as LabelItem} onDelete={onDelete} onUpdateItem={onUpdateItem} isEditing={isEditing} />;
    case WidgetType.GROUP:
      return (
        <GroupWidget
          item={linkItem as GroupItem}
          onDelete={onDelete}
          onUpdateItem={onUpdateItem}
          isEditing={isEditing}
          openInNewTab={openInNewTab}
          groups={groups}
          onMoveItem={onMoveItem}
          isDraggedOver={activeDragGroupId === linkItem.id}
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
          item={linkItem as LinkItem}
          onDelete={onDelete}
          onViewModeChange={onViewModeChange}
          onUpdateItem={onUpdateItem}
          isEditing={isEditing}
          openInNewTab={openInNewTab}
          groups={groups}
          onMoveItem={onMoveItem}
          parentId={undefined}
        />
      );
  }
}

const WidgetRenderer = memo(WidgetRendererInner, (prev, next) => {
  if (prev.item !== next.item) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.openInNewTab !== next.openInNewTab) return false;
  if (prev.onDelete !== next.onDelete) return false;
  if (prev.onViewModeChange !== next.onViewModeChange) return false;
  if (prev.onUpdateItem !== next.onUpdateItem) return false;
  if (prev.onMoveItem !== next.onMoveItem) return false;

  if (next.item.type === 'group') {
    if (prev.activeDragGroupId !== next.activeDragGroupId) return false;
    if (prev.dragCursorCoords !== next.dragCursorCoords) return false;
    if (prev.draggedItem !== next.draggedItem) return false;
    if (prev.groups !== next.groups) return false;
    if (prev.onInnerDragStart !== next.onInnerDragStart) return false;
    if (prev.onInnerDrag !== next.onInnerDrag) return false;
    if (prev.onInnerDragStop !== next.onInnerDragStop) return false;
  }

  return true;
});

export default WidgetRenderer;
