# TypeScript Migration Plan

**Status:** Not started
**Owner:** —
**Last updated:** 2026-05-22

A phased, low-risk migration from JS/JSX to TS/TSX. Each phase is independently
shippable: the codebase compiles, all tests pass, and the extension works at the
end of every phase. You can pause indefinitely between phases.

---

## 1. Goals & non-goals

### Goals

- Catch the class of bugs we hit during the audit (typos, missing enum members,
  undefined refs, wrong method names) at compile time, not runtime.
- Make the data model explicit — every widget's shape encoded in a
  discriminated union, every storage call typed, every hook returning a typed
  interface.
- Maintain behavior parity throughout. The extension behaves identically on
  every commit during the migration.

### Non-goals

- **No refactor during migration.** Mechanical conversion only. Refactor first,
  TS second, never both at once.
- **No prop-types removal until Phase 5.** Keep the `/* eslint-disable
  react/prop-types */` comments in place until full migration completes — even
  though they become redundant — to keep file diffs minimal per phase.
- **No `strict: true` from day one.** We ratchet strictness up in Phase 5 once
  every file is `.ts`/`.tsx`. Starting strict means 200+ errors and unfocused
  fixes.

---

## 2. Phase overview

| # | Phase | Files touched | Duration (estimate / realistic) | Risk |
|---|-------|---------------|----------|------|
| 0 | Foundation (config + skeleton) | tsconfig + types.ts + npm scripts | 30 min / 30 min | Low — config only |
| 1 | `lib/` (pure layer, tested) | 7 source + 2 test files | 1 hr / 1 hr | Low — tests catch regressions |
| 2 | `hooks/` | 8 hook files | 1.5 hr / 2 hr | Medium — RGL type fights, hook return shapes leak everywhere |
| 3 | Leaf components | ~15 files (ui/*, leaf widgets, modals) | 2 hr / 3 hr | Low-Medium — many small files, isolated |
| 4 | Container components | ~8 files (DashboardGrid, SectionWidget, AppHeader, App, main, popup) | 1.5 hr / 2.5 hr | **Highest** — top of the tree, RGL types compound |
| 5 | Strictness ratchet + cleanup | tsconfig, eslint, jsconfig | 30 min / 30 min | Low — kills any-escapes |

**Total: 7 hr estimate / 9–10 hr realistic.** Component phases (3 + 4) most
likely to overrun. Plan around the realistic number; the estimate is a
best-case ceiling.

---

## 3. The data model — design first

Before any file conversion in Phase 1, we lock in the discriminated union for
`LinkItem`. Every read-site downstream will narrow on `item.type`.

```ts
// src/types.ts

export type WidgetType =
  | 'link' | 'section' | 'google-search' | 'iframe'
  | 'todo' | 'timer' | 'note' | 'image' | 'label';

interface BaseItem {
  id: string;
  i?: string;            // RGL legacy duplicate of id
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  // Header-link bits — only meaningful when isHeaderLink === true
  isHeaderLink?: boolean;
  parentId?: string | null;
  order?: number;
  // Layout hint, conceptually only meaningful for RegularLink but hoisted here
  // so layout/placement code can read `item.viewMode` off any LinkItem without
  // narrowing. 'card' is used by the synthetic drag-placeholder only.
  viewMode?: 'icon' | 'icon+text' | 'card';
}

export interface RegularLink extends BaseItem {
  type: 'link';
  url: string;
  title: string;
  favicon?: string;
  customName?: string;
  theme?: string;
  // viewMode is on BaseItem (see above) so layout code reads off any LinkItem.
}

export interface Section extends BaseItem {
  type: 'section';
  title: string;
  borderColor: string;
  cols?: number;
  links: RegularLink[];     // sections only contain links, not nested sections
}

export interface Iframe extends BaseItem {
  type: 'iframe';
  title: string;
  url?: string;
  mode?: 'embed' | 'url';
  embedHtml?: string;
}

// Renamed from `Todo` / `Timer` to avoid collision with the per-widget
// entry shapes (TodoEntry / TimerEntry) defined below.
export interface TodoWidget extends BaseItem {
  type: 'todo';
  title: string;
}

export interface TimerWidget extends BaseItem {
  type: 'timer';
  title: string;
}

export interface Note extends BaseItem {
  type: 'note';
  title: string;
  content?: string;
  noteColor?: string;
}

export interface ImageWidget extends BaseItem {
  type: 'image';
  title: string;
  url?: string;
  fit?: 'cover' | 'contain';
}

export interface Label extends BaseItem {
  type: 'label';
  text: string;
  align?: 'left' | 'center' | 'right';
  size?: string;            // tailwind text-* class
  fontWeight?: string;
  opacity?: string;
  cardStyle?: boolean;      // toggled by LabelWidget for card-vs-bare rendering
}

export interface GoogleSearch extends BaseItem {
  type: 'google-search';
  title: string;
}

export type LinkItem =
  | RegularLink | Section | Iframe | TodoWidget | TimerWidget
  | Note | ImageWidget | Label | GoogleSearch;

/**
 * Synthetic placeholder items pushed onto displayLinks during a drag.
 * They are NEVER persisted — `LinkItem[]` callers won't see them.
 * Only DashboardGrid and SectionInnerGrid emit and render these.
 *
 * The id is the discriminator. Renderers MUST check the id BEFORE switching
 * on `item.type`, since a placeholder has `type: 'link'` to satisfy RGL but
 * none of RegularLink's other fields.
 */
export interface DragPlaceholder {
  id: 'drag-out-placeholder' | 'drag-placeholder';
  type: 'link';
  title: string;
  url: '';
  x: number;
  y: number;
  w: number;
  h: number;
  viewMode?: 'icon' | 'card';
}

/** Union of "anything that might appear in displayLinks during render". */
export type DisplayItem = LinkItem | DragPlaceholder;

// ---- Per-widget data (stored separately in chrome.storage) -----------------
// These are NOT part of LinkItem. They're keyed by widget instance:
//   chrome.storage.local key `todo-widget-${item.id}`  → TodoEntry[]
//   chrome.storage.local key `timer-widget-${item.id}` → TimerEntry[]
// Accessed via the `useWidgetStorage<T>(key, default)` hook.

export interface TodoEntry {
  id: number;               // Date.now()
  text: string;
  completed: boolean;
}

export interface TimerEntry {
  id: number;               // Date.now()
  label: string;
  durationMs: number;
  remainingMs: number;
  isRunning: boolean;
  endTime: number | null;   // Date.now() + remainingMs when running, else null
}
```

### Type narrowing pattern

Anywhere we read type-specific fields:

```ts
function isSection(item: LinkItem): item is Section {
  return item.type === 'section';
}

// Usage:
if (isSection(item)) {
  item.links.length;        // typed
  item.borderColor;         // typed
}
```

For the few places that iterate over all items generically (layout building,
grid persistence), only `BaseItem` fields are accessed — that already works
without narrowing.

### Other shared types

```ts
export interface Settings {
  openInNewTab: boolean;
  themeMode?: 'light' | 'dark' | 'device';
  themeColor?: string;       // HSL triple as a single string: "200 73% 52%"
}

export interface RglLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  isResizable?: boolean;
}

