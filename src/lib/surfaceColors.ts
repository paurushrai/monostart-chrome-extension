import { snapHslToIntegerRgb } from './color';

/**
 * JS mirror of the surface ladders in index.css, with every color snapped to
 * exact integer sRGB via snapHslToIntegerRgb. The CSS calc values stay as the
 * no-JS fallback; useTheme overrides them inline with these snapped values so
 * no painted surface lands on fractional RGB (fractional channels quantize
 * differently between rasterization passes on wide-gamut displays, splitting
 * large surfaces into two near-identical shades).
 *
 * Text colors (*-foreground) are antialiased glyphs and cannot seam — they
 * are intentionally not snapped. Light-mode --secondary/--popover are pure
 * white (already integer) and stay CSS-owned.
 */

export interface SurfaceParams {
  h: number;
  /** Resolved tint saturation (0, 30, or 40) — not the raw seed saturation. */
  themeSat: number;
  /** 1 for chromatic seeds, 0 for achromatic. */
  satFactor: 0 | 1;
  /** Achromatic surface-lightness shift, already clamped (±4). */
  shift: number;
  isDark: boolean;
}

/* Lightness ladders — mirror index.css :root and .dark blocks. */
const DARK_LADDER: Readonly<Record<string, number>> = {
  '--background': 10,
  '--muted': 12,
  '--card': 16,
  '--secondary': 22,
  '--popover': 22,
  '--accent': 28,
  '--border': 28,
  '--input': 28,
};
const LIGHT_LADDER: Readonly<Record<string, number>> = {
  '--background': 94,
  '--muted': 95,
  '--card': 97,
  '--accent': 95,
  '--border': 88,
  '--input': 88,
};
/* Light-mode border/input use a fixed 32% saturation gated by the
   achromatic factor (see index.css), not the tint saturation. */
const LIGHT_BORDER_SAT = 32;
const LIGHT_BORDER_VARS = new Set(['--border', '--input']);

/** Every var computeSnappedSurfaces can emit — used to clear inline overrides. */
export const SNAPPED_SURFACE_VARS: readonly string[] = Object.keys(DARK_LADDER);

export function computeSnappedSurfaces(params: SurfaceParams): Record<string, string> {
  const { h, themeSat, satFactor, shift, isDark } = params;
  const ladder = isDark ? DARK_LADDER : LIGHT_LADDER;
  const result: Record<string, string> = {};
  for (const [varName, baseLightness] of Object.entries(ladder)) {
    const sat = !isDark && LIGHT_BORDER_VARS.has(varName)
      ? LIGHT_BORDER_SAT * satFactor
      : themeSat;
    result[varName] = snapHslToIntegerRgb(`${h} ${sat}% ${baseLightness + shift}%`);
  }
  return result;
}
