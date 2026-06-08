# Big-Image Downscale + IndexedDB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload images up to 10MB to the image widget and dashboard background by downscaling on upload and storing the bytes in IndexedDB, keeping the new-tab load path untouched and all existing images working.

**Architecture:** Introduce an opaque `idb:<uuid>` reference form for `ImageItem.url` and `DashboardBackground.value`. Anything not prefixed `idb:` (legacy base64 `data:` URLs, remote URLs) renders exactly as today. Heavy bytes live in IndexedDB; only the short ref lives in `dashboardLinks`/`dashboardSettings`, so `getItems`/JSON-parse cost on new-tab init is unchanged. A pure reference module owns the data-safety logic; a thin IndexedDB wrapper owns storage; a resolver hook owns rendering. If downscale or IndexedDB fails, the code falls back to today's base64 path under the old 1.5MB cap — never worse.

**Tech Stack:** TypeScript, React 19, Vite, Vitest (node env), IndexedDB, Canvas/WebP, `fake-indexeddb` (new test dep).

**Spec:** `docs/superpowers/specs/2026-06-09-big-image-downscale-indexeddb-design.md`

---

## File Structure

**New files:**
- `src/lib/imageRef.ts` — pure helpers: `IDB_REF_PREFIX`, `isIdbRef`, `collectReferencedRefs`, `findOrphanRefs`. The data-safety-critical logic; fully unit-tested.
- `src/lib/__tests__/imageRef.test.ts` — tests for the above.
- `src/lib/imageStore.ts` — IndexedDB CRUD: `putImage`, `getObjectUrl`, `deleteImage`, `listRefs`, `sweepOrphanImages`. Object-URL memoization.
- `src/lib/__tests__/imageStore.test.ts` — tests using `fake-indexeddb`.
- `src/lib/downscaleImage.ts` — `downscaleImage` (canvas/WebP) + pure `fitWithinMaxEdge`.
- `src/lib/__tests__/downscaleImage.test.ts` — tests for the pure `fitWithinMaxEdge`.
- `src/lib/processImageUpload.ts` — orchestration: validate ≤10MB → downscale → store → ref, with base64 fallback.
- `src/lib/__tests__/processImageUpload.test.ts` — tests with mocked downscale + store.
- `src/hooks/useImageSrc.ts` — resolver hook (`idb:` → object URL; else passthrough).

**Modified files:**
- `src/components/widgets/ImageWidget.tsx` — 10MB cap, route upload through `processImageUpload`, render via `useImageSrc`, delete old blob on replace.
- `src/components/ThemeSettingsModal.tsx` — same upload routing for background; delete old blob on replace and when leaving image type.
- `src/components/DashboardBackground.tsx` — resolve `idb:` value before assigning `backgroundImage`.
- `src/hooks/useDashboard.ts` — delete blob when an image widget is deleted; run orphan sweep on load.

---

## Task 1: Pure image-reference helpers

