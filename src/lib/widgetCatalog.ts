// Single source of truth for every widget type the dashboard knows about.
//
// Each entry describes a widget's identity, its placement constraints, and
// (for user-addable widgets) the metadata AddWidgetModal needs to render it.
//
// Adding a new widget = add ONE entry here. Layout math, resize rules,
// placement defaults, type enum, and the "Add Widget" menu all read from this.

import { Search, Globe, CheckSquare, Clock, Folder, FileText, Image, Type, Bell } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { LinkItem } from '../types';

// `as const` gives literal-type narrowness on values; the helper type derives
// the union from the keys so adding/removing a member only requires one edit.
export const WidgetType = {
  LINK: 'link',
  SECTION: 'section',
  GOOGLE_SEARCH: 'google-search',
  IFRAME: 'iframe',
  TODO: 'todo',
  TIMER: 'timer',
  NOTE: 'note',
  IMAGE: 'image',
  LABEL: 'label',
  REMINDERS: 'reminders',
} as const;

export type WidgetType = typeof WidgetType[keyof typeof WidgetType];

// Lucide-react icon component shape.
type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

interface WidgetLayoutMeta {
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  resizable: boolean;
  placementMin?: { minW?: number; minH?: number };
}

export interface WidgetMeta {
  type: WidgetType;
  addable: boolean;
  name?: string;
  description?: string;
  icon?: LucideIcon;
  defaults?: Partial<LinkItem>;
  layout: WidgetLayoutMeta;
}

/**
 * Per-widget metadata.
 * - `addable`: appears in the AddWidgetModal grid (link is added via AddLinkModal instead).
 * - `layout.{min,max}{W,H}`: passed straight to react-grid-layout.
 * - `layout.resizable`: when false, RGL hides the resize handle.
 * - `layout.placementMin`: minimum size when shrink-to-fit kicks in during saveLink.
 *    Defaults to layout.minW/minH if omitted.
 * - `defaults`: initial item state on creation (passed through saveLink).
 *
 * `satisfies` preserves the literal-type narrowness of each entry's `type`
 * field (so we can pattern-match on it) while also checking the entire shape
 * against WidgetMeta at compile time.
 */
const WIDGETS = [
  {
    type: WidgetType.LINK,
    addable: false,
    layout: { minW: 1, minH: 1, maxW: 6, maxH: 2, resizable: true },
  },
  {
    type: WidgetType.GOOGLE_SEARCH,
    addable: true,
    name: 'Google Search',
    description: 'Search Google or type a URL.',
    icon: Search,
    defaults: { w: 6, h: 1, title: 'Google Search', variant: 'bar' },
    // Overall range. DashboardGrid pins min/max per-item by variant: bar=1, logo=4.
    layout: { minW: 6, maxW: 8, minH: 1, maxH: 4, resizable: true },
  },
  {
    type: WidgetType.SECTION,
    addable: true,
    name: 'Link Section',
    description: 'Create an elegant, custom-colored folder container for organizing links.',
    icon: Folder,
    defaults: { w: 6, h: 4, title: 'New Section', borderColor: '200 73% 52%', links: [] },
    layout: { minW: 3, minH: 4, resizable: true },
  },
  {
    type: WidgetType.REMINDERS,
    addable: true,
    name: 'Reminders',
    description: 'Schedule reminders with browser notifications. Hourly / daily / weekly recurrence supported.',
    icon: Bell,
    defaults: { w: 4, h: 4, title: 'Reminders' },
    layout: { minW: 4, minH: 4, resizable: true },
  },
  {
    type: WidgetType.TODO,
    addable: true,
    name: 'Todo List',
    description: 'Keep track of your tasks.',
    icon: CheckSquare,
    defaults: { w: 3, h: 3, title: 'Todos' },
    layout: { minW: 3, minH: 3, resizable: true },
  },
  {
    type: WidgetType.TIMER,
    addable: true,
    name: 'Timers',
    description: 'Manage multiple timers.',
    icon: Clock,
    defaults: { w: 3, h: 3, title: 'Timers' },
    layout: { minW: 3, minH: 3, resizable: true },
  },
  {
    type: WidgetType.NOTE,
    addable: true,
    name: 'Sticky Note',
    description: 'Write notes or reminders with custom colors.',
    icon: FileText,
    defaults: { w: 3, h: 3, title: 'Sticky Note', content: '', noteColor: 'default' },
    layout: { minW: 1, minH: 1, resizable: true },
  },
  {
    type: WidgetType.IMAGE,
    addable: true,
    name: 'Photo / Image',
    description: 'Add an image from a URL or upload a local file.',
    icon: Image,
    defaults: { w: 3, h: 3, title: 'Photo Frame', url: '', fit: 'cover' },
    layout: { minW: 1, minH: 1, resizable: true },
  },
  {
    type: WidgetType.LABEL,
    addable: true,
    name: 'Text Label',
    description: 'Add a clean floating text header or title to style your grid.',
    icon: Type,
    defaults: { w: 4, h: 1, text: 'Google', align: 'left', size: 'text-3xl', fontWeight: 'font-bold', opacity: 'opacity-100' },
    layout: { minW: 1, minH: 1, resizable: true },
  },
  {
    type: WidgetType.IFRAME,
    addable: true,
    name: 'Embedded Page',
    description: 'Embed any website as a live widget.',
    icon: Globe,
    defaults: { w: 4, h: 4, title: 'Embed', url: 'https://www.google.com' },
    layout: { minW: 1, minH: 1, resizable: true },
  },
] as const satisfies readonly WidgetMeta[];

const META_BY_TYPE: Record<string, WidgetMeta> =
  Object.fromEntries(WIDGETS.map((w) => [w.type, w]));

const FALLBACK_LAYOUT: WidgetLayoutMeta = { minW: 1, minH: 1, resizable: true };

/** Widgets shown in the "Add Widget" menu — addable=true only. */
export const WIDGET_CATALOG: readonly WidgetMeta[] = WIDGETS.filter((w) => w.addable);

/** Full metadata for any known widget type, including 'link'. */
export const getWidgetMeta = (type: string | undefined): WidgetMeta | undefined =>
  type === undefined ? undefined : META_BY_TYPE[type];

/** Layout constraints for a widget type. Returns sensible defaults for unknown types. */
export const getWidgetLayout = (type: string | undefined): WidgetLayoutMeta =>
  (type !== undefined && META_BY_TYPE[type]?.layout) || FALLBACK_LAYOUT;

/** Minimum placement size for shrink-to-fit. Falls back to layout min. */
export const getWidgetMinSize = (type: string | undefined): { minW: number; minH: number } => {
  const layout = getWidgetLayout(type);
  return {
    minW: layout.placementMin?.minW ?? layout.minW ?? 1,
    minH: layout.placementMin?.minH ?? layout.minH ?? 1,
  };
};

/** Set of types whose w/h should be persisted on layout change. */
export const RESIZABLE_TYPES: ReadonlySet<string> = new Set(
  WIDGETS.filter((w) => w.layout?.resizable).map((w) => w.type)
);
