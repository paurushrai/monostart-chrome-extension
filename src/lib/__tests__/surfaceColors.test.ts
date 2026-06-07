import { describe, it, expect } from 'vitest';
import { computeSnappedSurfaces, SNAPPED_SURFACE_VARS } from '../surfaceColors';
import { CHROME_THEMES } from '../chromeThemes';
import { parseHsl } from '../color';

/** Float-precision hsl→rgb (no rounding) — what a browser would paint. */
const toRgbFloat = (hsl: string): [number, number, number] => {
  const { h, s, l } = parseHsl(hsl);
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
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};
const maxFracError = (hsl: string): number =>
  Math.max(...toRgbFloat(hsl).map((ch) => Math.abs(ch - Math.round(ch))));

const seedParams = (seed: string, isDark: boolean) => {
  const { h, s, l } = parseHsl(seed);
  const satFactor: 0 | 1 = s === 0 ? 0 : 1;
  let themeSat = isDark ? 30 : 40;
  if (s === 0) themeSat = 0;
  const shift = s === 0 ? Math.max(-4, Math.min(4, (l - 50) / 6)) : 0;
  return { h, themeSat, satFactor, shift, isDark };
};

describe('computeSnappedSurfaces', () => {
  it('should_produce_integer_rgb_for_every_preset_in_both_modes', () => {
    for (const theme of CHROME_THEMES) {
      for (const isDark of [true, false]) {
        const surfaces = computeSnappedSurfaces(seedParams(theme.seed, isDark));
        for (const [varName, value] of Object.entries(surfaces)) {
          expect(
            maxFracError(value),
            `${theme.name} ${isDark ? 'dark' : 'light'} ${varName} = ${value}`,
          ).toBeLessThan(0.01);
        }
      }
    }
  });

  it('should_cover_every_var_it_declares', () => {
    const surfaces = computeSnappedSurfaces(seedParams('214 82% 51%', true));
    expect(Object.keys(surfaces).sort()).toEqual([...SNAPPED_SURFACE_VARS].sort());
  });

  it('should_mirror_the_dark_background_ladder', () => {
    // Blue dark: hsl(214 30% 10%) → rgb(18,24,33) → hsl(216 29.4118% 10%)
    const surfaces = computeSnappedSurfaces(seedParams('214 82% 51%', true));
    expect(surfaces['--background']).toBe('216 29.4118% 10%');
  });

  it('should_collapse_light_border_saturation_for_achromatic_seeds', () => {
    const surfaces = computeSnappedSurfaces(seedParams('0 0% 75%', false));
    expect(parseHsl(surfaces['--border'] ?? '').s).toBe(0);
  });

  it('should_omit_light_mode_secondary_and_popover_which_are_pure_white', () => {
    const light = computeSnappedSurfaces(seedParams('214 82% 51%', false));
    const dark = computeSnappedSurfaces(seedParams('214 82% 51%', true));
    expect(light['--secondary']).toBeUndefined();
    expect(dark['--secondary']).toBeDefined();
  });
});
