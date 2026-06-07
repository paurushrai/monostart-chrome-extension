const DEFAULT_NAME = 'Link';

// Curated second-level public suffixes (NOT the full Public Suffix List, which
// is a heavy dependency for marginal gain on a personal dashboard). Covers the
// common ccSLDs: example.co.uk, example.com.au, example.co.jp, etc.
const SECOND_LEVEL_SUFFIXES = new Set([
  'co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'mil', 'gob', 'gouv',
  'nom', 'ne', 'or', 'go', 'sch', 'asn', 'id', 'info', 'biz',
]);

// Ordered by specificity; matched as the first occurrence in the title.
const TITLE_SEPARATORS = [' - ', ' – ', ' — ', ' | ', ' · ', ' :: ', ' • '];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// Node's URL parser returns `[::1]` (with brackets) as hostname for IPv6
// literals; detect by leading bracket rather than colon to avoid re-bracketing.
const isIPv6Hostname = (host: string): boolean => host.startsWith('[');

const capitalizeFirst = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : DEFAULT_NAME;

const deriveFromTitle = (title: string | undefined): string => {
  const trimmed = title?.trim();
  if (!trimmed) return DEFAULT_NAME;
  let earliest = trimmed.length;
  for (const sep of TITLE_SEPARATORS) {
    const idx = trimmed.indexOf(sep);
    if (idx >= 0 && idx < earliest) earliest = idx;
  }
  const head = trimmed.slice(0, earliest).trim();
  return head || DEFAULT_NAME;
};

// Resolve the registrable domain's main label, stripping all subdomains and
// accounting for second-level public suffixes (e.g. bbc.co.uk -> "bbc").
const registrableLabel = (domain: string): string => {
  const labels = domain.split('.');
  if (labels.length >= 3 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 2] ?? '')) {
    return labels[labels.length - 3] ?? domain;
  }
  if (labels.length >= 2) return labels[labels.length - 2] ?? domain;
  return labels[0] ?? domain;
};

const parseUrl = (raw: string): URL | null => {
  try {
    return new URL(raw);
  } catch {
    // Scheme-less input (e.g. "example.com") throws on first parse; retry
    // with an https:// prefix before giving up.
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
};

/**
 * Turn a URL (and optional fallback title) into a clean, predictable display
 * name. Never throws; always returns a non-empty string. A user-set custom
 * name should be preferred by callers before calling this.
 */
export const deriveSiteName = (url: string | undefined, fallbackTitle?: string): string => {
  if (!url) return deriveFromTitle(fallbackTitle);

  const parsed = parseUrl(url);
  if (!parsed) return deriveFromTitle(fallbackTitle);

  // `hostname` is lowercased by the URL parser for normal hosts; force lower
  // for edge cases (chrome://, custom schemes) for consistent matching.
  let host = parsed.hostname.toLowerCase();

  // IPv6 literal — Node's URL parser returns `[::1]` (already bracketed).
  // Return verbatim (preserving brackets) without further processing.
  if (isIPv6Hostname(host)) return parsed.hostname;

  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!host) return deriveFromTitle(fallbackTitle);

  // IPv4 literal — return verbatim.
  if (IPV4.test(host)) return host;

  // Single-label host (localhost, intranet name, chrome://settings host).
  if (!host.includes('.')) return capitalizeFirst(host);

  const withoutWww = host.replace(/^www\d*\./, '');
  return capitalizeFirst(registrableLabel(withoutWww));
};
