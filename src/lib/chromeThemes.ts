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
  { name: 'Default', seed: '0 0% 30%' },
  { name: 'Grey', seed: '0 0% 75%' },
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

/**
 * Pre-1.1.1 Default/Grey seeds carried a hue-220 blue cast and rendered as
 * near-identical blue-greys. Map stored legacy values onto the current pure
 * greys so the matching preset still shows as selected.
 */
const LEGACY_SEED_MIGRATIONS: Readonly<Record<string, string>> = {
  '220 9% 46%': '0 0% 30%',
  '220 6% 60%': '0 0% 75%',
};

export function migrateLegacySeed(seed: string | undefined): string | undefined {
  if (seed === undefined) return undefined;
  return LEGACY_SEED_MIGRATIONS[seed] ?? seed;
}

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
