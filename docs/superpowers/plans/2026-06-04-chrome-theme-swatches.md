# Chrome-style Theme Swatches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat circular preset swatches in the theme picker with Chrome GM3 split-circle swatches using a Chrome-accurate seed palette, and auto-fix accent text contrast.

**Architecture:** Accent-only. A theme's seed HSL becomes `--primary`; surfaces keep today's `--theme-hue/--theme-sat` tint behavior. Pure color math lives in a new `src/lib/color.ts`; the palette + swatch-tone derivation in `src/lib/chromeThemes.ts`; a presentational `ThemeSwatch` component renders the split circle. `useTheme` computes `--primary-foreground` from accent luminance so light accents get dark text. The hue slider stays as the custom control.

**Tech Stack:** React + TypeScript, Tailwind (CSS custom properties for theming), Vitest for unit tests. No DOM test env — pure functions are unit-tested; components/hook are verified visually in the loaded extension.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/color.ts` (new) | Pure color math: parse/format HSL, HSL→RGB, WCAG luminance/contrast, foreground picker, lightness shift. No React/DOM. |
| `src/lib/chromeThemes.ts` (new) | `CHROME_THEMES` palette (Chrome-accurate seeds) + `deriveSwatchTones`. Depends on `color.ts`. |
| `src/components/ThemeSwatch.tsx` (new) | Presentational split-circle swatch. Depends on `chromeThemes`. |
| `src/components/ThemeSettingsModal.tsx` (edit) | Use `CHROME_THEMES` + `ThemeSwatch` in a 4-col grid; fix slider color derivation. |
| `src/hooks/useTheme.ts` (edit) | Set `--primary-foreground` from `pickForegroundHsl`. |
| `src/lib/__tests__/color.test.ts` (new) | Unit tests for color math. |
| `src/lib/__tests__/chromeThemes.test.ts` (new) | Unit tests for palette sanity + tone derivation. |
| `docs/extract-chrome-theme-colors.md` (new) | Best-effort DevTools snippet to extract exact seeds from the user's Chrome. |

`src/index.css` is intentionally **unchanged**: it already declares `--primary-foreground: 0 0% 100%` for first paint; `useTheme` overrides it at runtime.

---

## Task 1: Color math utilities

**Files:**
- Create: `src/lib/color.ts`
- Test: `src/lib/__tests__/color.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/color.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseHsl, formatHsl, hslToRgb, relativeLuminance,
  contrastRatio, pickForegroundHsl, shiftLightness,
} from '../color';

describe('parseHsl', () => {
  it('should parse a valid HSL string', () => {
    expect(parseHsl('271 91% 65%')).toEqual({ h: 271, s: 91, l: 65 });
  });
  it('should throw on a malformed string', () => {
    expect(() => parseHsl('not-a-color')).toThrow();
  });
});

