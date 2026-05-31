const DEFAULT_SIZE = 128;

/**
 * Favicon sourced from the browser's own favicon store via Chrome's built-in
 * `_favicon` API — the same source the popup uses through `tab.favIconUrl`.
 * Reflects the latest icon the browser has for the site, no third-party
 * services. Requires the "favicon" permission in manifest.json AND an
 * extension reload after the permission is first added.
 *
 * Outside an extension context (dev preview) it falls back to the site's own
 * `/favicon.ico`.
 */
export const buildFaviconUrl = (linkUrl: string | undefined, size = DEFAULT_SIZE): string => {
  if (!linkUrl) return '';
  try {
    const pageUrl = new URL(linkUrl).toString();
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
      faviconUrl.searchParams.set('pageUrl', pageUrl);
      faviconUrl.searchParams.set('size', String(size));
      return faviconUrl.toString();
    }
    return siteFaviconUrl(linkUrl);
  } catch {
    return '';
  }
};

/**
 * Favicon fetched directly from the site's own origin (`/favicon.ico`).
 * Stable, no permission required, no third party — used as a graceful
 * fallback and as the persisted favicon value for manually-added links.
 */
export const siteFaviconUrl = (linkUrl: string | undefined): string => {
  if (!linkUrl) return '';
  try {
    return `${new URL(linkUrl).origin}/favicon.ico`;
  } catch {
    return '';
  }
};

/**
 * Ordered, de-duplicated list of favicon sources to try for an item, best
 * first. Consumers attempt each in turn (via `onError`) so a single failing
 * source never leaves a broken image:
 *   1. the stored favicon — the real icon the browser captured when the page
 *      was open (the popup's `tab.favIconUrl`). This is the authoritative
 *      source: it's the actual site icon, not a guess.
 *   2. browser favicon store (`_favicon`) — for links with no captured icon.
 *   3. the site's own `/favicon.ico` — last-resort direct fetch.
 *
 * The stored favicon comes first on purpose: both `_favicon` and a bare
 * `/favicon.ico` mis-resolve many sub-property URLs (e.g. a `/maps` link
 * resolves to the bare Google "G", Drive/Photos to a generic globe), and
 * `_favicon` always returns a 200 so it would otherwise win every time.
 */
export const faviconCandidates = (item: { url?: string; favicon?: string }): string[] => {
  const ordered = [item.favicon ?? '', buildFaviconUrl(item.url), siteFaviconUrl(item.url)];
  return Array.from(new Set(ordered.filter((src): src is string => Boolean(src))));
};
