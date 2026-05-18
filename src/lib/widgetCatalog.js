import { Search, Globe, CheckSquare, Clock, Folder } from 'lucide-react';

export const WIDGET_CATALOG = [
  {
    type: 'google-search',
    name: 'Google Search',
    description: 'Search Google or type a URL.',
    icon: Search,
    defaults: { w: 6, h: 1, title: 'Google Search' },
  },
  {
    type: 'todo',
    name: 'Todo List',
    description: 'Keep track of your tasks.',
    icon: CheckSquare,
    defaults: { w: 3, h: 3, title: 'Todos' },
  },
  {
    type: 'timer',
    name: 'Timers',
    description: 'Manage multiple timers.',
    icon: Clock,
    defaults: { w: 3, h: 3, title: 'Timers' },
  },
  {
    type: 'section',
    name: 'Link Section',
    description: 'Create an elegant, custom-colored folder container for organizing links.',
    icon: Folder,
    defaults: { w: 6, h: 4, title: 'New Section', borderColor: '200 73% 52%', links: [] },
  },
  {
    type: 'iframe',
    name: 'Embedded Page',
    description: 'Embed any website as a live widget.',
    icon: Globe,
    defaults: { w: 4, h: 4, title: 'Embed', url: 'https://www.google.com' },
  },
];

export const getWidgetMeta = (type) =>
  WIDGET_CATALOG.find((w) => w.type === type);
