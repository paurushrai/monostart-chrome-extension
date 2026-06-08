# Big-Image Support: Downscale + IndexedDB

**Date:** 2026-06-09
**Status:** Approved design
**Scope:** Image widget uploads AND dashboard background ("wallpaper") uploads

## Problem

Today both the image widget (`ImageWidget.tsx`) and the dashboard background
(`ThemeSettingsModal.tsx`) cap uploads at **1.5MB** and store the image as a
**base64 `data:` URL inside the shared `dashboardLinks` / `dashboardSettings`
blob** in `chrome.storage.local`.

This is the wrong place for large images:

- Base64 inflates bytes ~33%.
- Every new-tab open JSON-parses the entire `dashboardLinks` blob via
  `getItems()`. A large embedded image is parsed on every tab open, delaying
  first paint of the dashboard.
- The image stays resident in React state for the whole session.
- Editing any unrelated widget re-serializes the whole blob, image included.

Users want to set a wallpaper-grade image (up to ~10MB source). We must support
that **without** degrading new-tab performance and **without** breaking any
existing image, remote URL, or background.

## Goals

- Accept source uploads up to **10MB**.
- Downscale on upload so stored bytes are small (~300–600KB typical).
- Keep heavy bytes **out of** `dashboardLinks` / `dashboardSettings` so
  new-tab init cost is unchanged.
- Fully backward compatible: existing base64 `data:` images and remote
  `http(s)` URLs render exactly as before, untouched.
- Graceful degradation: if the new path fails, fall back to today's behavior —
  never worse.

## Non-Goals

- Migrating existing base64 images to IndexedDB (they keep working as-is).
- Multi-device sync of images (extension uses `chrome.storage.local`, not
  `.sync`).
- Image editing/cropping beyond the existing `fit` modes.

## Architecture

### Opaque image reference scheme

`ImageItem.url` and `DashboardBackground.value` are strings that today hold
either a remote URL or a `data:` base64 string. We introduce a **third form**:

```
idb:<uuid>
```

Resolution rule everywhere a value is rendered:

- starts with `idb:` → resolve via IndexedDB to an object URL.
- otherwise (`data:`, `http:`, `https:`, blank) → use verbatim, exactly as today.

This is the keystone of backward compatibility: nothing that isn't `idb:`
changes behavior.

### Module 1 — `src/lib/downscaleImage.ts`

```
downscale(file: File): Promise<Blob>
```

- Pipeline: `createImageBitmap(file)` → draw onto a `<canvas>` (or
  `OffscreenCanvas` when available) sized so the **longest edge ≤ 2560px**
  (never upscale — if the image is already smaller, keep natural size) →
  `canvas.convertToBlob` / `toBlob` encoding **`image/webp`, quality 0.85**.
- Preserves aspect ratio. WebP preserves alpha for transparent PNG sources.
- Pure function of its `File` input. No storage, no DOM mutation beyond an
  in-memory canvas.
- Throws on decode failure; caller handles fallback.

**Constants** (named, no magic values):

```
const MAX_EDGE_PX = 2560;
const WEBP_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
```

### Module 2 — `src/lib/imageStore.ts`

Thin IndexedDB wrapper. One database, one object store `images` keyed by id.

```
putImage(blob: Blob): Promise<string>      // returns "idb:<uuid>"
getObjectUrl(ref: string): Promise<string> // ref = "idb:<uuid>" -> object URL
deleteImage(ref: string): Promise<void>
listKeys(): Promise<string[]>              // for orphan sweep ("idb:<uuid>"[])
```

- `getObjectUrl` **memoizes** one object URL per ref for the session, so
  repeated renders of the same image reuse a single URL.
- IDs generated with `crypto.randomUUID()`.
- All methods reject on IndexedDB errors; callers decide fallback.

### Module 3 — `useImageSrc(value: string)` hook

Lives with the widgets (e.g. `src/hooks/useImageSrc.ts`).

- If `value` starts with `idb:`: state machine `loading → resolved | error`,
  loads object URL via `getObjectUrl`. Returns `{ src, status }`.
