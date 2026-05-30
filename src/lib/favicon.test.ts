import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFaviconUrl, siteFaviconUrl, faviconCandidates } from './favicon';

const EXT_ID = 'chrome-extension://abcdef';

const stubExtensionContext = () => {
  vi.stubGlobal('chrome', {
    runtime: { getURL: (p: string) => `${EXT_ID}${p}` },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('siteFaviconUrl', () => {
  it("points at the site's own /favicon.ico", () => {
    expect(siteFaviconUrl('https://drive.google.com/home')).toBe('https://drive.google.com/favicon.ico');
  });

  it('returns empty string for missing/invalid urls', () => {
    expect(siteFaviconUrl(undefined)).toBe('');
    expect(siteFaviconUrl('not a url')).toBe('');
  });
});

describe('buildFaviconUrl', () => {
  it('uses the browser _favicon API when in an extension context', () => {
    stubExtensionContext();
    const url = buildFaviconUrl('https://drive.google.com/home');
    expect(url.startsWith(`${EXT_ID}/_favicon/`)).toBe(true);
    expect(url).toContain('pageUrl=');
    expect(url).toContain('size=128');
  });

  it("falls back to the site's /favicon.ico outside an extension context", () => {
    expect(buildFaviconUrl('https://drive.google.com/home')).toBe('https://drive.google.com/favicon.ico');
  });
});

describe('faviconCandidates', () => {
  it('orders sources best-first AND always includes a site fallback after _favicon', () => {
    stubExtensionContext();
    const candidates = faviconCandidates({ url: 'https://drive.google.com/home', favicon: 'https://saved.example/icon.png' });

    // 1. browser favicon store first (freshest, matches the popup)
    expect(candidates[0] ?? '').toContain(`${EXT_ID}/_favicon/`);
    // 2. the site's own favicon is present as a graceful fallback — this is the
    //    guard that broke previously: a failing _favicon left no fallback.
    expect(candidates).toContain('https://drive.google.com/favicon.ico');
    // 3. the stored favicon is the last resort
    expect(candidates[candidates.length - 1]).toBe('https://saved.example/icon.png');
  });

  it('de-duplicates identical sources (dev context where _favicon === site favicon)', () => {
    const candidates = faviconCandidates({ url: 'https://drive.google.com/home' });
    expect(candidates).toEqual(['https://drive.google.com/favicon.ico']);
  });

  it('returns an empty list when there is nothing to show', () => {
    expect(faviconCandidates({})).toEqual([]);
  });
});