**Files:**
- Create: `src/lib/imageRef.ts`
- Test: `src/lib/__tests__/imageRef.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/imageRef.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isIdbRef, collectReferencedRefs, findOrphanRefs, IDB_REF_PREFIX } from '../imageRef';
import type { WidgetItem, DashboardBackground } from '../../types';

const imageWidget = (id: string, url?: string): WidgetItem =>
  ({ id, type: 'image', title: 'x', url } as WidgetItem);

describe('isIdbRef', () => {
  it('returns true only for idb-prefixed strings', () => {
    expect(isIdbRef(`${IDB_REF_PREFIX}abc`)).toBe(true);
    expect(isIdbRef('data:image/png;base64,AAAA')).toBe(false);
    expect(isIdbRef('https://example.com/a.png')).toBe(false);
    expect(isIdbRef(undefined)).toBe(false);
    expect(isIdbRef('')).toBe(false);
  });
});

describe('collectReferencedRefs', () => {
  it('gathers idb refs from image widgets and an image background', () => {
    const items = [
      imageWidget('1', `${IDB_REF_PREFIX}a`),
      imageWidget('2', 'data:image/png;base64,ZZ'),
      imageWidget('3', undefined),
      { id: '4', type: 'note', title: 'n' } as WidgetItem,
    ];
    const background: DashboardBackground = { type: 'image', value: `${IDB_REF_PREFIX}b` };
    const refs = collectReferencedRefs(items, background);
    expect([...refs].sort()).toEqual([`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}b`]);
  });

  it('ignores non-image backgrounds and missing background', () => {
    const items = [imageWidget('1', `${IDB_REF_PREFIX}a`)];
    expect(collectReferencedRefs(items, { type: 'color', value: '#fff' })).toEqual(
      new Set([`${IDB_REF_PREFIX}a`]),
    );
    expect(collectReferencedRefs(items, undefined)).toEqual(new Set([`${IDB_REF_PREFIX}a`]));
  });
});

describe('findOrphanRefs', () => {
  it('returns stored idb refs not present in the referenced set', () => {
    const stored = [`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}b`, `${IDB_REF_PREFIX}c`];
    const referenced = new Set([`${IDB_REF_PREFIX}b`]);
    expect(findOrphanRefs(stored, referenced)).toEqual([`${IDB_REF_PREFIX}a`, `${IDB_REF_PREFIX}c`]);
  });

  it('never returns non-idb values', () => {
    const stored = ['data:image/png;base64,ZZ', `${IDB_REF_PREFIX}a`];
    expect(findOrphanRefs(stored, new Set())).toEqual([`${IDB_REF_PREFIX}a`]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- imageRef`
Expected: FAIL — cannot resolve `../imageRef`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/imageRef.ts`:

```ts
import type { WidgetItem, DashboardBackground } from '../types';

export const IDB_REF_PREFIX = 'idb:';

export const isIdbRef = (value: string | undefined): value is string =>
  typeof value === 'string' && value.startsWith(IDB_REF_PREFIX);

// Image widgets are always top-level (groups nest only LinkItems), so no
// recursion into groups is needed to find every referenced image.
export const collectReferencedRefs = (
  items: readonly WidgetItem[],
  background: DashboardBackground | undefined,
): Set<string> => {
  const refs = new Set<string>();
  for (const item of items) {
    if (item.type === 'image' && isIdbRef(item.url)) refs.add(item.url);
  }
  if (background?.type === 'image' && isIdbRef(background.value)) refs.add(background.value);
  return refs;
};

export const findOrphanRefs = (
  storedRefs: readonly string[],
  referenced: ReadonlySet<string>,
): string[] => storedRefs.filter((ref) => isIdbRef(ref) && !referenced.has(ref));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- imageRef`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/imageRef.ts src/lib/__tests__/imageRef.test.ts
git commit -m "feat(image): pure idb reference + orphan helpers"
```

---

## Task 2: IndexedDB image store

**Files:**
- Modify: `package.json` (add `fake-indexeddb` devDependency)
- Create: `src/lib/imageStore.ts`
- Test: `src/lib/__tests__/imageStore.test.ts`

- [ ] **Step 1: Add the test dependency**

Run: `npm install --save-dev fake-indexeddb`
Expected: `fake-indexeddb` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/imageStore.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { putImage, getObjectUrl, deleteImage, listRefs, sweepOrphanImages } from '../imageStore';
import { isIdbRef, IDB_REF_PREFIX } from '../imageRef';

let urlCounter = 0;
const revoked: string[] = [];

