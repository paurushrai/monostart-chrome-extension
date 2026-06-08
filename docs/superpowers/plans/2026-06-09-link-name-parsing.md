# Link Name Parsing (`deriveSiteName`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated, crude link-name parsing with one pure, fully-tested `deriveSiteName(url, fallbackTitle?)` and reuse it in the LinkCard display and every link-creation site.

**Architecture:** A new pure module `src/lib/siteName.ts` exposes `deriveSiteName`. It parses the URL, handles IPs / single-label hosts / empty hosts, resolves the registrable domain label via a curated second-level-suffix heuristic, capitalizes the first letter, and falls back to a separator-split of the title. `LinkCard` derives live from `url` (so existing links benefit with no migration); the creation sites use it to set the stored `title`.

**Tech Stack:** TypeScript, React 19, Vitest (node env). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-09-link-name-parsing-design.md`

---

## File Structure

**New:**
- `src/lib/siteName.ts` — `deriveSiteName` + private helpers (`deriveFromTitle`, `capitalizeFirst`, `registrableLabel`) + `SECOND_LEVEL_SUFFIXES`, `TITLE_SEPARATORS` constants. One responsibility: turn a URL/title into a display name.
- `src/lib/__tests__/siteName.test.ts` — full scenario-matrix coverage.

**Modified (each replaces inline parsing with `deriveSiteName`):**
- `src/components/LinkCard.tsx` — display name.
- `src/components/AddLinkModal.tsx` — stored title fallback.
- `src/components/widgets/GroupWidget.tsx` — stored title on add-link.
- `src/components/AddWidgetModal.tsx` — iframe widget title.

**Explicitly NOT changed:** `src/popup/PopupApp.tsx` (`pageHost` is an intentional raw-host display; popup saves the real tab title) and `src/components/widgets/GoogleSearchWidget.tsx` (raw host for suggestions/history).

---

## Task 1: The `deriveSiteName` parser (pure, fully tested)

**Files:**
- Create: `src/lib/siteName.ts`
- Test: `src/lib/__tests__/siteName.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/siteName.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveSiteName } from '../siteName';

describe('deriveSiteName — registrable domain', () => {
  it('strips www and returns the brand label', () => {
    expect(deriveSiteName('https://www.google.com')).toBe('Google');
  });
  it('strips all subdomains to the registrable label', () => {
    expect(deriveSiteName('https://drive.google.com')).toBe('Google');
    expect(deriveSiteName('https://support.apple.com')).toBe('Apple');
    expect(deriveSiteName('https://mail.proton.me')).toBe('Proton');
  });
  it('handles multi-part (second-level) TLDs', () => {
    expect(deriveSiteName('https://bbc.co.uk')).toBe('Bbc');
    expect(deriveSiteName('https://docs.example.co.uk')).toBe('Example');
    expect(deriveSiteName('https://a.b.c.co.uk')).toBe('C');
  });
  it('strips numbered www and a trailing dot', () => {
    expect(deriveSiteName('https://www2.example.com')).toBe('Example');
    expect(deriveSiteName('https://example.com.')).toBe('Example');
  });
  it('ignores userinfo, port, path and query', () => {
    expect(deriveSiteName('https://user:pass@example.com:8443/p?q=1')).toBe('Example');
  });
  it('lowercases before processing', () => {
    expect(deriveSiteName('HTTPS://WWW.EXAMPLE.COM')).toBe('Example');
  });
});

describe('deriveSiteName — special hosts', () => {
  it('returns IPv4 hosts verbatim', () => {
    expect(deriveSiteName('http://192.168.1.1:8080')).toBe('192.168.1.1');
  });
  it('returns bracketed IPv6 hosts verbatim', () => {
    expect(deriveSiteName('http://[::1]:3000')).toBe('[::1]');
  });
  it('capitalizes single-label hosts', () => {
    expect(deriveSiteName('http://localhost:3000')).toBe('Localhost');
    expect(deriveSiteName('chrome://settings')).toBe('Settings');
  });
});

describe('deriveSiteName — scheme-less input', () => {
  it('retries parsing with an https prefix', () => {
    expect(deriveSiteName('my-cool-site.com')).toBe('My-cool-site');
  });
});

