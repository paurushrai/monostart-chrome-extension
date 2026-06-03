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
