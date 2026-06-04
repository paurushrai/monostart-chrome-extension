   # Chrome-style theme swatches (accent-only)

**Date:** 2026-06-04
**Status:** Approved (design)
**Area:** Theme picker — `ThemeSettingsModal`, `useTheme`, new `chromeThemes` lib + `ThemeSwatch` component

## Goal

Make the dashboard's "Primary Color" picker look and feel like Chrome's
"Customize Chrome" color section: replace the flat circular preset swatches with
Chrome's GM3 **split-circle** swatches, using Chrome's **exact seed colors**.
Keep the rest of the Theme & Appearance modal exactly as it is today (mode
toggle, hue slider, background section). Fix the contrast and slider
discrepancies found in the current implementation.

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Theming depth | **Accent-only.** A theme's seed becomes `--primary`; surfaces keep today's neutral-tint behavior. The split circle is a cosmetic derived light/dark tone of the seed. |
| 2 | Color source | **Hardcode Chromium seeds** as the reliable baseline. Exact hex sourced from Chromium during implementation (provenance cited). |
| 3 | Custom control | **Keep the existing hue slider** (no eyedropper). |
| 4 | Grid columns | **4 columns** (matches Chrome's panel / the reference screenshot). |
| 5 | Palette size | **Match Chrome's set** (~14 colors + Grey/Default). |
| 6 | Surface tint | **Unchanged** — keep today's `--theme-hue/--theme-sat` behavior. |
| 7 | Contrast | **Fixed** — auto-compute `--primary-foreground` from accent luminance. |
| 8 | Extraction script | **Included** as an optional best-effort DevTools snippet (`docs/`), to verify/override seeds against the user's own Chrome version. |

## Current state (what we're changing)

- `ThemeSettingsModal.tsx` holds a hardcoded `presetColors` array of 12
  `{ name, hsl }` rendered as flat `bg`-filled circles in a `grid-cols-6`.
- `useTheme.ts` applies `themeColor` to `--primary` and `--ring`, derives
  `--theme-hue` from the accent's hue, and bumps `--theme-sat` to 30% (dark) /
  40% (light). Light/dark mode toggled via the `.dark` class.
- `--primary-foreground` is hardcoded `0 0% 100%` (white) in `index.css` for
  both modes.

### Discrepancies (bugs) to fix

1. **Contrast bug (correctness):** `--primary-foreground` is always white. On
   light accents (Yellow `45 93% 47%`, Cyan `189 94% 43%`, Green `142 71% 45%`)
   white text/icons on the primary fail WCAG contrast.
2. **Slider inconsistency:** the custom-hue slider forces `${hue} 80% 55%`,
   ignoring per-color saturation/lightness, so slider colors feel different from
   the presets.

Surface-tint strength (the 30–40% bump) is intentionally **left as-is** to honor
"keep the UI like it is now."

## Architecture

Three units, each independently testable:

### 1. `src/lib/chromeThemes.ts` (new) — palette source of truth

```ts
export interface ChromeTheme {
  name: string;   // e.g. "Blue", "Viridian", "Default"
  seed: string;   // app HSL string format: "H S% L%"
}

export const CHROME_THEMES: readonly ChromeTheme[];

// Derive the 2–3 tones used to paint the split-circle swatch.
export interface SwatchTones { top: string; bottomLeft: string; bottomRight: string; }
export function deriveSwatchTones(seedHsl: string): SwatchTones;
```

- `CHROME_THEMES` is Chrome's GM3 seed set converted to the app's `"H S% L%"`
  string format (the format `settings.themeColor` already uses).
- `deriveSwatchTones` produces the split-circle regions by shifting the seed's
  lightness (e.g. lighter top, base + darker on the bottom) — no image assets.
- A provenance comment records where the hex values came from (Chromium
  `customize_chrome` colors) and the date, so future updates are traceable.

**What it does:** owns the palette data and swatch-tone math.
**Depends on:** a small hex/HSL helper (see §contrast). No React, no DOM.

### 2. `src/components/ThemeSwatch.tsx` (new) — the split-circle swatch

```ts
interface Props {
  theme: ChromeTheme;
  selected: boolean;
  onSelect: (seed: string) => void;
}
```

- Renders a circle painted with a pure-CSS `conic-gradient`/`linear-gradient`
  from `deriveSwatchTones` — visually matching Chrome's frame/toolbar split.
- Accessibility mirrors the current presets: `role="radio"`, `aria-checked`,
  `title={theme.name}`, keyboard-activatable, selected ring uses the existing
  `ring-foreground` treatment.

**What it does:** presents one selectable swatch.
**Depends on:** `chromeThemes` (`deriveSwatchTones`).

### 3. `src/components/ThemeSettingsModal.tsx` (edit) — wire-up

- Remove the local `presetColors` array; import `CHROME_THEMES`.
- Replace the preset `<Button>` map with `<ThemeSwatch>` in a `grid-cols-4`.
- **Keep** the "Custom Hue" slider block unchanged in position; only its
  `onChange` color derivation is corrected (see §slider).
- Background section, mode toggle, and dialog structure untouched.

### 4. `src/hooks/useTheme.ts` (edit) — contrast + slider correctness

- **Contrast:** after setting `--primary`, compute the accent's relative
  luminance (HSL → RGB → WCAG relative luminance) and set
  `--primary-foreground` to `0 0% 100%` (white) when luminance is low, else
  `0 0% 10%` (near-black). This runs for every applied color (presets and
  slider). Remove reliance on the hardcoded white in `index.css` for the
  themed accent (keep a sensible CSS default for first paint).
- **Slider:** derive a legible color from the hue instead of the fixed
  `80% 55%`, consistent with the palette's character and the contrast rule.

**Data flow (unchanged shape):**
`ThemeSwatch.onSelect(seed)` → `updateSettings({...settings, themeColor: seed})`
→ `useTheme` effect applies `--primary`, computes `--primary-foreground`, keeps
`--theme-hue/--theme-sat` tint as today.

## Color sourcing plan

1. **Primary:** hardcode Chrome's GM3 customize-chrome seed colors into
   `CHROME_THEMES`, sourced from Chromium source during implementation, with a
   provenance comment (file + revision/date).
2. **If source is unreachable at build time:** ship a curated GM3-accurate set
   and flag values as pending verification.
3. **Verification artifact (`docs/extract-chrome-theme-colors.md`):** a
   best-effort DevTools snippet the user runs on their own Chrome's Customize
   Chrome side panel to dump the rendered swatch colors, so they can confirm or
   override the hardcoded values for their exact Chrome version. Best-effort
   because selectors are version-dependent; the hardcoded seeds remain the
   reliable baseline.

## Contrast algorithm

- Convert the accent `"H S% L%"` → RGB.
- Compute WCAG relative luminance `L`.
- `--primary-foreground = L > THRESHOLD ? "0 0% 10%" : "0 0% 100%"`, where
  `THRESHOLD` is tuned so light accents (yellow/cyan/green) get dark text and
  saturated mid/dark accents get white. (Implementation may compare actual
  contrast ratios of both candidates and pick the higher — decided in the plan.)

## Testing

Deterministic unit tests (no time/network):

- `hexToHsl` / `hslToRgb` conversion: known values, edge (pure black/white, 0%
  saturation grey).
- Contrast decision: yellow seed → dark fg; deep blue/purple → white fg;
  mid-grey near threshold → expected branch.
- `deriveSwatchTones`: lightness ordering (top vs bottom tones distinct and
  within [0,100]).

Plus a manual visual check in the loaded extension (light + dark mode).

## Out of scope (YAGNI)

- Full Material You / HCT palette generation, `material-color-utilities`.
- Recoloring frame/surfaces from the seed (two-tone or full theming).
- Native `EyeDropper` API (hue slider stays).

## File-by-file summary

| File | Change |
|------|--------|
| `src/lib/chromeThemes.ts` | **new** — palette + tone derivation + provenance |
| `src/components/ThemeSwatch.tsx` | **new** — split-circle swatch component |
| `src/components/ThemeSettingsModal.tsx` | edit — use `CHROME_THEMES` + `ThemeSwatch`, 4-col grid, keep slider |
| `src/hooks/useTheme.ts` | edit — compute `--primary-foreground`; fix slider color derivation |
| `src/index.css` | minor — keep a sane default `--primary-foreground` for first paint |
| `src/lib/__tests__/chromeThemes.test.ts` | **new** — conversion, contrast, tone tests |
| `docs/extract-chrome-theme-colors.md` | **new** — best-effort DevTools extraction snippet |
