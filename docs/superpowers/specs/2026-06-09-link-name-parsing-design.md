# Link Name Parsing: `deriveSiteName`

**Date:** 2026-06-09
**Status:** Approved design
**Scope:** One shared, tested parser for the display/stored name of a link, reused by the LinkCard display and every link-creation site.

## Problem

The name shown on a link card is computed live in `LinkCard.tsx` by `getSiteName(url)` (`customName || getSiteName(url)`). The same crude parsing — `new URL(url).hostname.replace(/^www\./,'')` then take the first label, with a hardcoded subdomain allowlist — is duplicated in five other places that set the stored `title` at creation:

- `src/components/LinkCard.tsx:77-90` (`getSiteName`, the display name)
- `src/components/AddLinkModal.tsx:54-56`
- `src/components/widgets/GroupWidget.tsx:140-141`
- `src/popup/PopupApp.tsx:119`
- `src/components/AddWidgetModal.tsx:104` (iframe widget title)

The current logic breaks on many real inputs:

- Subdomains use a hardcoded allowlist, so `drive.google.com` → "Drive", `support.apple.com` → "Support" (inconsistent; not the brand).
- IP hosts: `192.168.1.1` → "192".
- Empty hostnames (`file://`, `data:`, `blob:`) fall through inconsistently.
- Title fallback only splits on ` - ` (misses `|`, `·`, em/en dash).
- Only first-letter capitalization.

## Goals

- A single pure function `deriveSiteName(url, fallbackTitle?)` that returns a clean, predictable display name across all URL shapes.
- Reuse it for the LinkCard display **and** at all creation sites (so the stored `title`, used by HeaderLink and the popup, is consistent).
- Default subdomain behavior: **registrable domain** (strip all subdomains → the brand label).
- Fully unit-tested as pure logic (fits `src/lib/__tests__`).

## Non-Goals (deliberate, flagged not fixed)

- **Full Public Suffix List.** A curated set of common second-level suffixes is used instead — near-zero dependency cost. Misses exotic suffixes (e.g. `k12.ma.us`).
- **Punycode/IDN decoding.** Requires a library; rare on a personal dashboard. IDN hosts render as their punycode (`xn--…`) form.
- Changing `customName` behavior. A user-set `customName` always wins, unchanged.

## API

```ts
// src/lib/siteName.ts
export function deriveSiteName(url: string | undefined, fallbackTitle?: string): string;
```

Returns a non-empty string; falls back to `'Link'` when nothing usable is available.

## Algorithm

1. **No URL** → `deriveFromTitle(fallbackTitle)` (step 6) or `'Link'`.
2. **Parse**: `new URL(url)`; on throw, retry `new URL('https://' + url)`; if still throwing → `deriveFromTitle(fallbackTitle)`.
3. **Empty hostname** (`data:`, `blob:`, `file:///path`) → `deriveFromTitle(fallbackTitle)`.
4. **IP literal** (IPv4 dotted-quad, or bracketed IPv6 like `[::1]`) → return the host verbatim.
5. **Single-label host** (no `.`: `localhost`, `myserver`, `chrome://settings` → host `settings`) → `capitalize(host)`.
6. **Registrable label** (the default case):
   - Lowercase host; strip a trailing dot; strip a leading `www` + optional digits + dot (`/^www\d*\./`).
   - Split into labels.
   - If `labels.length >= 3` and the second-to-last label is in `SECOND_LEVEL_SUFFIXES` → registrable label = `labels[length - 3]`.
   - Else if `labels.length >= 2` → registrable label = `labels[length - 2]`.
   - Else → `labels[0]`.
   - Return `capitalize(registrableLabel)`.

**`deriveFromTitle(title)`**: trim; if empty → `'Link'`; split on the first occurrence of any separator in `[' - ', ' – ', ' — ', ' | ', ' · ', ' :: ', ' • ']`; return the first segment trimmed (or `'Link'` if it ends up empty).