export interface DragCoords { x: number; y: number; }
export interface GridSlot   { x: number; y: number; }

export interface WidgetMeta {
  type: WidgetType;
  addable: boolean;
  name?: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  defaults?: Partial<LinkItem>;
  layout: {
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    resizable: boolean;
    placementMin?: { minW?: number; minH?: number };
  };
}
```

---

## 4. Phase 0 — Foundation (config + skeleton)

**Goal:** repo accepts TS files alongside JS, no behavior change, no file renames.

### Tasks

1. **Install deps.** `npm install --save-dev typescript @types/chrome @types/node`.
   - `@types/node` required because `vite.config.ts` uses `path` and
     `import.meta.dirname` (Node-typed globals).
   - **Verify** `@types/react` and `@types/react-dom` are `^19.x` to match the
     installed React 19. If they're still 18, `npm install --save-dev
     @types/react@^19 @types/react-dom@^19`. (React 19's ref types are
     incompatible with @types/react 18 — see Phase 2 notes.)
   - `react-grid-layout` ships its own types; nothing extra needed.
2. **Create `tsconfig.json`** at repo root with lenient settings to start:

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "jsx": "react-jsx",
       "allowJs": true,
       "checkJs": false,
       "noEmit": true,
       "isolatedModules": true,
       "verbatimModuleSyntax": true,
       "esModuleInterop": true,
       "resolveJsonModule": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "strict": false,
       "noImplicitAny": false,
       "strictNullChecks": false,
       "paths": { "@/*": ["./src/*"] }
     },
     "include": ["src", "vite.config.ts"],
     "exclude": ["node_modules", "dist"]
   }
   ```

   **Notes on flag choices:**
   - `verbatimModuleSyntax: true` (TS 5.x) — forces explicit `import type` for
     type-only imports. Catches accidental runtime imports of types Vite/esbuild
     would otherwise silently strip.
   - `isolatedModules: true` is kept alongside `verbatimModuleSyntax` for
     defense in depth; safer for tooling that hasn't picked up the newer flag.
   - **No `baseUrl`.** Deprecated in TS 6 (will error). `paths` works without
     it — TS resolves paths relative to the tsconfig file location automatically.
   - `include` references `vite.config.ts` (not `.js`) since step 6 renames it.