beforeEach(() => {
  urlCounter = 0;
  revoked.length = 0;
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:fake-${++urlCounter}`,
    revokeObjectURL: (url: string) => { revoked.push(url); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // fake-indexeddb persists across tests in a file; clear by deleting the db.
  indexedDB.deleteDatabase('monostart-images');
});

const blob = () => new Blob(['hello'], { type: 'image/webp' });

describe('imageStore', () => {
  it('putImage returns an idb ref and getObjectUrl resolves it', async () => {
    const ref = await putImage(blob());
    expect(isIdbRef(ref)).toBe(true);
    const url = await getObjectUrl(ref);
    expect(url).toMatch(/^blob:fake-/);
  });

  it('getObjectUrl memoizes one url per ref', async () => {
    const ref = await putImage(blob());
    const a = await getObjectUrl(ref);
    const b = await getObjectUrl(ref);
    expect(a).toBe(b);
    expect(urlCounter).toBe(1);
  });

  it('getObjectUrl rejects for a missing ref', async () => {
    await expect(getObjectUrl(`${IDB_REF_PREFIX}missing`)).rejects.toThrow();
  });

  it('deleteImage removes the blob and revokes its url', async () => {
    const ref = await putImage(blob());
    const url = await getObjectUrl(ref);
    await deleteImage(ref);
    expect(revoked).toContain(url);
    await expect(getObjectUrl(ref)).rejects.toThrow();
  });

  it('deleteImage ignores non-idb values', async () => {
    await expect(deleteImage('data:image/png;base64,ZZ')).resolves.toBeUndefined();
  });

  it('listRefs returns stored refs as idb-prefixed strings', async () => {
    const a = await putImage(blob());
    const b = await putImage(blob());
    const refs = await listRefs();
    expect(refs.sort()).toEqual([a, b].sort());
    expect(refs.every(isIdbRef)).toBe(true);
  });

  it('sweepOrphanImages deletes only unreferenced refs', async () => {
    const keep = await putImage(blob());
    const drop = await putImage(blob());
    const removed = await sweepOrphanImages(new Set([keep]));
    expect(removed).toBe(1);
    expect((await listRefs()).sort()).toEqual([keep]);
    await expect(getObjectUrl(drop)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- imageStore`
Expected: FAIL — cannot resolve `../imageStore`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/imageStore.ts`:

```ts
import { IDB_REF_PREFIX, isIdbRef, findOrphanRefs } from './imageRef';

const DB_NAME = 'monostart-images';
const DB_VERSION = 1;
const STORE = 'images';

const objectUrlCache = new Map<string, string>();

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });

const runTx = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = fn(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
};

const refToKey = (ref: string): string => ref.slice(IDB_REF_PREFIX.length);

export const putImage = async (data: Blob): Promise<string> => {
  const key = crypto.randomUUID();
  await runTx('readwrite', (store) => store.put(data, key));
  return `${IDB_REF_PREFIX}${key}`;
};

export const getObjectUrl = async (ref: string): Promise<string> => {
  const cached = objectUrlCache.get(ref);
  if (cached) return cached;
  const data = await runTx<Blob | undefined>('readonly', (store) => store.get(refToKey(ref)));
  if (!data) throw new Error(`Image not found: ${ref}`);
  const url = URL.createObjectURL(data);
  objectUrlCache.set(ref, url);
  return url;
};

export const deleteImage = async (ref: string): Promise<void> => {
  if (!isIdbRef(ref)) return;
  await runTx('readwrite', (store) => store.delete(refToKey(ref)));
  const url = objectUrlCache.get(ref);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(ref);
  }
};

export const listRefs = async (): Promise<string[]> => {
  const keys = await runTx<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
  return keys.map((key) => `${IDB_REF_PREFIX}${String(key)}`);
};

export const sweepOrphanImages = async (referenced: ReadonlySet<string>): Promise<number> => {
  const stored = await listRefs();
  const orphans = findOrphanRefs(stored, referenced);
  await Promise.all(orphans.map((ref) => deleteImage(ref)));
  return orphans.length;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- imageStore`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/imageStore.ts src/lib/__tests__/imageStore.test.ts
git commit -m "feat(image): IndexedDB blob store with orphan sweep"
```

---

## Task 3: Canvas downscale pipeline

**Files:**
- Create: `src/lib/downscaleImage.ts`
- Test: `src/lib/__tests__/downscaleImage.test.ts`

The canvas/`createImageBitmap` path requires a browser and is verified manually
in Task 9. The dimension math is pure and unit-tested here.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/downscaleImage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fitWithinMaxEdge, MAX_EDGE_PX } from '../downscaleImage';