- Otherwise: returns `{ src: value, status: 'resolved' }` synchronously.
- Revokes nothing itself (object URLs are memoized/owned by `imageStore` for
  the session); on `imageStore` eviction the URL is revoked there.

## Data Flow

### Upload (ImageWidget and ThemeSettingsModal share the same helper)

1. Validate `file.size <= MAX_UPLOAD_BYTES` (10MB) — else error message.
2. `blob = await downscale(file)`.
3. `ref = await putImage(blob)`.
4. If the field's previous value was an `idb:` ref, `await deleteImage(oldRef)`.
5. Set `url` / `value` = `ref`.

### Render

- `ImageWidget`: `const { src, status } = useImageSrc(url)`; show existing
  `ImageIcon` placeholder while `status === 'loading'`; render `<img src={src}>`
  when resolved; existing `onError` handling on failure.
- `DashboardBackground`: resolve `value` through the same hook (or an inline
  resolve) before assigning `backgroundImage`.

### Delete / replace cleanup

- Deleting an image widget whose `url` is `idb:` → `deleteImage(url)`.
- Changing background away from image, or replacing either field's image →
  delete the previous `idb:` ref.
- **Orphan sweep on load:** gather all `idb:` refs currently referenced by any
  widget (`getItems`) and the background (`getSettings`); call `listKeys()`;
  `deleteImage` any stored key not in the referenced set. Deletes **only**
  `idb:` blobs — can never touch `data:` images, widget data, or settings.

## Error Handling / Graceful Degradation

If `downscale` throws **or** `putImage` rejects (IndexedDB unavailable):

- Fall back to the **current** behavior: read the file as a base64 `data:` URL
  and store it in `url` / `value`, enforcing the **old 1.5MB cap** in that
  fallback path only.
- Surface the existing upload error UI if even the fallback fails.

Worst case equals today's behavior. The new path is strictly additive.

## Performance Rationale

- `dashboardLinks` / `dashboardSettings` carry only a ~40-char `idb:` string
  per image → `getItems` / `saveItems` payload and new-tab JSON-parse cost are
  unchanged. **This is the core performance guarantee.**
- Blob reads are lazy — only when an image widget/background mounts.
- Object URLs are references, not heap copies of the bytes.
- Downscale is a one-time upload cost, never paid on load.

## Files Touched

- `src/lib/downscaleImage.ts` — new.
- `src/lib/imageStore.ts` — new.
- `src/hooks/useImageSrc.ts` — new.
- `src/components/widgets/ImageWidget.tsx` — raise cap to 10MB, route upload
  through downscale + imageStore, resolve src via `useImageSrc`, delete blob on
  widget delete.
- `src/components/ThemeSettingsModal.tsx` — same upload routing for background;
  delete blob on replace / clear.
- `src/components/DashboardBackground.tsx` — resolve `idb:` value before
  assigning `backgroundImage`.
- App load path (wherever `getItems` runs on init) — invoke orphan sweep.

## Testing

- `downscale`: output is `image/webp`; longest edge ≤ 2560px; small source not
  upscaled; rejects on undecodable input.
- `imageStore`: `putImage` → `getObjectUrl` → `deleteImage` roundtrip;
  `listKeys` reflects stored refs; `getObjectUrl` memoizes one URL per ref.
- `useImageSrc`: passes `data:` / `http(s)` through unchanged and synchronously;
  resolves `idb:` to object URL; reports `error` status on load failure.
- Upload flow: replacing an `idb:` image deletes the old blob.
- Orphan sweep: removes only unreferenced `idb:` keys; never removes referenced
  keys or non-`idb:` values.
- Fallback: when `imageStore` is forced to reject, upload stores a base64
  `data:` URL under the 1.5MB cap.

## Open Risks

- **Orphan sweep** is the only logic touching data it didn't create. Mitigated
  by scoping deletes strictly to `idb:`-prefixed blobs absent from the live
  reference set.
- WebP encoding is supported in all Chromium versions this extension targets;
  no fallback format needed.
