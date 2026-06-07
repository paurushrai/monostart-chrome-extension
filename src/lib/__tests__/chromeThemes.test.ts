import { describe, it, expect } from 'vitest';
import { CHROME_THEMES, deriveSwatchTones, migrateLegacySeed } from '../chromeThemes';
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
  it('should make Default a pure dark grey', () => {
    const seed = CHROME_THEMES.find((t) => t.name === 'Default')?.seed ?? '';
    const { s, l } = parseHsl(seed);
    expect(s).toBe(0);
    expect(l).toBeLessThanOrEqual(40);
  });
  it('should make Grey a pure light grey, clearly lighter than Default', () => {
    const grey = parseHsl(CHROME_THEMES.find((t) => t.name === 'Grey')?.seed ?? '');
    const def = parseHsl(CHROME_THEMES.find((t) => t.name === 'Default')?.seed ?? '');
    expect(grey.s).toBe(0);
    expect(grey.l - def.l).toBeGreaterThanOrEqual(25);
  });
});

describe('migrateLegacySeed', () => {
  it('should map the legacy blue-grey Default seed to the current Default', () => {
    const defaultSeed = CHROME_THEMES.find((t) => t.name === 'Default')?.seed;
    expect(migrateLegacySeed('220 9% 46%')).toBe(defaultSeed);
  });
  it('should map the legacy Grey seed to the current Grey', () => {
    const greySeed = CHROME_THEMES.find((t) => t.name === 'Grey')?.seed;
    expect(migrateLegacySeed('220 6% 60%')).toBe(greySeed);
  });
  it('should pass non-legacy seeds through unchanged', () => {
    expect(migrateLegacySeed('214 82% 51%')).toBe('214 82% 51%');
    expect(migrateLegacySeed(undefined)).toBeUndefined();
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
