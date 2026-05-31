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
  it('prefers the stored (browser-captured) favicon, with _favicon + site as fallbacks', () => {
    stubExtensionContext();
    const candidates = faviconCandidates({ url: 'https://drive.google.com/home', favicon: 'https://saved.example/icon.png' });

    // 1. the captured favicon wins — _favicon/site mis-resolve sub-property URLs.
    expect(candidates[0]).toBe('https://saved.example/icon.png');
    // 2. the browser favicon store is available as a fallback...
    expect(candidates.some((c) => c.includes(`${EXT_ID}/_favicon/`))).toBe(true);
    // 3. ...as is the site's own /favicon.ico.
    expect(candidates).toContain('https://drive.google.com/favicon.ico');
  });

  it('falls back to _favicon first when no favicon was captured', () => {
    stubExtensionContext();
    const candidates = faviconCandidates({ url: 'https://drive.google.com/home' });
    expect(candidates[0] ?? '').toContain(`${EXT_ID}/_favicon/`);
  });

  it('de-duplicates identical sources (dev context where _favicon === site favicon)', () => {
    const candidates = faviconCandidates({ url: 'https://drive.google.com/home' });
    expect(candidates).toEqual(['https://drive.google.com/favicon.ico']);
  });

  it('returns an empty list when there is nothing to show', () => {
    expect(faviconCandidates({})).toEqual([]);
  });
});