3. **Add `src/types.ts`** with the data model from §3 above. Pure type-only
   file. Nothing imports it yet.

4. **Add `src/vite-env.d.ts`** with one line:

   ```ts
   /// <reference types="vite/client" />
   ```

   Without this, TS doesn't know about `import.meta.env`, the `?url` /
   `?worker` query suffixes, CSS module imports, or any other Vite-specific
   types. Required for the existing CSS imports in DashboardGrid.

5. **Verify environment** (5-min reconnaissance — log results in §11):

   ```bash
   # Confirm eslint config style — flat vs legacy
   ls eslint.config.* .eslintrc.* 2>/dev/null

   # Check react-grid-layout shipped types match what we use
   ls node_modules/react-grid-layout/lib/*.d.ts 2>/dev/null \
     && head -50 node_modules/react-grid-layout/lib/index.d.ts

   # Verify @types/react version
   grep '"@types/react"' node_modules/@types/react/package.json
   ```

   If eslint config is **legacy**, Phase 5 typescript-eslint wiring uses
   `.eslintrc.cjs` syntax instead of flat config (doc currently assumes flat).
   If RGL types are broken/incomplete, add a Phase 2 task to create
   `src/types/react-grid-layout-legacy.d.ts` with a `declare module` override.

6. **Convert `vite.config.js` → `vite.config.ts`.** Trivial — Vite supports
   both. Modern convention is `.ts`. This also gets type-checked alongside
   the rest of the codebase. Update `include` in tsconfig to match.

7. **Add npm scripts** to `package.json`:

   ```json
   "typecheck": "tsc --noEmit"
   ```

8. **Verify** `npm run build && npm run typecheck && npm test` all pass before
   continuing.

### Why lenient

Starting with `strict: false` means we can rename files to `.ts`/`.tsx`
mechanically without fighting implicit-any errors. We tighten in Phase 5.

### Exit criteria

- ☐ tsconfig.json committed
- ☐ src/types.ts exists with the discriminated union + DragPlaceholder from §3
- ☐ src/vite-env.d.ts exists
- ☐ vite.config.js → vite.config.ts
- ☐ Reconnaissance findings logged in §11 (eslint style, RGL types, @types/react version)
- ☐ `npm run typecheck` exits zero
- ☐ `npm run build` produces the same dist as before
- ☐ `npm test` still 39/39 passing
- ☐ Extension reload, smoke test passes

---

## 5. Phase 1 — `lib/` (pure layer)

**Goal:** convert the pure-function library to TS. Tests verify behavior parity.

### Phase 1 pre-scan findings (recorded 2026-05-22)

Discovered during re-scan before execution:

1. **`WidgetType` collision.** `src/types.ts` (created in Phase 0) and
   `src/lib/widgetCatalog.js` both define a `WidgetType` const object.
   6 files currently import `WidgetType` from `widgetCatalog`. Resolution:
   **delete `WidgetType` from `src/types.ts`**. `widgetCatalog` keeps being
   the single source. No import-site changes needed elsewhere.

2. **`WidgetMeta` interface** missing from `types.ts`. Decision: define it
   inline in `widgetCatalog.ts` (only consumer is the catalog itself).
   Exported only so external readers can reference the meta shape if useful.

3. **`getStoredValue` / `setStoredValue` need generics.** Today they accept
   `(key, defaultValue)` and return `Promise<any>`. With generics
   `<T>(key: string, defaultValue: T): Promise<T>`, the new
   `useWidgetStorage<T>` hook in Phase 2 flows types through naturally.

4. **`saveLink` input is partial.** Callers pass `{ type, url, title, ... }`
   not a full `LinkItem`. Signature:
   `(newLink: Partial<LinkItem> & { type: WidgetType }, sectionId?: string)
   => Promise<LinkItem | null>`. Constructor-like — fills in missing fields
   internally, returns the fully-formed result (or null on no-room).

5. **`getMinSize(type)` must accept `string | undefined`.** Caller
   `linkRepository.saveLink` passes `newLink.type` which is `string | undefined`.
   The catalog already handles unknown types (falls back to 1×1) — just
   make the signature explicit.

6. **`viewMode` accessed on generic `LinkItem`.** `linkPlacement.js` has
   `link.viewMode === 'icon' ? 1 : 3` — but `viewMode` was originally only
   on `RegularLink`. Resolution: **lift `viewMode` to `BaseItem`** (already
   applied to `src/types.ts`). It's a layout hint, harmless on other widget
   types, and saves ~6 narrowings in linkPlacement + grid + DashboardGrid
   layout code.