describe('fitWithinMaxEdge', () => {
  it('leaves images at or under the max edge unchanged (no upscaling)', () => {
    expect(fitWithinMaxEdge({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
    expect(fitWithinMaxEdge({ width: MAX_EDGE_PX, height: 1000 })).toEqual({
      width: MAX_EDGE_PX,
      height: 1000,
    });
  });

  it('scales landscape images so the longest edge equals the max', () => {
    const result = fitWithinMaxEdge({ width: 5120, height: 2560 });
    expect(result.width).toBe(MAX_EDGE_PX);
    expect(result.height).toBe(MAX_EDGE_PX / 2);
  });

  it('scales portrait images so the longest edge equals the max', () => {
    const result = fitWithinMaxEdge({ width: 1280, height: 5120 });
    expect(result.height).toBe(MAX_EDGE_PX);
    expect(result.width).toBe(MAX_EDGE_PX / 4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- downscaleImage`
Expected: FAIL — cannot resolve `../downscaleImage`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/downscaleImage.ts`:

```ts
export const MAX_EDGE_PX = 2560;
const WEBP_QUALITY = 0.85;

export interface Dimensions {
  width: number;
  height: number;
}

// Scale so the longest edge is at most MAX_EDGE_PX; never upscale.
export const fitWithinMaxEdge = ({ width, height }: Dimensions): Dimensions => {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE_PX) return { width, height };
  const scale = MAX_EDGE_PX / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

export const downscaleImage = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithinMaxEdge({ width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (out) => (out ? resolve(out) : reject(new Error('Canvas toBlob returned null'))),
        'image/webp',
        WEBP_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- downscaleImage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/downscaleImage.ts src/lib/__tests__/downscaleImage.test.ts
git commit -m "feat(image): canvas downscale to WebP pipeline"
```

---

## Task 4: Upload orchestration with fallback

**Files:**
- Create: `src/lib/processImageUpload.ts`
- Test: `src/lib/__tests__/processImageUpload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/processImageUpload.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../downscaleImage', () => ({
  downscaleImage: vi.fn(),
}));
vi.mock('../imageStore', () => ({
  putImage: vi.fn(),
}));

import { processImageUpload, MAX_UPLOAD_BYTES } from '../processImageUpload';
import { downscaleImage } from '../downscaleImage';
import { putImage } from '../imageStore';

const fileOfSize = (bytes: number): File => {
  const file = new File(['x'], 'photo.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

afterEach(() => vi.clearAllMocks());

describe('processImageUpload', () => {
  it('rejects files larger than 10MB', async () => {
    await expect(processImageUpload(fileOfSize(MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/10MB/);
  });

  it('downscales and stores, returning an idb ref value', async () => {
    vi.mocked(downscaleImage).mockResolvedValue(new Blob(['z'], { type: 'image/webp' }));
    vi.mocked(putImage).mockResolvedValue('idb:generated');
    const result = await processImageUpload(fileOfSize(5 * 1024 * 1024));
    expect(result.value).toBe('idb:generated');
    expect(downscaleImage).toHaveBeenCalledOnce();
  });

  it('throws the 1.5MB error when downscale fails and the file is too big to inline', async () => {
    vi.mocked(downscaleImage).mockRejectedValue(new Error('no canvas'));
    await expect(processImageUpload(fileOfSize(3 * 1024 * 1024))).rejects.toThrow(/1.5MB/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- processImageUpload`
Expected: FAIL — cannot resolve `../processImageUpload`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/processImageUpload.ts`:

```ts
import { downscaleImage } from './downscaleImage';
import { putImage } from './imageStore';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FALLBACK_MAX_BYTES = 1.5 * 1024 * 1024;

export interface UploadResult {
  // Value to persist in ImageItem.url / DashboardBackground.value:
  // an `idb:` ref on the happy path, or a base64 data URL on fallback.
  value: string;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });

// Validate, downscale, and store an upload. Falls back to a base64 data URL
// (capped at 1.5MB) when downscale or IndexedDB is unavailable, so behavior is
// never worse than the legacy path.
export const processImageUpload = async (file: File): Promise<UploadResult> => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be smaller than 10MB.');
  }
  try {
    const blob = await downscaleImage(file);
    return { value: await putImage(blob) };
  } catch {
    if (file.size > FALLBACK_MAX_BYTES) {
      throw new Error('Image must be smaller than 1.5MB.');
    }
    return { value: await readAsDataUrl(file) };
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- processImageUpload`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/processImageUpload.ts src/lib/__tests__/processImageUpload.test.ts
git commit -m "feat(image): upload orchestration with base64 fallback"
```

---

## Task 5: Image source resolver hook

**Files:**
- Create: `src/hooks/useImageSrc.ts`

This hook wraps browser APIs (object URLs) and is verified manually in Task 9;
no unit test is added (the project has no DOM/React test harness).

- [ ] **Step 1: Write the implementation**

Create `src/hooks/useImageSrc.ts`:

```ts
import { useState, useEffect } from 'react';
import { isIdbRef } from '../lib/imageRef';
import { getObjectUrl } from '../lib/imageStore';

export type ImageSrcStatus = 'resolved' | 'loading' | 'error';

export interface ImageSrcState {
  src: string;
  status: ImageSrcStatus;
}

// Resolve a stored image value to a usable src. `idb:` refs load from
// IndexedDB; every other value (data:, http(s):, blank) passes through
// synchronously, preserving today's behavior.
export const useImageSrc = (value: string | undefined): ImageSrcState => {
  const [state, setState] = useState<ImageSrcState>(() =>
    isIdbRef(value)
      ? { src: '', status: 'loading' }
      : { src: value ?? '', status: 'resolved' },
  );

  useEffect(() => {
    if (!isIdbRef(value)) {
      setState({ src: value ?? '', status: 'resolved' });
      return;
    }
    let cancelled = false;
    setState({ src: '', status: 'loading' });
    getObjectUrl(value)
      .then((url) => {
        if (!cancelled) setState({ src: url, status: 'resolved' });
      })
      .catch(() => {
        if (!cancelled) setState({ src: '', status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return state;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useImageSrc.ts
git commit -m "feat(image): useImageSrc resolver hook"
```

---

## Task 6: Wire the image widget

**Files:**
- Modify: `src/components/widgets/ImageWidget.tsx`

- [ ] **Step 1: Add imports**

In `src/components/widgets/ImageWidget.tsx`, after the existing
`import type { ImageItem } from '../../types';` line (line 12), add:

```tsx
import { processImageUpload } from '../../lib/processImageUpload';
import { deleteImage } from '../../lib/imageStore';
import { isIdbRef } from '../../lib/imageRef';
import { useImageSrc } from '../../hooks/useImageSrc';
```

- [ ] **Step 2: Resolve the rendered src via the hook**

In the component body, just after the destructure
`const { title = 'Image', url = '', fit = 'cover' } = item;` (line 22), add:

```tsx
  const { src: resolvedSrc, status: imageStatus } = useImageSrc(url);
```

- [ ] **Step 3: Replace the upload handler with the 10MB downscale path**

Replace the entire `handleFileUpload` function (lines 54-76) with:

```tsx
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    try {
      const previous = item.url;
      const { value } = await processImageUpload(file);
      if (isIdbRef(previous) && previous !== value) {
        deleteImage(previous).catch(() => { /* best-effort cleanup */ });
      }
      onUpdateItem(item.id, { url: value });
      setShowConfig(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to read file.");
    }
  };
```

- [ ] **Step 4: Render the resolved src with a loading placeholder**

Replace the `) : url ? (` rendering branch (lines 244-255) — the block that
renders `<img src={url} ... />` — with:

```tsx
        ) : url && imageStatus !== 'error' ? (
          <div className="w-full h-full relative select-none">
            {imageStatus === 'loading' ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/25">
                <ImageIcon size={32} aria-hidden="true" />
              </div>
            ) : (
              <img
                src={resolvedSrc}
                alt={title}
                className={`w-full h-full pointer-events-none select-none rounded-b-xl ${fitClass}`}
                onError={() => {
                  setUploadError("Image failed to load. The URL might be broken or blocked.");
                  setShowConfig(true);
                }}
              />
            )}
          </div>
```

(The existing `) : (` empty-state branch that follows it is unchanged; an
`idb:` load failure now sets `imageStatus === 'error'` and falls through to it.)

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/widgets/ImageWidget.tsx
git commit -m "feat(image): route widget uploads through downscale + idb"
```

---

## Task 7: Wire the dashboard background

**Files:**
- Modify: `src/components/ThemeSettingsModal.tsx`
- Modify: `src/components/DashboardBackground.tsx`

- [ ] **Step 1: Add imports to ThemeSettingsModal**

In `src/components/ThemeSettingsModal.tsx`, after
`import { CHROME_THEMES } from '../lib/chromeThemes';` (line 8), add:

```tsx
import { processImageUpload } from '../lib/processImageUpload';
import { deleteImage } from '../lib/imageStore';
import { isIdbRef } from '../lib/imageRef';
```

- [ ] **Step 2: Delete the old blob when leaving image type**

Replace the `chooseType` function (lines 62-68) with a version that releases an
`idb:` background when switching away from or replacing the image type:

```tsx
  const chooseType = (t: DashboardBackground['type']) => {
    setBgError('');
    if (t !== 'image' && bg.type === 'image' && isIdbRef(bg.value)) {
      deleteImage(bg.value).catch(() => { /* best-effort cleanup */ });
    }
    if (t === 'color') setBg({ type: 'color', value: bg.type === 'color' && bg.value ? bg.value : bgColors[0] });
    else if (t === 'gradient') setBg({ type: 'gradient', value: bg.type === 'gradient' && bg.value ? bg.value : bgGradients[0]!.value });
    else if (t === 'image') setBg({ type: 'image', value: bg.type === 'image' ? bg.value : '' });
    else setBg({ type: 'none' });
  };
```

- [ ] **Step 3: Replace the background upload handler**

Replace the entire `handleBgUpload` function (lines 70-84) with:

```tsx
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError('');
    try {
      const previous = bg.type === 'image' ? bg.value : undefined;
      const { value } = await processImageUpload(file);
      if (isIdbRef(previous) && previous !== value) {
        deleteImage(previous).catch(() => { /* best-effort cleanup */ });
      }
      setBg({ type: 'image', value });
    } catch (err) {
      setBgError(err instanceof Error ? err.message : 'Failed to read file.');
    }
  };
```

- [ ] **Step 4: Update the "uploaded" hint to recognize idb refs**

In the image-type block, replace the hint condition (line 289)
`{bg.value?.startsWith('data:') && (` with:

```tsx
                {(bg.value?.startsWith('data:') || isIdbRef(bg.value)) && (
```

And the URL `Input`'s `value` prop (line 277)
`value={bg.value && !bg.value.startsWith('data:') ? bg.value : ''}` with:

```tsx
                  value={bg.value && !bg.value.startsWith('data:') && !isIdbRef(bg.value) ? bg.value : ''}
```

- [ ] **Step 5: Resolve idb refs in DashboardBackground**

In `src/components/DashboardBackground.tsx`, add after the existing import lines
(after line 2):

```tsx
import { useImageSrc } from '../hooks/useImageSrc';
```

React hooks must run unconditionally, so the hook must come **before** the
existing early-return guard on line 9. Replace the function from its opening
line through the `if (type === 'image') { ... }` block (lines 8-23) with:

```tsx
export default function DashboardBackground({ background }: Readonly<Props>) {
  // Hook must run before any early return — keep it at the top.
  const isImage = background?.type === 'image';
  const { src: imageSrc } = useImageSrc(isImage ? background?.value : undefined);

  if (!background || background.type === 'none' || !background.value) return null;

  const { type, value, blur = 0, dim = 0 } = background;
  const layer: CSSProperties = {};

  if (type === 'color') {
    layer.backgroundColor = value;
  } else if (type === 'gradient') {
    layer.backgroundImage = value;
  } else if (type === 'image' && imageSrc) {
    layer.backgroundImage = `url("${imageSrc}")`;
    layer.backgroundSize = 'cover';
    layer.backgroundPosition = 'center';
    layer.backgroundRepeat = 'no-repeat';
  }
```

The rest of the function (the `if (blur > 0)` block and the returned JSX) is
unchanged.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors (no react-hooks/rules-of-hooks violation, since the hook
now precedes the guard).

- [ ] **Step 7: Commit**

```bash
git add src/components/ThemeSettingsModal.tsx src/components/DashboardBackground.tsx
git commit -m "feat(image): route background uploads through downscale + idb"
```

---

## Task 8: Blob cleanup on delete and orphan sweep on load

**Files:**
- Modify: `src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports**

In `src/hooks/useDashboard.ts`, after
`import { cleanupOrphanedWidgetData, removeWidgetDataForId } from '../lib/widgetDataCleanup';`
(line 8), add:

```tsx
import { getSettings } from '../lib/storage';
import { deleteImage, sweepOrphanImages } from '../lib/imageStore';
import { collectReferencedRefs, isIdbRef } from '../lib/imageRef';
```

(Note: `getItems`, `getItemsSync`, `saveItems` are already imported from
`'../lib/storage'` on line 3 — add `getSettings` to that existing import
instead of a duplicate line if your linter prefers it.)

- [ ] **Step 2: Run the orphan sweep on load**

In the load `useEffect`, inside the `getItems().then((stored) => { ... })`
callback, after the existing
`cleanupOrphanedWidgetData(liveIds).catch(() => { /* empty */ });` line (line 86),
add:

```tsx
      getSettings().then((settings) => {
        sweepOrphanImages(collectReferencedRefs(migrated, settings.background)).catch(() => { /* empty */ });
      }).catch(() => { /* empty */ });
```

- [ ] **Step 3: Delete the blob when an image widget is deleted**

In the `handleDelete` callback, inside `setLinks((prev) => { ... })`
(starting line 158), add a lookup before computing `next`. Replace:

```tsx
    setLinks((prev) => {
      const next = deleteNested(prev);
      saveItems(next);
      removeWidgetDataForId(id);
      return next;
    });
```

with:

```tsx
    setLinks((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.type === 'image' && isIdbRef(removed.url)) {
        deleteImage(removed.url).catch(() => { /* best-effort cleanup */ });
      }
      const next = deleteNested(prev);
      saveItems(next);
      removeWidgetDataForId(id);
      return next;
    });
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests PASS (existing + the new imageRef/imageStore/downscaleImage/processImageUpload suites).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useDashboard.ts
git commit -m "feat(image): delete blobs on widget delete and sweep orphans on load"
```

---

## Task 9: Full verification (build + manual)

**Files:** none (verification only)

- [ ] **Step 1: Quality gates**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: all pass, build produces `dist/` with no errors.

- [ ] **Step 2: Load the unpacked extension**

Build is in `dist/`. In Chrome: `chrome://extensions` → enable Developer mode →
Load unpacked → select `dist/`. Open a new tab.

- [ ] **Step 3: Manually verify the image widget (the browser-only paths)**

Confirm each:
- Add an image widget, upload a **large photo (5–10MB)** → it saves and renders.
- DevTools → Application → IndexedDB → `monostart-images` → `images` shows one
  blob; the widget's stored `dashboardLinks` entry holds a short `idb:` string,
  **not** a base64 blob.
- Reload the tab → image still renders (resolved from IndexedDB).
- Replace the image → old blob is gone from IndexedDB, new one present.
- Try a **>10MB** file → error "Image must be smaller than 10MB."
- Delete the widget → its blob disappears from IndexedDB.
- A previously-saved **legacy base64** image (set one before this build, or paste
  a `data:` URL) still renders unchanged.
- A **remote URL** image still renders unchanged.

- [ ] **Step 4: Manually verify the background**

- Theme settings → Background → Image → upload a large photo → renders as
  wallpaper; stored `dashboardSettings.background.value` is an `idb:` ref.
- Reload → wallpaper persists.
- Switch background to Color/None → the image blob is released from IndexedDB.

- [ ] **Step 5: Confirm the performance guarantee**

In DevTools → Application → Storage, inspect `chrome.storage.local`
(`dashboardLinks` / `dashboardSettings`): values for image widgets/background are
short `idb:` strings. The large bytes live only in IndexedDB. This is the
evidence that new-tab JSON-parse cost is unchanged.

- [ ] **Step 6: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "fix(image): verification fixups"
```

(Skip if nothing changed.)

---

## Notes for the implementer

- **DRY:** the `idb:` prefix and predicate live only in `imageRef.ts`; never
  re-derive `value.startsWith('idb:')` inline elsewhere — import `isIdbRef`.
- **No floating promises:** all fire-and-forget cleanup calls use `.catch(() => {})`.
- **Data safety:** deletes only ever target `idb:`-prefixed keys
  (`deleteImage` guards with `isIdbRef`; `findOrphanRefs` filters with `isIdbRef`).
  Legacy `data:` images and widget data can never be touched.
- **Graceful degradation:** if IndexedDB/canvas is unavailable, uploads fall back
  to base64 under the old 1.5MB cap — behavior is never worse than today.
