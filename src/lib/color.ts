export interface Hsl { h: number; s: number; l: number; }
export interface Rgb { r: number; g: number; b: number; }

const HSL_RE = /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/;
const WHITE_FG = '0 0% 100%';
const DARK_FG = '0 0% 10%';
const SRGB_THRESHOLD = 0.03928;
const AA_CONTRAST = 4.5;
const LIGHT_FG = '0 0% 98%';

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

function bestForeground(accentHsl: string): { fg: string; ratio: number } {
  const accentLum = relativeLuminance(hslToRgb(parseHsl(accentHsl)));
  const whiteRatio = contrastRatio(accentLum, relativeLuminance(hslToRgb(parseHsl(WHITE_FG))));
  const darkRatio = contrastRatio(accentLum, relativeLuminance(hslToRgb(parseHsl(DARK_FG))));
  return darkRatio > whiteRatio ? { fg: DARK_FG, ratio: darkRatio } : { fg: WHITE_FG, ratio: whiteRatio };
}

/**
 * Pick an accent that carries legible text. If the seed already meets AA (4.5:1)
 * with white or dark text it is returned unchanged; otherwise its lightness is
 * shifted to the nearest value that does (hue and saturation preserved).
 * Returns the applied accent and the foreground color to pair with it.
 */
export function normalizeAccentForContrast(accentHsl: string): { accent: string; foreground: string } {
  const initial = bestForeground(accentHsl);
  if (initial.ratio >= AA_CONTRAST) return { accent: accentHsl, foreground: initial.fg };
  // Deepen the accent (paired with light text) until it clears AA. Darkening
  // always converges and keeps the conventional vibrant-accent + white-label look.
  const { h, s, l } = parseHsl(accentHsl);
  for (let nextL = l - 1; nextL >= 0; nextL -= 1) {
    const candidate = formatHsl({ h, s, l: nextL });
    const best = bestForeground(candidate);
    if (best.ratio >= AA_CONTRAST) return { accent: candidate, foreground: best.fg };
  }
  return { accent: formatHsl({ h, s, l: 0 }), foreground: WHITE_FG };
}

export function shiftLightness(hsl: string, deltaL: number): string {
  const { h, s, l } = parseHsl(hsl);
  const nextL = Math.max(0, Math.min(100, l + deltaL));
  return formatHsl({ h, s, l: nextL });
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rN) h = ((gN - bN) / delta) % 6;
    else if (max === gN) h = (bN - rN) / delta + 2;
    else h = (rN - gN) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function hexToRgb(hex: string): Rgb {
  const m = HEX_RE.exec(hex.trim());
  if (m?.[1] === undefined) throw new Error(`Invalid hex color: "${hex}"`);
  const body = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return {
    r: Number.parseInt(body.slice(0, 2), 16),
    g: Number.parseInt(body.slice(2, 4), 16),
    b: Number.parseInt(body.slice(4, 6), 16),
  };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

/** Choose near-white or near-black text, whichever contrasts more with `luminance`. */
export function foregroundForLuminance(luminance: number): string {
  const lightRatio = contrastRatio(luminance, relativeLuminance(hslToRgb(parseHsl(LIGHT_FG))));
  const darkRatio = contrastRatio(luminance, relativeLuminance(hslToRgb(parseHsl(DARK_FG))));
  return darkRatio > lightRatio ? DARK_FG : LIGHT_FG;
}