### Post-execution discoveries (logged 2026-05-22)

After actually running Phase 1, the only material discoveries were:

1. **`@types/chrome` requires explicit registration in tsconfig.** Auto-include
   via typeRoots default did NOT find it. Added
   `"types": ["node", "chrome", "vite/client"]` to compilerOptions. This is
   a one-time fix that benefits all subsequent phases.

2. **Test fixtures needed full-shape builders.** The original `linkAt(id, x, y)`
   helper returned `{ id, type:'link', x, y, w, h }` — missing `url` and `title`.
   With proper types, we replaced inline `{ id, type:'section', ... }` literals
   with typed `section(id, links, cols)` helper functions. Net effect: tests
   are more readable and catch typos at compile time.

3. **Section narrowing in tests.** Reading `section.links` requires
   `(item as Section).links` since `LinkItem[]` doesn't guarantee Section. Used
   single-site casts (`result[0] as Section`) — explicit and grep-able.

4. **`saveLink` constructor pattern uses `as unknown as LinkItem` at return.**
   The function builds up a Partial during construction. Documented in-file
   as the trust boundary for the constructor-like signature.

### chrome.storage type narrowing pattern

`chrome.storage.local.get` callback receives `{ [key: string]: unknown }`.
Reading `result[KEY]` returns `unknown`. Trust-at-boundary cast:

```ts
chrome.storage.local.get([LINKS_KEY], (result) => {
  resolve((result[LINKS_KEY] as LinkItem[] | undefined) ?? []);
});
```

Comment explicitly that this is the documented trust decision (§5
storage-boundary validation), not a missed type narrowing.

### Files to convert

| File | Notes |
|------|-------|
| `lib/storage.js` → `.ts` | Adapter. Touch `chrome.storage` types via `@types/chrome` |
| `lib/grid.js` → `.ts` | Pure math. Add return types `GridSlot \| null` |
| `lib/linkPlacement.js` → `.ts` | Operates on `LinkItem[]` |
| `lib/linkRepository.js` → `.ts` | Composes storage + grid |
| `lib/widgetCatalog.js` → `.ts` | Exports `WidgetType` enum + `WidgetMeta[]`; ensure `as const` |
| `lib/embedSanitizer.js` → `.ts` | Simple — `(html: string) => string` |
| `lib/utils.js` → `.ts` | shadcn `cn()` helper |
| `lib/__tests__/grid.test.js` → `.test.ts` | Add types to test scaffolding |
| `lib/__tests__/linkPlacement.test.js` → `.test.ts` | Same |

### Key conversion patterns

**Chrome storage callbacks:**

```ts
// Before
chrome.storage.local.get([LINKS_KEY], (result) => {
  resolve(result[LINKS_KEY] || []);
});

// After
chrome.storage.local.get([LINKS_KEY], (result: { [key: string]: LinkItem[] | undefined }) => {
  resolve(result[LINKS_KEY] ?? []);
});
```

**Discriminated union narrowing in linkPlacement:**

```ts
// Before
if (item.type === 'section' && item.links) { ... }

// After (TS narrows on tag)
if (item.type === 'section') { item.links // typed as RegularLink[] }
```

**Widget catalog with `as const satisfies` (TS 4.9+):**

```ts
// Enum-like via `as const` — modern alternative to TS `enum` (which is discouraged)
export const WidgetType = {
  LINK: 'link',
  SECTION: 'section',
  // ...
} as const;
export type WidgetType = typeof WidgetType[keyof typeof WidgetType];

// Catalog — `satisfies` preserves literal-type narrowness on each entry
// (so WIDGETS[0].type is the literal 'link' for narrowing) AND validates
// every entry against WidgetMeta at compile time. Plain `: WidgetMeta[]`
// would widen the literal types; plain `as const` would skip the validation.
const WIDGETS = [
  { type: 'link', addable: false, layout: { /* ... */ } },
  // ...
] as const satisfies readonly WidgetMeta[];
```

### Storage-boundary validation — explicit trust decision

Chrome storage / localStorage returns `unknown`-shaped data. It could be from
an older schema version or (unlikely here, but) tampered with. We have to make
an explicit decision:

| Option | Cost | Benefit | When to use |
|--------|------|---------|-------------|
| `zod` schemas at read sites | ~12kb bundle + dep | Runtime guarantee data matches type | Public APIs, multi-user apps |
| Hand-written type guards (`isLinkItem(x): x is LinkItem`) | ~20 LOC | Type-narrowed reads, no runtime overhead beyond shape check | Mid-trust boundaries |
| **Trust + log on access errors** | Zero | Pragmatic; data is single-user, locally controlled | **This codebase** |