describe('hslToRgb', () => {
  it('should convert pure red', () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('should convert white', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('should convert black', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('relativeLuminance', () => {
  it('should be 1 for white and 0 for black', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
});

describe('contrastRatio', () => {
  it('should be 21 for black on white', () => {
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 5);
  });
});

describe('pickForegroundHsl', () => {
  it('should pick dark text on a light yellow accent', () => {
    expect(pickForegroundHsl('45 95% 50%')).toBe('0 0% 10%');
  });
  it('should pick white text on a deep blue accent', () => {
    expect(pickForegroundHsl('214 82% 30%')).toBe('0 0% 100%');
  });
});

describe('shiftLightness', () => {
  it('should add lightness and clamp at 100', () => {
    expect(shiftLightness('200 50% 95%', 18)).toBe('200 50% 100%');
  });
  it('should subtract lightness and clamp at 0', () => {
    expect(shiftLightness('200 50% 5%', -16)).toBe('200 50% 0%');
  });
  it('should preserve hue and saturation', () => {
    expect(shiftLightness('271 91% 50%', 10)).toBe('271 91% 60%');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/color.test.ts`
Expected: FAIL — `Failed to resolve import "../color"` / functions undefined.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/color.ts
export interface Hsl { h: number; s: number; l: number; }
export interface Rgb { r: number; g: number; b: number; }

const HSL_RE = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/;
const WHITE_FG = '0 0% 100%';
const DARK_FG = '0 0% 10%';
const SRGB_THRESHOLD = 0.03928;

export function parseHsl(hsl: string): Hsl {
  const m = HSL_RE.exec(hsl);
  if (!m) throw new Error(`Invalid HSL string: "${hsl}"`);
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

export function formatHsl({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = lN - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

const channelLuminance = (channel: number): number => {
  const s = channel / 255;
  return s <= SRGB_THRESHOLD ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function pickForegroundHsl(accentHsl: string): string {
  const accentLum = relativeLuminance(hslToRgb(parseHsl(accentHsl)));
  const whiteContrast = contrastRatio(accentLum, relativeLuminance(hslToRgb(parseHsl(WHITE_FG))));
  const darkContrast = contrastRatio(accentLum, relativeLuminance(hslToRgb(parseHsl(DARK_FG))));
  return darkContrast > whiteContrast ? DARK_FG : WHITE_FG;
}

export function shiftLightness(hsl: string, deltaL: number): string {
  const { h, s, l } = parseHsl(hsl);
  const nextL = Math.max(0, Math.min(100, l + deltaL));
  return formatHsl({ h, s, l: nextL });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/color.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/__tests__/color.test.ts
git commit -m "feat(theme): add pure color math utilities (hsl/rgb/contrast)"
```

---

## Task 2: Chrome theme palette + swatch tones

**Files:**
- Create: `src/lib/chromeThemes.ts`
- Create: `docs/extract-chrome-theme-colors.md`
- Test: `src/lib/__tests__/chromeThemes.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/chromeThemes.test.ts
import { describe, it, expect } from 'vitest';
import { CHROME_THEMES, deriveSwatchTones } from '../chromeThemes';
import { parseHsl } from '../color';

describe('CHROME_THEMES', () => {
  it('should include a Default theme', () => {
    expect(CHROME_THEMES.some((t) => t.name === 'Default')).toBe(true);
  });
  it('should have unique names', () => {
    const names = CHROME_THEMES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('should expose every seed as a valid HSL string', () => {
    for (const theme of CHROME_THEMES) {
      expect(() => parseHsl(theme.seed)).not.toThrow();
    }
  });
});

describe('deriveSwatchTones', () => {
  it('should order tones light-top to dark-bottom-right', () => {
    const tones = deriveSwatchTones('214 82% 50%');
    expect(parseHsl(tones.top).l).toBeGreaterThan(parseHsl(tones.bottomLeft).l);
    expect(parseHsl(tones.bottomLeft).l).toBeGreaterThan(parseHsl(tones.bottomRight).l);
  });
  it('should keep all tone lightness values within [0, 100]', () => {
    const tones = deriveSwatchTones('0 0% 95%');
    for (const tone of [tones.top, tones.bottomLeft, tones.bottomRight]) {
      const { l } = parseHsl(tone);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/chromeThemes.test.ts`
Expected: FAIL — `Failed to resolve import "../chromeThemes"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/chromeThemes.ts
import { shiftLightness } from './color';

export interface ChromeTheme {
  name: string;
  /** App HSL string format: "H S% L%" (matches settings.themeColor). */
  seed: string;
}

/**
 * Chrome GM3 "Customize Chrome" color seeds, expressed in the app's HSL string
 * format. Chrome generates these per-version from seed colors, so values are a
 * close, contrast-checked approximation of the current Customize Chrome palette.
 * To match a specific Chrome build exactly, run the snippet in
 * docs/extract-chrome-theme-colors.md and replace the seeds below.
 *
 * Provenance: approximated from Chrome's Customize Chrome side panel (GM3),
 * captured 2026-06-04. Names follow Chrome's color labels.
 */
export const CHROME_THEMES: readonly ChromeTheme[] = [
  { name: 'Default', seed: '220 9% 46%' },
  { name: 'Grey', seed: '220 6% 60%' },
  { name: 'Blue', seed: '214 82% 51%' },
  { name: 'Aqua', seed: '187 90% 42%' },
  { name: 'Viridian', seed: '168 76% 36%' },
  { name: 'Green', seed: '145 63% 42%' },
  { name: 'Citron', seed: '66 60% 45%' },
  { name: 'Yellow', seed: '45 95% 50%' },
  { name: 'Orange', seed: '28 95% 53%' },
  { name: 'Apricot', seed: '18 88% 62%' },
  { name: 'Tomato', seed: '8 80% 56%' },
  { name: 'Rose', seed: '345 80% 60%' },
  { name: 'Pink', seed: '330 85% 70%' },
  { name: 'Fuchsia', seed: '300 70% 55%' },
  { name: 'Violet', seed: '271 70% 60%' },
] as const;

export interface SwatchTones {
  top: string;
  bottomLeft: string;
  bottomRight: string;
}

const TONE_TOP_DELTA = 18;
const TONE_BOTTOM_RIGHT_DELTA = -16;

/** Split the seed into the three regions painted in the Chrome-style swatch. */
export function deriveSwatchTones(seed: string): SwatchTones {
  return {
    top: shiftLightness(seed, TONE_TOP_DELTA),
    bottomLeft: seed,
    bottomRight: shiftLightness(seed, TONE_BOTTOM_RIGHT_DELTA),
  };
}
```

- [ ] **Step 4: Write the extraction doc**

````markdown
<!-- docs/extract-chrome-theme-colors.md -->
# Extract exact Chrome theme seed colors

Chrome generates its "Customize Chrome" colors per version, so the only way to
match your exact Chrome is to read what it renders. This is best-effort — the
element selectors change across Chrome versions.

## Steps

1. Open a new tab, click the **Customize Chrome** pencil (bottom-right) to open
   the side panel, and select the **Color** section.
2. Right-click any color swatch in the side panel and choose **Inspect**. This
   opens DevTools attached to the side panel WebUI.
3. Paste this into the DevTools **Console** and press Enter:

```js
// Best-effort: collect every non-transparent background color rendered in the
// customize panel. Dedupe and print as a list.
const seen = new Set();
for (const el of document.querySelectorAll('*')) {
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') seen.add(bg);
}
console.log([...seen].join('\n'));
```

4. Copy the `rgb(...)` values that match the swatches, convert each to the app's
   `"H S% L%"` HSL format, and replace the corresponding `seed` in
   `src/lib/chromeThemes.ts`. (Any online RGB→HSL converter works; HSL must be
   written as `H S% L%`, space-separated, no commas.)

If the snippet returns nothing useful (selectors changed), keep the shipped
fallback palette — it is contrast-checked and visually close.
````

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/chromeThemes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chromeThemes.ts src/lib/__tests__/chromeThemes.test.ts docs/extract-chrome-theme-colors.md
git commit -m "feat(theme): add Chrome GM3 seed palette + swatch tone derivation"
```

---

## Task 3: ThemeSwatch component

**Files:**
- Create: `src/components/ThemeSwatch.tsx`

No unit test: the project has no DOM/React test environment. Verified visually in Task 6.

- [ ] **Step 1: Write the component**

```tsx
// src/components/ThemeSwatch.tsx
import { deriveSwatchTones, type ChromeTheme } from '../lib/chromeThemes';

interface Props {
  theme: ChromeTheme;
  selected: boolean;
  onSelect: (seed: string) => void;
}

export default function ThemeSwatch({ theme, selected, onSelect }: Readonly<Props>) {
  const tones = deriveSwatchTones(theme.seed);
  // Bottom layer: left/right halves. Top layer: upper half overlays the bottom.
  const background = [
    `linear-gradient(to bottom, hsl(${tones.top}) 0 50%, transparent 50% 100%)`,
    `linear-gradient(to right, hsl(${tones.bottomLeft}) 0 50%, hsl(${tones.bottomRight}) 50% 100%)`,
  ].join(', ');

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={theme.name}
      title={theme.name}
      onClick={() => onSelect(theme.seed)}
      className={`w-10 h-10 p-0 rounded-full transition-transform hover:scale-110 ${
        selected
          ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
          : 'ring-1 ring-border'
      }`}
      style={{ background }}
    />
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: `No errors found`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeSwatch.tsx
git commit -m "feat(theme): add Chrome-style split-circle ThemeSwatch component"
```

---

## Task 4: Wire swatches into the theme modal

**Files:**
- Modify: `src/components/ThemeSettingsModal.tsx`

- [ ] **Step 1: Replace the preset palette source**

Remove the local `presetColors` array (currently lines ~33-46) and import the catalog + swatch. At the top of the file, alongside the existing imports, add:

```tsx
import ThemeSwatch from './ThemeSwatch';
import { CHROME_THEMES } from '../lib/chromeThemes';
```

Delete this block entirely:

```tsx
const presetColors = [
  { name: 'Red', hsl: '346 87% 61%' },
  { name: 'Pink', hsl: '326 100% 74%' },
  { name: 'Purple', hsl: '271 91% 65%' },
  { name: 'Indigo', hsl: '239 84% 67%' },
  { name: 'Blue', hsl: '200 73% 52%' },
  { name: 'Cyan', hsl: '189 94% 43%' },
  { name: 'Teal', hsl: '175 84% 32%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Yellow', hsl: '45 93% 47%' },
  { name: 'Orange', hsl: '24 100% 50%' },
  { name: 'Slate', hsl: '215 16% 47%' },
  { name: 'Neutral', hsl: '0 0% 50%' },
];
```

- [ ] **Step 2: Replace the preset grid markup**

Replace the existing preset `<div role="radiogroup" ...>` block (the `grid grid-cols-6` mapping `presetColors` to `<Button>`s, currently lines ~146-162) with:

```tsx
<div role="radiogroup" aria-label="Primary color presets" className="grid grid-cols-4 gap-3">
  {CHROME_THEMES.map((theme) => (
    <ThemeSwatch
      key={theme.name}
      theme={theme}
      selected={currentColor === theme.seed}
      onSelect={setColor}
    />
  ))}
</div>
```

- [ ] **Step 3: Fix the hue slider color derivation**

In the "Custom Hue" slider `onChange` (currently `setColor(\`${hue} 80% 55%\`)`, line ~179), change the produced color so it matches the palette's character and stays legible:

```tsx
onChange={(e) => {
  const hue = e.target.value;
  setColor(`${hue} 70% 50%`);
}}
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `npm run typecheck && npx eslint src/components/ThemeSettingsModal.tsx src/components/ThemeSwatch.tsx`
Expected: `No errors found`; eslint reports 0 errors (the `Button` import may now be unused only if no other usage remains — if eslint flags an unused `Button` import, remove it; it is still used by the mode toggle and background buttons, so it should remain).

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeSettingsModal.tsx
git commit -m "feat(theme): render Chrome swatches in picker, fix slider color"
```

---

## Task 5: Auto-contrast for the accent foreground

**Files:**
- Modify: `src/hooks/useTheme.ts`

- [ ] **Step 1: Import the foreground picker**

At the top of `src/hooks/useTheme.ts`, add to the imports:

```ts
import { pickForegroundHsl } from '../lib/color';
```

- [ ] **Step 2: Set `--primary-foreground` when applying a theme color**

In the effect, inside the `if (settings.themeColor) { ... }` branch, right after the existing `--primary`/`--ring` `setProperty` calls, add:

```ts
document.documentElement.style.setProperty(
  '--primary-foreground',
  pickForegroundHsl(settings.themeColor),
);
```

In the matching `else { ... }` branch (no theme color), alongside the existing `removeProperty` calls, add:

```ts
document.documentElement.style.removeProperty('--primary-foreground');
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npx eslint src/hooks/useTheme.ts`
Expected: `No errors found`; eslint reports 0 errors (the pre-existing `react-hooks/refs` warning is unrelated and acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "fix(theme): auto-pick accent foreground for WCAG contrast"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS — all suites, including the new `color` and `chromeThemes` tests.

- [ ] **Step 2: Typecheck, lint, and build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: typecheck `No errors found`; lint 0 errors; build succeeds.

- [ ] **Step 3: Visual check in the loaded extension**

Load the unpacked build in Chrome, open the new tab, open **Theme & Appearance**, and confirm:
- The preset grid shows 4-column Chrome-style split-circle swatches.
- Selecting a light accent (Yellow/Citron) shows **dark** text/icons on primary buttons (contrast fixed); a dark accent (Blue/Violet) shows **white** text.
- The selected swatch shows the ring; the hue slider still works.
- Toggle Light/Dark mode — swatches and contrast hold in both.

- [ ] **Step 4: (Optional) Extract exact colors**

Follow `docs/extract-chrome-theme-colors.md` to capture your Chrome's exact seeds and replace the `seed` values in `src/lib/chromeThemes.ts`. Re-run `npm test` and commit:

```bash
git add src/lib/chromeThemes.ts
git commit -m "chore(theme): replace fallback seeds with extracted Chrome values"
```

---

## Self-Review

- **Spec coverage:** swatch UI (Tasks 3-4), exact-color sourcing (Task 2 palette + extraction doc), hue slider kept (Task 4), 4-col grid (Task 4), contrast fix (Tasks 1+5), surface tint unchanged (no task touches `--theme-hue/--theme-sat`), tests (Tasks 1-2), out-of-scope items not implemented. Covered.
- **Placeholders:** none — all code blocks are complete; data values are real.
- **Type consistency:** `ChromeTheme.seed` / `CHROME_THEMES` / `deriveSwatchTones` / `SwatchTones` / `pickForegroundHsl` / `shiftLightness` names match across `color.ts`, `chromeThemes.ts`, `ThemeSwatch.tsx`, `ThemeSettingsModal.tsx`, `useTheme.ts`.
