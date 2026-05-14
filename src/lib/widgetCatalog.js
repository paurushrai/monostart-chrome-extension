// Single source of truth for every widget type the dashboard knows about.
//
// Each entry describes a widget's identity, its placement constraints, and
// (for user-addable widgets) the metadata AddWidgetModal needs to render it.
//
// Adding a new widget = add ONE entry here. Layout math, resize rules,
// placement defaults, type enum, and the "Add Widget" menu all read from this.

import { Search, Globe, CheckSquare, Clock, Folder, FileText, Image, Type } from 'lucide-react';

export const WidgetType = Object.freeze({
  LINK: 'link',
  SECTION: 'section',
  GOOGLE_SEARCH: 'google-search',
  IFRAME: 'iframe',
  TODO: 'todo',
  TIMER: 'timer',
  NOTE: 'note',
  IMAGE: 'image',
  LABEL: 'label',
});

/**
 * Per-widget metadata.
 * - `addable`: appears in the AddWidgetModal grid (link is added via AddLinkModal instead).
 * - `layout.{min,max}{W,H}`: passed straight to react-grid-layout.
 * - `layout.resizable`: when false, RGL hides the resize handle.
 * - `layout.placementMin`: minimum size when shrink-to-fit kicks in during saveLink.
 *    Defaults to layout.minW/minH if omitted.
 * - `defaults`: initial item state on creation (passed through saveLink).
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
    defaults: { w: 6, h: 1, title: 'Google Search' },
    layout: { minW: 6, maxW: 6, minH: 1, maxH: 1, resizable: false },
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
    type: WidgetType.SECTION,
    addable: true,
    name: 'Link Section',
    description: 'Create an elegant, custom-colored folder container for organizing links.',
    icon: Folder,
    defaults: { w: 6, h: 4, title: 'New Section', borderColor: '200 73% 52%', links: [] },
    layout: { minW: 3, minH: 4, resizable: true },
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
];

const META_BY_TYPE = Object.fromEntries(WIDGETS.map((w) => [w.type, w]));
const FALLBACK_LAYOUT = { minW: 1, minH: 1, resizable: true };

/** Widgets shown in the "Add Widget" menu — addable=true only. */
export const WIDGET_CATALOG = WIDGETS.filter((w) => w.addable);

/** Full metadata for any known widget type, including 'link'. */
export const getWidgetMeta = (type) => META_BY_TYPE[type];

/** Layout constraints for a widget type. Returns sensible defaults for unknown types. */
export const getWidgetLayout = (type) => META_BY_TYPE[type]?.layout ?? FALLBACK_LAYOUT;

/** Minimum placement size for shrink-to-fit. Falls back to layout min. */
export const getWidgetMinSize = (type) => {
  const layout = getWidgetLayout(type);
  return {
    minW: layout.placementMin?.minW ?? layout.minW ?? 1,
    minH: layout.placementMin?.minH ?? layout.minH ?? 1,
  };
};

/** Set of types whose w/h should be persisted on layout change. */
export const RESIZABLE_TYPES = new Set(
  WIDGETS.filter((w) => w.layout?.resizable).map((w) => w.type)
);