**Decision for this migration:** option 3. We cast at the storage boundary
(`as LinkItem[]`) and trust. Document this in `lib/storage.ts` with a comment
so it's an explicit, reviewable choice — not silence.

If we ever add cloud sync or multi-device, revisit and switch to option 2.

### Verification

- ☐ `npm run typecheck` exits zero
- ☐ `npm test` still 39/39 passing
- ☐ `npm run build` produces working dist
- ☐ Extension reload: smoke test (add widget, delete, drag, resize, edit/save)

### Risk + rollback

- **Risk:** Chrome.storage types in `@types/chrome` may be stricter than the
  actual API. Resolution: narrow callback param types explicitly as above.
- **Rollback:** revert single phase commit. Files are renamed but the JS
  content is preserved; rename back if needed.

---

## 6. Phase 2 — `hooks/`

**Goal:** convert all hooks to TS. Each hook exposes a typed return interface
that downstream consumers can rely on.

### Files to convert

| File | Tricky bits |
|------|-------------|
| `useToast.js` → `.ts` | Trivial |
| `useGridDimensions.js` → `.ts` | Trivial |
| `useWidgetStorage.js` → `.ts` | Generic: `<T>(key: string, default: T): [T, (next: T \| (prev: T) => T) => void]` |
| `useTheme.js` → `.ts` | Settings type from §3 |
| `useHeaderDrag.js` → `.ts` | Callback types |
| `useSectionDragOut.js` → `.ts` | RGL drag callback signatures + ref types |
| `useDashboardDrag.js` → `.ts` | Biggest hook — RGL types, cross-grid coordination state |
| `useLinks.js` → `.ts` | `LinkItem[]` everywhere; verify discriminated union narrows |

### React 19 ref typing — important

React 19 changed `useRef` typing. The codebase uses `useRef(null)` in many
hooks (`gridRef`, `containerRef`, `lastCursorCoordsRef`, etc.). After the
migration:

```ts
// React 19 way — note the `T | null` in RefObject
const gridRef = useRef<HTMLDivElement>(null);
//      ^^^^^^^ type: RefObject<HTMLDivElement | null>

// Reading it requires a null check
if (gridRef.current) {
  gridRef.current.getBoundingClientRect();
}
```

**`forwardRef` is largely obsolete in React 19** — refs are passed as a regular
prop. The only place this codebase uses it is shadcn's auto-generated `Button`
(`ui/button.jsx`). Leave shadcn's pattern alone (it's machine-generated); for
any new component just accept `ref?: React.Ref<...>` as a normal prop.

```tsx
// React 19 — no forwardRef needed
interface Props {
  ref?: React.Ref<HTMLInputElement>;
  // ...
}
const Input = ({ ref, ...props }: Props) => <input ref={ref} {...props} />;
```

### Naming convention for hook returns

For hooks that return multiple values, define a named interface:

```ts
export interface DashboardDrag {
  gridRef: React.RefObject<HTMLDivElement | null>;
  activeDragSectionId: string | null;
  draggedItem: LinkItem | null;
  dragCursorCoords: DragCoords | null;
  activeDragOutItem: LinkItem | null;
  dragOutCoords: GridSlot | null;
  handleDragStart: RglDragHandler;
  handleDrag: RglDragHandler;
  handleDragStop: RglDragHandler;
  handleInnerDragStart: InnerDragHandler;
  handleInnerDrag: InnerDragHandler;
  handleInnerDragStop: InnerDragHandler;
}

export function useDashboardDrag(...): DashboardDrag { ... }
```

### Verification

- ☐ `npm run typecheck` exits zero
- ☐ `npm test` still 39/39 passing
- ☐ `npm run build`
- ☐ Extension smoke test: full drag/drop/edit/save flows

### Risk + rollback

- **RGL types confirmed good** (see Phase 0 recon). Use the exported
  `EventCallback` for `onDragStart`/`onDrag`/`onDragStop`, `Layout` for the
  layout array, `LayoutItem` for individual items. No `.d.ts` override.
- **Remaining risk:** our drag handlers ignore the 6th argument (`element:
  HTMLElement | null`); TS won't complain (callee may declare fewer params)
  but worth noting.
- **Rollback:** single phase commit revert.

---

## 7. Phase 3 — Leaf components (low coupling)

**Goal:** convert components that have simple props and no children-of-children
dependencies.

### Files to convert (15 total)

**UI primitives (shadcn, easy):**
- `components/ui/button.jsx` → `.tsx`
- `components/ui/input.jsx` → `.tsx`
- `components/ui/dialog.jsx` → `.tsx`
- `components/ui/dropdown-menu.jsx` → `.tsx`
- `components/ui/label.jsx` → `.tsx`

