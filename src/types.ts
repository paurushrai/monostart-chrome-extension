interface BaseItem {
  id: string;
  i?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  isHeaderLink?: boolean;
  parentId?: string | null;
  order?: number;
  viewMode?: 'icon' | 'icon+text' | 'card' | 'text';
}

export interface LinkItem extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  favicon?: string;
  customName?: string;
  theme?: string;
}

export interface GroupItem extends BaseItem {
  type: 'group';
  title: string;
  borderColor: string;
  cols?: number;
  layout?: 'grid' | 'list';
  links: LinkItem[];
}

export interface IframeItem extends BaseItem {
  type: 'iframe';
  title: string;
  url?: string;
  mode?: 'embed' | 'url';
  embedHtml?: string;
}

export interface TodoItem extends BaseItem {
  type: 'todo';
  title: string;
}

export interface TimerItem extends BaseItem {
  type: 'timer';
  title: string;
}

export interface NoteItem extends BaseItem {
  type: 'note';
  title: string;
  content?: string;
  noteColor?: string;
}

export interface ImageItem extends BaseItem {
  type: 'image';
  title: string;
  url?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface LabelItem extends BaseItem {
  type: 'label';
  text: string;
  align?: 'left' | 'center' | 'right';
  size?: string;
  fontWeight?: string;
  opacity?: string;
  cardStyle?: boolean;
}

export interface GoogleSearchItem extends BaseItem {
  type: 'google-search';
  title: string;
  variant?: 'bar' | 'logo';
  logoStyle?: 'color' | 'mono';
}

export interface RemindersItem extends BaseItem {
  type: 'reminders';
  title: string;
}

export type WidgetItem =
  | LinkItem | GroupItem | IframeItem | TodoItem | TimerItem
  | NoteItem | ImageItem | LabelItem | GoogleSearchItem | RemindersItem;

export interface DragPlaceholder {
  id: 'drag-out-placeholder' | 'drag-placeholder';
  type: 'link';
  title: string;
  url: '';
  x: number;
  y: number;
  w: number;
  h: number;
  viewMode?: 'icon' | 'card';
}

export type DisplayItem = WidgetItem | DragPlaceholder;

export interface TodoEntry {
  id: number;
  text: string;
  completed: boolean;
}

export interface TimerEntry {
  id: number;
  label: string;
  durationMs: number;
  remainingMs: number;
  isRunning: boolean;
  endTime: number | null;
}

export interface ReminderEntry {
  id: string;
  text: string;
  dueAt: number;
  recurrence: 'none' | '30min' | 'hourly' | 'daily' | 'weekly' | 'custom';
  customIntervalMs?: number;
  lastFiredAt?: number;
  completed?: boolean;
}

export interface DashboardBackground {
  type: 'none' | 'color' | 'gradient' | 'image';
  value?: string;
  blur?: number;
  dim?: number;
}

export interface Settings {
  openInNewTab: boolean;
  themeMode?: 'light' | 'dark' | 'device';
  themeColor?: string;
  background?: DashboardBackground;
}

export interface DragCoords { x: number; y: number; }
export interface GridSlot   { x: number; y: number; }

export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union case: ${JSON.stringify(value)}`);
}
