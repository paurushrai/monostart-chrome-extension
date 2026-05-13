import { Search, Globe } from 'lucide-react';

export const WIDGET_CATALOG = [
  {
    type: 'google-search',
    name: 'Google Search',
    description: 'Search Google or type a URL.',
    icon: Search,
    defaults: { w: 8, h: 1, title: 'Google Search' },
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