**Leaf widgets:**
- `components/IframeWidget.jsx` → `.tsx`
- `components/widgets/GoogleSearchWidget.jsx` → `.tsx`
- `components/widgets/TodoWidget.jsx` → `.tsx`
- `components/widgets/TimerWidget.jsx` → `.tsx`
- `components/widgets/NoteWidget.jsx` → `.tsx`
- `components/widgets/ImageWidget.jsx` → `.tsx`
- `components/widgets/LabelWidget.jsx` → `.tsx`
- `components/widgets/LensSearchModal.jsx` → `.tsx`
- `components/widgets/VoiceSearchOverlay.jsx` → `.tsx`

**Cards & modals:**
- `components/LinkCard.jsx` → `.tsx`
- `components/HeaderLink.jsx` → `.tsx`
- `components/AddLinkModal.jsx` → `.tsx`
- `components/AddWidgetModal.jsx` → `.tsx`
- `components/ThemeSettingsModal.jsx` → `.tsx`
- `components/Toast.jsx` → `.tsx`
- `components/AppHeader.jsx` → `.tsx`

### Conventions

**Component prop types:** prefer `interface Props {}` co-located with the
component. Don't export Props unless another file imports them.

```tsx
interface Props {
  item: Note;          // narrowed type, not LinkItem
  isEditing: boolean;
  onDelete: (id: string) => void;
  onUpdateLink: (id: string, updates: Partial<Note>) => void;
}

const NoteWidget = ({ item, isEditing, onDelete, onUpdateLink }: Props) => { ... };
```

**Children types:** `children: React.ReactNode` for flexible children;
`React.ReactElement` only when you need a single typed element.

**Event handlers:** prefer narrow event types
(`React.MouseEvent<HTMLButtonElement>` over `React.SyntheticEvent`).

### Verification

- ☐ `npm run typecheck` exits zero
- ☐ `npm run build`
- ☐ Extension smoke test: every leaf widget renders and works
  - Google Search submits + voice + lens
  - Todo add/check/delete
  - Timer add/start/pause
  - Note edit/color
  - Image upload/URL/fit
  - Label edit
  - Iframe URL + embed modes
  - LinkCard click + edit
  - HeaderLink drag + reorder
  - Modals open/close

### Risk + rollback

- **Risk:** widget data fields not yet in the discriminated union surface as
  `Property 'foo' does not exist on type 'Note'`. Mitigation: add missing
  fields to `types.ts` as discovered, one PR per gap.
- **Rollback:** single phase commit revert.

---

## 8. Phase 4 — Container components

**Goal:** convert top-of-tree components. These compose Phase 2 hooks +
Phase 3 leaves.

### Files to convert (8 total)

- `components/WidgetRenderer.jsx` → `.tsx` (exhaustive switch on `WidgetType`)
- `components/widgets/section/SectionHeader.jsx` → `.tsx`
- `components/widgets/section/SectionInnerGrid.jsx` → `.tsx`
- `components/widgets/SectionWidget.jsx` → `.tsx`
- `components/DashboardGrid.jsx` → `.tsx`
- `App.jsx` → `.tsx`
- `main.jsx` → `.tsx`
- `popup.jsx` + `popup/PopupApp.jsx` → `.tsx`

### Special — WidgetRenderer

This switch is where the discriminated union pays off. TS will warn if you
forget a case:

```tsx
switch (item.type) {
  case 'google-search': return <GoogleSearchWidget item={item} ... />;
  case 'iframe':        return <IframeWidget item={item} ... />;
  // ...
  default: {
    const _exhaustive: never = item;
    return null;
  }
}
```

The `_exhaustive: never` line is intentional — adds a new widget type to the
union without a switch case = compile error.

### Update entry points

After renaming entry files, update BOTH html entry points:

```html
<!-- index.html -->
<script type="module" src="/src/main.tsx"></script>

<!-- popup.html -->
<script type="module" src="/src/popup.tsx"></script>
```

Verify with `grep -rn "/src/main\|/src/popup" *.html` — both must point to the
`.tsx` files, not the old `.jsx` paths. Vite's HMR will silently 404 if
mismatched and the extension will show a blank page on reload.

### Verification

- ☐ `npm run typecheck` exits zero
- ☐ `npm run build`
- ☐ Extension full smoke test (the checklist from previous sessions)

### Risk + rollback

- **Risk:** RGL `onLayoutChange` signature mismatch surfaces at the
  `DashboardGrid` level. Mitigation: cast layout at the boundary, treat RGL as
  loosely typed for our internal pipeline.
