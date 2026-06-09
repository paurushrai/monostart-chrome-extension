import { Search, Globe, CheckSquare, Clock, Folder, FileText, Image, Type, Bell } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { WidgetItem } from '../types';

export const WidgetType = {
  LINK: 'link',
  GROUP: 'group',
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
  defaults?: Partial<WidgetItem>;
  layout: WidgetLayoutMeta;
}

const WIDGETS = [
  {
    type: WidgetType.LINK,
    addable: false,
    layout: { minW: 1, minH: 1, maxW: 6, maxH: 1, resizable: true },
  },
  {
    type: WidgetType.GOOGLE_SEARCH,
    addable: true,
    name: 'Google Search',
    description: 'Search Google or type a URL.',
    icon: Search,
    defaults: { w: 6, h: 1, title: 'Google Search', variant: 'bar' },
    layout: { minW: 6, maxW: 8, minH: 1, maxH: 4, resizable: true },
  },
  {
    type: WidgetType.GROUP,
    addable: true,
    name: 'Group',
    description: 'A custom-colored group for organizing your links.',
    icon: Folder,
    defaults: { w: 3, h: 4, title: 'New Group', borderColor: '200 73% 52%', links: [] },
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
    defaults: { w: 3, h: 3, title: 'Todo List' },
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
    layout: { minW: 3, minH: 3, resizable: true },
  },
  {
    type: WidgetType.IMAGE,
    addable: true,
    name: 'Image',
    description: 'Add an image from a URL or upload a local file.',
    icon: Image,
    defaults: { w: 4, h: 3, title: 'Image', url: '', fit: 'cover' },
    layout: { minW: 4, minH: 3, resizable: true },
  },
  {
    type: WidgetType.LABEL,
    addable: true,
    name: 'Text Label',
    description: 'Add a clean floating text header or title to style your grid.',
    icon: Type,
    defaults: { w: 2, h: 1, text: 'Heading', align: 'left', size: 'text-3xl', fontWeight: 'font-bold', opacity: 'opacity-100' },
    layout: { minW: 2, minH: 1, resizable: true },
  },
  {
    type: WidgetType.IFRAME,
    addable: true,
    name: 'Embedded Page',
    description: 'Embed any website as a live widget.',
    icon: Globe,
    defaults: { w: 3, h: 3, title: 'Embedded Page', url: 'https://www.google.com' },
    layout: { minW: 3, minH: 3, resizable: true },
  },
] as const satisfies readonly WidgetMeta[];

const META_BY_TYPE: Record<string, WidgetMeta> =
  Object.fromEntries(WIDGETS.map((w) => [w.type, w]));

const FALLBACK_LAYOUT: WidgetLayoutMeta = { minW: 1, minH: 1, resizable: true };

export const WIDGET_CATALOG: readonly WidgetMeta[] = WIDGETS.filter((w) => w.addable);

export const getWidgetMeta = (type: string | undefined): WidgetMeta | undefined =>
  type === undefined ? undefined : META_BY_TYPE[type];

export const getWidgetLayout = (type: string | undefined): WidgetLayoutMeta =>
  (type !== undefined && META_BY_TYPE[type]?.layout) || FALLBACK_LAYOUT;

export const getWidgetMinSize = (type: string | undefined): { minW: number; minH: number } => {
  const layout = getWidgetLayout(type);
  return {
    minW: layout.placementMin?.minW ?? layout.minW ?? 1,
    minH: layout.placementMin?.minH ?? layout.minH ?? 1,
  };
};

export const RESIZABLE_TYPES: ReadonlySet<string> = new Set(
  WIDGETS.filter((w) => w.layout?.resizable).map((w) => w.type)
);
