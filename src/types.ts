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

export interface RegularLink extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  favicon?: string;
  customName?: string;
  theme?: string;
}

export interface Section extends BaseItem {
  type: 'section';
  title: string;
  borderColor: string;
  cols?: number;
  links: RegularLink[];
}

export interface Iframe extends BaseItem {
  type: 'iframe';
  title: string;
  url?: string;
  mode?: 'embed' | 'url';
  embedHtml?: string;
}

export interface TodoWidget extends BaseItem {
  type: 'todo';
  title: string;
}

export interface TimerWidget extends BaseItem {
  type: 'timer';
  title: string;
}

export interface Note extends BaseItem {
  type: 'note';
  title: string;
  content?: string;
  noteColor?: string;
}

export interface ImageWidget extends BaseItem {
  type: 'image';
  title: string;
  url?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface Label extends BaseItem {
  type: 'label';
  text: string;
  align?: 'left' | 'center' | 'right';
  size?: string;
  fontWeight?: string;
  opacity?: string;
  cardStyle?: boolean;
}

export interface GoogleSearch extends BaseItem {
  type: 'google-search';
  title: string;
  variant?: 'bar' | 'logo';
  logoStyle?: 'color' | 'mono';
}

export interface Reminders extends BaseItem {
  type: 'reminders';
  title: string;
}

export type LinkItem =
  | RegularLink | Section | Iframe | TodoWidget | TimerWidget
  | Note | ImageWidget | Label | GoogleSearch | Reminders;

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

export type DisplayItem = LinkItem | DragPlaceholder;

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

export interface Settings {
  openInNewTab: boolean;
  themeMode?: 'light' | 'dark' | 'device';
  themeColor?: string;
}

export interface DragCoords { x: number; y: number; }
export interface GridSlot   { x: number; y: number; }

export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union case: ${JSON.stringify(value)}`);
}