- **Rollback:** single phase commit revert + restore `.html` entry-point
  references.

---

## 9. Phase 5 — Strictness ratchet + cleanup

**Goal:** turn on the safety the migration was meant to deliver. Remove
escape hatches added during migration.

### Tasks

1. **Tighten `tsconfig.json`:**

   ```json
   "strict": true,
   "noImplicitAny": true,
   "strictNullChecks": true,
   "noUncheckedIndexedAccess": true,
   "noFallthroughCasesInSwitch": true,
   "noUnusedLocals": true,
   "noUnusedParameters": true,
   "allowJs": false,
   "checkJs": false
   ```

2. **Fix all new errors.** Mostly: explicit `null` returns, narrow
   `Record<string, T>` index access, remove dead vars introduced during
   migration. Expect 20–50 to fix.

3. **Remove dead code:**
   - All `/* eslint-disable react/prop-types */` comments (no longer needed)
   - `jsconfig.json` (superseded by tsconfig)
   - Any `: any` casts added as temporary escape hatches

4. **Wire `typescript-eslint` into the flat config.**

   The repo uses ESLint 10.x (flat config). Install:

   ```bash
   npm install --save-dev typescript-eslint
   ```

   (`typescript-eslint` v8 ships parser + plugin + recommended configs as a
   single bundle — no need to install them separately like in legacy ESLint.)

   Update `eslint.config.js`:

   ```js
   import tseslint from 'typescript-eslint';

   export default tseslint.config(
     // ... existing JS configs unchanged
     ...tseslint.configs.recommended,
     // for type-aware rules (slower but catches more):
     // ...tseslint.configs.recommendedTypeChecked,
     {
       files: ['**/*.{ts,tsx}'],
       languageOptions: {
         parserOptions: {
           projectService: true,
           tsconfigRootDir: import.meta.dirname,
         },
       },
     },
   );
   ```

   Then `npm run lint` should pick up `.ts`/`.tsx` files and apply both the
   existing React rules and TS rules. Document any rule disables with comments
   explaining why.

5. **Document conventions** in this file under "Conventions" (or move to
   `CONTRIBUTING.md`).

### Verification

- ☐ `npm run typecheck` exits zero
- ☐ `npm run lint` exits zero (or only with documented exemptions)
- ☐ `npm test` 39/39 passing
- ☐ `npm run build`
- ☐ Extension full smoke test
- ☐ No `.js`/`.jsx` files remain under `src/`

### Why ratchet at the end

If we started strict, we'd waste hours fighting `noImplicitAny` on every file
during rename. Ratcheting at the end means each phase is mechanical (rename +
type the obvious bits) and strictness becomes one focused cleanup pass.

---

## 10. Conventions reference

Decided up front so I don't re-litigate each phase.

### File naming

- React components: `.tsx` (anything with JSX)
- Pure modules: `.ts` (no JSX)
- Tests: `.test.ts` (no JSX in tests today)
- Type-only files: `.ts` (e.g. `src/types.ts`)

### Types vs interfaces

- **`interface`** for object shapes that consumers might extend (component props,
  hook return shapes).
- **`type`** for unions, intersections, mapped/computed types, function
  signatures.

> Modern community (Matt Pocock et al.) often recommends `type` everywhere for
> consistency and to avoid accidental declaration merging. Either choice is
> fine — the rule is **pick one and stick to it**. We're going with the split
> above because most of this codebase's TS shapes are component props
> (interface-natural) plus a handful of unions (type-natural).

### React component patterns

- **No `React.FC`.** Discouraged in modern guides and unnecessary in React 19.
  Use plain function declarations with typed props:

  ```tsx
  // GOOD
  interface Props { foo: string }
  const Widget = ({ foo }: Props) => <div>{foo}</div>;

  // AVOID
  const Widget: React.FC<{ foo: string }> = ({ foo }) => <div>{foo}</div>;
  ```

- **No `forwardRef` for new components.** React 19 passes `ref` as a regular
  prop (see Phase 2 notes). Existing shadcn `Button` uses forwardRef — leave it
  alone (machine-generated), but new components don't need it.

### `satisfies` over type annotations for literal data

Use `as const satisfies T` when you want both:
1. Literal-type narrowness (so consumers can switch/narrow on field values)
2. Compile-time validation against an interface

Example: the widget catalog (see Phase 1 §5).

### `assertNever` for exhaustive switches

Alternative to inline `_e: never` checks. Define once, reuse:

```ts
// src/types.ts
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// Usage
switch (item.type) {
  case 'link': return ...;
  case 'section': return ...;
  // ... all cases
  default: return assertNever(item);
}
```

