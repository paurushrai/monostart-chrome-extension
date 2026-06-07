import { describe, it, expect } from 'vitest';
import {
  parseHsl, hslToRgb, relativeLuminance, contrastRatio,
  normalizeAccentForContrast, shiftLightness, hexToHsl, foregroundForLuminance, snapHslToIntegerRgb,
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

describe('normalizeAccentForContrast', () => {
  const meetsAA = (accent: string, fg: string): boolean =>
    contrastRatio(
      relativeLuminance(hslToRgb(parseHsl(accent))),
      relativeLuminance(hslToRgb(parseHsl(fg))),
    ) >= 4.5;

  it('should keep a light yellow accent and pair it with dark text', () => {
    const { accent, foreground } = normalizeAccentForContrast('45 95% 50%');
    expect(accent).toBe('45 95% 50%');
    expect(foreground).toBe('0 0% 10%');
  });
  it('should keep a deep blue accent and pair it with white text', () => {
    const { accent, foreground } = normalizeAccentForContrast('214 82% 30%');
    expect(accent).toBe('214 82% 30%');
    expect(foreground).toBe('0 0% 100%');
  });
  it('should darken a mid purple that fails AA and pair it with white text', () => {
    const { accent, foreground } = normalizeAccentForContrast('271 91% 65%');
    expect(parseHsl(accent).l).toBeLessThan(65);
    expect(foreground).toBe('0 0% 100%');
    expect(meetsAA(accent, foreground)).toBe(true);
  });
  it('should preserve hue and saturation when adjusting', () => {
    const { accent } = normalizeAccentForContrast('271 91% 65%');
    expect(parseHsl(accent).h).toBe(271);
    expect(parseHsl(accent).s).toBe(91);
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

describe('hexToHsl', () => {
  it('should convert full hex to HSL', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
  });
  it('should expand shorthand hex', () => {
    expect(hexToHsl('#0f0')).toEqual({ h: 120, s: 100, l: 50 });
  });
  it('should throw on an invalid hex', () => {
    expect(() => hexToHsl('nope')).toThrow();
  });
});

describe('foregroundForLuminance', () => {
  it('should pick dark text on a bright background', () => {
    expect(foregroundForLuminance(0.9)).toBe('0 0% 10%');
  });
  it('should pick light text on a dark background', () => {
    expect(foregroundForLuminance(0.02)).toBe('0 0% 98%');
  });
});

describe('snapHslToIntegerRgb', () => {
  // Float-precision hsl→rgb (no rounding) to verify what a browser would paint.
  const toRgbFloat = (hsl: string): [number, number, number] => {
    const { h, s, l } = parseHsl(hsl);
    const sN = s / 100, lN = l / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
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

  it('should_land_on_integer_rgb_when_input_is_fractional_chromatic', () => {
    // Blue dark background: hsl(214 30% 10%) → rgb(17.85, 23.46, 33.15)
    const snapped = snapHslToIntegerRgb('214 30% 10%');
    expect(maxFracError(snapped)).toBeLessThan(0.01);
  });

  it('should_land_on_integer_rgb_when_input_is_fractional_achromatic', () => {
    // Grey dark background: hsl(0 0% 14%) → rgb(35.7, 35.7, 35.7)
    const snapped = snapHslToIntegerRgb('0 0% 14%');
    expect(maxFracError(snapped)).toBeLessThan(0.01);
  });

  it('should_preserve_the_rounded_rgb_of_the_input', () => {
    const original = '214 30% 10%';
    const snapped = snapHslToIntegerRgb(original);
    expect(hslToRgb(parseHsl(snapped))).toEqual(hslToRgb(parseHsl(original)));
  });

  it('should_keep_already_integer_colors_equivalent', () => {
    // Default dark background: hsl(0 0% 6.6667%) → exactly rgb(17,17,17)
    const snapped = snapHslToIntegerRgb('0 0% 6.6667%');
    expect(hslToRgb(parseHsl(snapped))).toEqual({ r: 17, g: 17, b: 17 });
    expect(maxFracError(snapped)).toBeLessThan(0.01);
  });

  it('should_return_a_valid_app_format_hsl_string', () => {
    expect(() => parseHsl(snapHslToIntegerRgb('45 95% 50%'))).not.toThrow();
  });
});