**`capitalize(s)`**: uppercase the first character, leave the rest unchanged (no hyphen splitting — avoids mangling brand labels like `x-files`). Returns `'Link'` if `s` is empty.

**`SECOND_LEVEL_SUFFIXES`** (curated, lowercase): `co, com, org, net, gov, edu, ac, mil, gob, gouv, nom, ne, or, go, sch, asn, id, info, biz`. Named constant; documented as a heuristic, not the full PSL.

## Scenario Matrix (input → returned name)

| Input (url / title) | Returned |
|---|---|
| `https://www.google.com` | `Google` |
| `https://drive.google.com` | `Google` |
| `https://support.apple.com` | `Apple` |
| `https://mail.proton.me` | `Proton` |
| `https://bbc.co.uk` | `Bbc` |
| `https://docs.example.co.uk` | `Example` |
| `https://a.b.c.co.uk` | `C` |
| `https://www2.example.com` | `Example` |
| `https://example.com.` (trailing dot) | `Example` |
| `https://user:pass@example.com:8443/p?q=1` | `Example` |
| `http://192.168.1.1:8080` | `192.168.1.1` |
| `http://[::1]:3000` | `[::1]` |
| `http://localhost:3000` | `Localhost` |
| `chrome://settings` | `Settings` |
| `file:///Users/x/a.pdf` (title `"a.pdf — Reader"`) | `a.pdf` |
| `data:text/plain,hi` (no title) | `Link` |
| `my-cool-site.com` (no scheme) | `My-cool-site` |
| url `undefined`, title `"GitHub · Build software"` | `GitHub` |
| url `undefined`, title `"Docs \| Example"` | `Docs` |
| url `undefined`, title empty | `Link` |
| `https://xn--bcher-kva.example` (IDN punycode) | `Xn--bcher-kva` (documented limitation) |

## Integration

- **`LinkCard.tsx`**: replace the local `getSiteName` with `const siteName = customName || deriveSiteName(url, title);`. Remove the inline function and its hardcoded subdomain list.
- **`AddLinkModal.tsx`**: replace the inline `urlObj.hostname.replace('www.', '')` title derivation with `deriveSiteName(finalUrl)`.
- **`GroupWidget.tsx`** (`handleAddLinkSubmit`): replace the inline hostname parsing with `deriveSiteName(url)`.
- **`PopupApp.tsx:119`**: replace `new URL(tabUrl).hostname.replace(/^www\./,'')` fallback with `deriveSiteName(tabUrl, tabInfo.title)`.
- **`AddWidgetModal.tsx:102-110`** (iframe title): replace the inline hostname parse with `deriveSiteName(embedUrl)` (keeping the `'Embed'` fallback when there is no URL — i.e. `deriveSiteName(embedUrl) ` already returns `'Link'`; pass `'Embed'` semantics by using `embedUrl ? deriveSiteName(embedUrl) : 'Embed'`).
- **Out of scope:** `GoogleSearchWidget.tsx` host display (lines 149, 440) shows the raw host for search suggestions/history, which is intentional — do **not** change it.

Existing links benefit immediately: `LinkCard` derives live from `url`, so no data migration is needed.

## Error Handling

`deriveSiteName` never throws — all `new URL` calls are guarded; every branch returns a non-empty string. No external input is trusted beyond `URL` parsing.

## Testing

`src/lib/__tests__/siteName.test.ts` — one assertion per matrix row plus:
- uppercase host normalization (`HTTPS://WWW.EXAMPLE.COM` → `Example`)
- `deriveFromTitle` each separator variant
- empty/whitespace-only title → `Link`
- 2-label vs 3-label vs multi-sub registrable resolution
- IPv4 and bracketed IPv6
- scheme-less input retry path

Target: every branch covered.

## Risks

- The heuristic suffix set can mis-resolve an exotic ccSLD (e.g. `foo.pvt.k12.ma.us` → "K12" instead of "Foo"). Acceptable for a personal dashboard; the user can rename. Documented, not fixed.
- IDN/punycode hosts produce an `xn--` name. Rare; documented.
