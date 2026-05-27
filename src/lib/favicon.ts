// Shared favicon resolver. Both LinkCard and HeaderLink must render the same
// image for the same link — define the URL computation once here so the two
// can't drift.

/**
 * Build a Google faviconV2 URL for the given site URL. Returns '' when no
 * URL is provided so callers can `||` it with a stored fallback.
 */
export const buildFaviconUrl = (linkUrl: string | undefined): string => {
  if (!linkUrl) return '';
  try {
    return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(linkUrl)}&size=128`;
  } catch {
    return '';
  }
};

/**
 * The favicon source for a stored link: prefer a freshly-built gstatic URL
 * from the current site url, fall back to whatever was stored on the item
 * (covers legacy data and the case where url is somehow missing).
 */
export const resolveFavicon = (item: { url?: string; favicon?: string }): string =>
  buildFaviconUrl(item.url) || item.favicon || '';