### Imports

- Type-only imports use `import type { Foo } from '...';` when the import has
  no runtime use. Helps the bundler tree-shake.

### `any` vs `unknown`

- `any` is a temporary migration escape hatch. Every `any` gets a `// TODO(ts):`
  comment with what to narrow it to. Cleaned up in Phase 5.
- `unknown` for genuinely unknown values (e.g. parsed JSON before validation).

### Generics

- Hooks like `useWidgetStorage<T>(key, default)` use generics. Constrain
  generics where possible (`<T extends LinkItem>` over bare `<T>`).

### React event handlers

- Use specific event types: `React.MouseEvent<HTMLButtonElement>`, not
  `React.SyntheticEvent`. Catches more bugs.

---

## 11. Status tracker

Tick boxes as phases complete. PR/commit refs go in the Notes column.

| Phase | Status | Notes |
|-------|--------|-------|
| 0. Foundation | ✅ Done | typecheck/build/tests all clean. `@types/node` also installed for `vite.config.ts`. `baseUrl` dropped (TS 6 deprecation). |
| 1. lib/ | ✅ Done | 9 files converted (7 sources + 2 tests). 39/39 tests pass. Required adding `types: ["node","chrome","vite/client"]` to tsconfig — auto-discovery didn't pick up `@types/chrome`. |
| 2. hooks/ | ☐ Not started | |
| 3. Leaf components | ☐ Not started | |
| 4. Container components | ☐ Not started | |
| 5. Strictness + cleanup | ☐ Not started | |

### Phase 0 reconnaissance findings

Recorded 2026-05-22 before any TS file changes.

- **ESLint config style:** ✅ flat config (`eslint.config.js` at repo root). Phase 5 wires `typescript-eslint` v8 using `tseslint.config()` as drafted.
- **`react-grid-layout` shipped types:** ✅ complete. v2.2.3 dist ships `legacy.d.ts` with `LegacyReactGridLayoutProps`, `Layout`, `LayoutItem`, `WidthProvider<P>`, plus an `EventCallback` type for `onDragStart/onDrag/onDragStop`. **No `.d.ts` override needed.**
- **`@types/react` installed version:** ✅ 19.2.14 (matches React 19.2.6 runtime). No upgrade required.
- **`@types/react-dom` installed version:** ✅ 19.x (auto-installed alongside `@types/react`).
- **`@types/chrome`:** ❌ not installed — Phase 0 step 1 will install. Covers `chrome.storage.local.{get,set,onChanged}`, `chrome.tabs.{query,create}`, `chrome.runtime.{sendMessage,onMessage}`, `chrome.history.search` — all the APIs the codebase actually uses.
- **Third-party type coverage:** ✅ all deps ship types — `dompurify`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`. Zero override files needed.
- **Risk reassessment:** Phase 2 RGL-types fight downgraded from "likely 30-min detour" to "unlikely". Phase 4 risk now reduces to "narrowing surprises only", not "fighting upstream types".

---

## 12. Pause / resume notes

The migration is designed to be paused at any phase boundary. To resume:

1. Read this doc end-to-end.
2. Check §11 status tracker for the next unticked phase.
3. Run `npm run typecheck && npm test && npm run build` to confirm last phase
   landed cleanly.
4. Execute the next phase's tasks.

If a phase's exit criteria can't be met, do NOT proceed. Either fix the gap or
revert that phase entirely and re-plan.

---

## 13. Rollback playbook

Each phase = one squash-mergeable commit. If a phase regression surfaces hours
or days after landing:

| Symptom timing | Action |
|---|---|
| Build / test failure before phase commit | Don't commit. Fix in-place or `git restore .` |
| Runtime regression noticed within session | `git reset --hard HEAD~1` to drop the phase commit |
| Regression discovered after subsequent phase has landed | `git revert <phase-N-sha>`. Phases are independent, so reverting Phase 3 doesn't break Phase 4's hook conversions — only the files Phase 3 touched go back to JS |
| Regression discovered after Phase 5 strictness ratchet | Harder. Phase 5 turns on flags that depend on every file being TS. Choices: (a) revert phase 5 only, accept loose strictness; (b) revert phase 5 + the offending phase, then re-do |

**Pre-flight before each phase commit:**

1. `npm run typecheck` → 0 errors
2. `npm test` → all green
3. `npm run build` → clean
4. Extension reload + smoke test the changed surface
5. Only then commit. Squash if multiple WIP commits during the phase.

**Branching:** consider one branch per phase (e.g. `ts-phase-3-leaf-components`)
merged to main on completion. Makes revert trivially `git revert -m 1` of the
merge commit. Optional; pure rebase-on-main also works.
