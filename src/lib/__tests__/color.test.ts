import { describe, it, expect } from 'vitest';
import {
  parseHsl, hslToRgb, relativeLuminance,
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