describe('deriveSiteName — title fallback', () => {
  it('uses the title when the URL has no usable host', () => {
    expect(deriveSiteName('file:///Users/x/a.pdf', 'a.pdf — Reader')).toBe('a.pdf');
    expect(deriveSiteName('data:text/plain,hi')).toBe('Link');
  });
  it('splits the title on the first known separator', () => {
    expect(deriveSiteName(undefined, 'GitHub · Build software')).toBe('GitHub');
    expect(deriveSiteName(undefined, 'Docs | Example')).toBe('Docs');
    expect(deriveSiteName(undefined, 'A - B - C')).toBe('A');
  });
  it('returns Link for empty/whitespace titles and nothing else', () => {
    expect(deriveSiteName(undefined, '   ')).toBe('Link');
    expect(deriveSiteName(undefined)).toBe('Link');
    expect(deriveSiteName('')).toBe('Link');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- siteName`
Expected: FAIL — cannot resolve `../siteName`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/siteName.ts`:

```ts
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
const registrableLabel = (host: string): string => {
  const labels = host.split('.');
  if (labels.length >= 3 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 2] ?? '')) {
    return labels[labels.length - 3] ?? host;
  }
  if (labels.length >= 2) return labels[labels.length - 2] ?? host;
  return labels[0] ?? host;
};

const parseUrl = (raw: string): URL | null => {
  try {
    return new URL(raw);
  } catch {
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

  let host = parsed.hostname.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!host) return deriveFromTitle(fallbackTitle);

  // IPv6 literal — `new URL('http://[::1]:3000').hostname` is '::1' (no
  // brackets, no port), so re-bracket it. Return verbatim.
  if (parsed.hostname.includes(':')) return `[${parsed.hostname}]`;
  // IPv4 literal — return verbatim.
  if (IPV4.test(host)) return host;

  // Single-label host (localhost, intranet name, chrome://settings host).
  if (!host.includes('.')) return capitalizeFirst(host);

  const withoutWww = host.replace(/^www\d*\./, '');
  return capitalizeFirst(registrableLabel(withoutWww));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- siteName`
Expected: PASS (all cases). If the IPv6 or `chrome://settings` case fails, verify with a quick node check: `node -e "console.log(new URL('chrome://settings').hostname, '|', new URL('http://[::1]:3000').hostname)"` and confirm the branches match real `URL` output before adjusting.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/lib/siteName.ts src/lib/__tests__/siteName.test.ts`
Expected: clean (explicit return types on exports, no `any`, no `!`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/siteName.ts src/lib/__tests__/siteName.test.ts
git commit -m "feat(links): add shared deriveSiteName parser"
```

---

## Task 2: Use `deriveSiteName` for the LinkCard display name

**Files:**
- Modify: `src/components/LinkCard.tsx`

- [ ] **Step 1: Add the import**

In `src/components/LinkCard.tsx`, add to the imports (near the other `../lib` / type imports at the top of the file):

```tsx
import { deriveSiteName } from '../lib/siteName';
```

- [ ] **Step 2: Replace the local `getSiteName` and its call**

Delete the entire `getSiteName` function (currently lines 77-90, beginning `const getSiteName = (urlString: string | undefined) => {` and ending at its closing `};`). Then change the `siteName` line (currently line 92):

```tsx
  const siteName = customName || getSiteName(url);
```

to:

```tsx
  const siteName = customName || deriveSiteName(url, title);
```

`title` is already destructured from `item` on line 61 (`const { url, title, customName } = item;`) — keep it.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/components/LinkCard.tsx`
Expected: clean, and no "unused variable" for `title` (it is now used by `deriveSiteName`).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all pass (no behavior tests depend on the removed inline function).

- [ ] **Step 5: Commit**

```bash
git add src/components/LinkCard.tsx
git commit -m "feat(links): derive LinkCard name via shared parser"
```

---

## Task 3: Use `deriveSiteName` at the creation sites

**Files:**
- Modify: `src/components/AddLinkModal.tsx`
- Modify: `src/components/widgets/GroupWidget.tsx`
- Modify: `src/components/AddWidgetModal.tsx`

- [ ] **Step 1: AddLinkModal — import**

In `src/components/AddLinkModal.tsx` add near the existing imports:

```tsx
import { deriveSiteName } from '../lib/siteName';
```

- [ ] **Step 2: AddLinkModal — replace inline derivation**

Replace this block (currently lines 53-61):

```tsx
    try {
      const urlObj = new URL(finalUrl);
      if (!finalTitle) {
        finalTitle = urlObj.hostname.replace('www.', '');
      }
      faviconUrl = siteFaviconUrl(finalUrl);
    } catch {
      if (!finalTitle) finalTitle = finalUrl;
    }
```

with:

```tsx
    try {
      faviconUrl = siteFaviconUrl(finalUrl);
    } catch {
      /* favicon is best-effort */
    }
    if (!finalTitle) finalTitle = deriveSiteName(finalUrl);
```

(`deriveSiteName` never throws and falls back to `'Link'`, so the old `catch`-sets-`finalUrl` path is no longer needed. `faviconUrl` keeps its own guard since `siteFaviconUrl` can throw.)

- [ ] **Step 3: AddLinkModal — verify**

Run: `npm run typecheck && npx eslint src/components/AddLinkModal.tsx`
Expected: clean. Confirm `new URL` / `urlObj` is no longer referenced in this function (remove the now-unused local if the linter flags it — there should be none left).

- [ ] **Step 4: GroupWidget — import**

In `src/components/widgets/GroupWidget.tsx` add near the existing imports:

```tsx
import { deriveSiteName } from '../../lib/siteName';
```

- [ ] **Step 5: GroupWidget — replace inline derivation**

Replace this block (currently lines 137-145):

```tsx
    let linkTitle = '';
    let favicon = '';
    try {
      const urlObj = new URL(url);
      linkTitle = urlObj.hostname.replace('www.', '');
      favicon = siteFaviconUrl(url);
    } catch {
      linkTitle = url;
    }
```

with:

```tsx
    const linkTitle = deriveSiteName(url);
    let favicon = '';
    try {
      favicon = siteFaviconUrl(url);
    } catch {
      /* favicon is best-effort */
    }
```

Then update the `newLinkItem` object (currently `title: linkTitle,`) — it already uses `linkTitle`, so no change there. Confirm `linkTitle` is now `const` and still referenced.

- [ ] **Step 6: GroupWidget — verify**

Run: `npm run typecheck && npx eslint src/components/widgets/GroupWidget.tsx`
Expected: clean.

- [ ] **Step 7: AddWidgetModal — import**

In `src/components/AddWidgetModal.tsx` add near the existing imports:

```tsx
import { deriveSiteName } from '../lib/siteName';
```

- [ ] **Step 8: AddWidgetModal — replace inline derivation**

Replace this block (currently lines 101-111):

```tsx
      const embedUrl = rewriteToEmbedUrl(trimmed);
      let hostname = 'Embed';
      try {
        if (embedUrl) hostname = new URL(embedUrl).hostname.replace(/^www\./, '');
      } catch { /* empty */ }
      defaults = {
        ...selectedWidget.defaults,
        mode: 'url',
        url: embedUrl ?? undefined,
        title: hostname,
      } as Partial<WidgetItem>;
```

with:

```tsx
      const embedUrl = rewriteToEmbedUrl(trimmed);
      defaults = {
        ...selectedWidget.defaults,
        mode: 'url',
        url: embedUrl ?? undefined,
        title: embedUrl ? deriveSiteName(embedUrl) : 'Embed',
      } as Partial<WidgetItem>;
```

- [ ] **Step 9: AddWidgetModal — verify**

Run: `npm run typecheck && npx eslint src/components/AddWidgetModal.tsx`
Expected: clean (no unused `hostname` / `new URL`).

- [ ] **Step 10: Full suite + commit**

Run: `npm test`
Expected: all pass.

```bash
git add src/components/AddLinkModal.tsx src/components/widgets/GroupWidget.tsx src/components/AddWidgetModal.tsx
git commit -m "feat(links): use shared deriveSiteName at link/widget creation sites"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Quality gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: typecheck clean; lint 0 errors (pre-existing warnings only); all tests pass; build succeeds.

- [ ] **Step 2: Confirm no leftover inline parsers in the changed files**

Run: `grep -rn "hostname.replace" src/components`
Expected: matches ONLY in `widgets/GoogleSearchWidget.tsx` (intentional raw host) — none in `LinkCard.tsx`, `AddLinkModal.tsx`, `GroupWidget.tsx`, `AddWidgetModal.tsx`. (`PopupApp.tsx` keeps its `pageHost` raw-host display — that is expected and out of scope.)

- [ ] **Step 3: Manual spot-check (browser)**

Build is in `dist/`. Load unpacked, then:
- Add a link `https://drive.google.com` → card shows **Google** (not "Drive").
- Add `https://support.apple.com` → **Apple**.
- Add `https://bbc.co.uk` → **Bbc**.
- Add a link inside a group → name derives the same way.
- Add an iframe widget by URL → title is the brand label.
- A previously-saved link with a `customName` still shows the custom name (unchanged).

---

## Notes for the implementer

- **DRY:** all name derivation now flows through `deriveSiteName`. Do not re-introduce inline `hostname.replace(...)` anywhere.
- **YAGNI:** no full Public Suffix List, no punycode decoding (both are documented non-goals in the spec).
- **No behavior change to `customName`:** callers prefer `customName` before calling `deriveSiteName`.
- **`deriveSiteName` never throws** — that is why the old `try/catch`-around-`new URL` blocks collapse to a single call; keep the separate `try/catch` only around `siteFaviconUrl`, which can still throw.
