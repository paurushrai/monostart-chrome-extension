// Shared type definitions for the MonoStart dashboard.
// Nothing in this file emits runtime code.
//
// NOTE: `WidgetType` lives in `lib/widgetCatalog.ts`, not here. Widget metadata
// (icons, defaults, layout constraints) is centralized there, so the enum-like
// object naturally lives alongside its registry. Import `WidgetType` from
// `@/lib/widgetCatalog`, not from this file.

// ---------------------------------------------------------------------------
// Base item — shared shape across all widget types in the LinkItem union.
// ---------------------------------------------------------------------------

interface BaseItem {
  id: string;
  i?: string;            // RGL legacy mirror of id; not always set
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  // Header-bar bits — only meaningful when isHeaderLink === true
  isHeaderLink?: boolean;
  parentId?: string | null;
  order?: number;
  // Layout hint, conceptually only meaningful for RegularLink but hoisted here
  // so placement/layout code can read `item.viewMode` without narrowing first.
  // 'card' is set by the synthetic drag-placeholder only.
  viewMode?: 'icon' | 'icon+text' | 'card';
}

// ---------------------------------------------------------------------------
// Per-widget item shapes (discriminated by `type`).
// ---------------------------------------------------------------------------

export interface RegularLink extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  favicon?: string;
  customName?: string;
  theme?: string;
  // viewMode declared on BaseItem (above) so layout/placement code can read it
  // off any LinkItem without narrowing.
}

export interface Section extends BaseItem {
  type: 'section';
  title: string;
  borderColor: string;
  cols?: number;
  links: RegularLink[];     // sections only contain links, not nested sections
}

export interface Iframe extends BaseItem {
  type: 'iframe';
  title: string;
  url?: string;
  mode?: 'embed' | 'url';
  embedHtml?: string;
}

// Renamed from `Todo` / `Timer` to avoid collision with TodoEntry / TimerEntry.
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
  size?: string;            // tailwind text-* class
  fontWeight?: string;
  opacity?: string;
  cardStyle?: boolean;      // toggled by LabelWidget for card-vs-bare rendering
}

export interface GoogleSearch extends BaseItem {
  type: 'google-search';
  title: string;
}

export type LinkItem =
  | RegularLink | Section | Iframe | TodoWidget | TimerWidget
  | Note | ImageWidget | Label | GoogleSearch;

// ---------------------------------------------------------------------------
// Synthetic drag placeholders — never persisted, emitted only during a drag.
// Renderers MUST check id BEFORE switching on `type`, since the placeholder
// declares type:'link' to satisfy RGL but has none of RegularLink's fields.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-widget data persisted separately in chrome.storage.local.
// Keys: `todo-widget-${item.id}` → TodoEntry[]
//       `timer-widget-${item.id}` → TimerEntry[]
// Accessed via the `useWidgetStorage<T>(key, default)` hook.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// App-wide settings.
// ---------------------------------------------------------------------------

export interface Settings {
  openInNewTab: boolean;
  themeMode?: 'light' | 'dark' | 'device';
  themeColor?: string;       // HSL triple as a single string: "200 73% 52%"
}

// ---------------------------------------------------------------------------
// Misc helpers.
// ---------------------------------------------------------------------------

export interface DragCoords { x: number; y: number; }
export interface GridSlot   { x: number; y: number; }

/**
 * Compile-time exhaustiveness checker.
 *   default: return assertNever(item);
 * Fails the build if a new variant is added to a discriminated union without
 * a corresponding case.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union case: ${JSON.stringify(value)}`);
}
