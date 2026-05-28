export const buildFaviconUrl = (linkUrl: string | undefined): string => {
  if (!linkUrl) return '';
  try {
    return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(linkUrl)}&size=128`;
  } catch {
    return '';
  }
};

export const resolveFavicon = (item: { url?: string; favicon?: string }): string =>
  buildFaviconUrl(item.url) || item.favicon || '';
