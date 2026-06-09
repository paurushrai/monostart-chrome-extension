import type { DashboardBackground } from '../types';
import { hexToRgb, rgbToHsl, relativeLuminance, type Rgb } from './color';
import { isIdbRef } from './imageRef';
import { getObjectUrl } from './imageStore';

export interface BackgroundTheme {
  /** Vivid accent HSL ("H S% L%") derived from the background's dominant hue. */
  accent: string;
  /** Effective relative luminance (0..1) after the dim overlay is applied. */
  luminance: number;
}

const HEX_IN_STRING = /#[0-9a-f]{3,6}/gi;
const ACCENT_MIN_SAT = 45;
const ACCENT_MAX_SAT = 90;
const ACCENT_LIGHTNESS = 50;
const IMAGE_SAMPLE_SIZE = 16;

function averageRgb(colors: readonly Rgb[]): Rgb {
  const sum = colors.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 },
  );
  const n = colors.length;
  return { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
}

function vividAccent(rgb: Rgb): string {
  const { h, s } = rgbToHsl(rgb);
  const sat = Math.min(ACCENT_MAX_SAT, Math.max(ACCENT_MIN_SAT, s));
  return `${h} ${sat}% ${ACCENT_LIGHTNESS}%`;
}

function themeFromRgb(rgb: Rgb, dim: number): BackgroundTheme {
  return { accent: vividAccent(rgb), luminance: relativeLuminance(rgb) * (1 - dim) };
}

async function sampleImageRgb(url: string): Promise<Rgb | null> {
  return new Promise<Rgb | null>((resolve) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = IMAGE_SAMPLE_SIZE;
        canvas.height = IMAGE_SAMPLE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, IMAGE_SAMPLE_SIZE, IMAGE_SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, IMAGE_SAMPLE_SIZE, IMAGE_SAMPLE_SIZE);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i + 2 < data.length; i += 4) {
          r += data[i] ?? 0;
          g += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
          count += 1;
        }
        resolve(count === 0 ? null : { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
      } catch {
        resolve(null); // tainted canvas (cross-origin image without CORS) — fall back
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Derive a wallpaper accent + luminance from the dashboard background. Returns
 * null when there is no background (or it can't be read), so callers fall back
 * to the user's picked accent and the default header treatment.
 */
export async function deriveBackgroundTheme(bg: DashboardBackground): Promise<BackgroundTheme | null> {
  const dim = bg.dim ?? 0;

  if (bg.type === 'color' && bg.value) {
    try { return themeFromRgb(hexToRgb(bg.value), dim); } catch { return null; }
  }

  if (bg.type === 'gradient' && bg.value) {
    const hexes = bg.value.match(HEX_IN_STRING) ?? [];
    const rgbs: Rgb[] = [];
    for (const hex of hexes) {
      try { rgbs.push(hexToRgb(hex)); } catch { /* skip unparseable stop */ }
    }
    return rgbs.length === 0 ? null : themeFromRgb(averageRgb(rgbs), dim);
  }

  if (bg.type === 'image' && bg.value) {
    let src: string;
    if (isIdbRef(bg.value)) {
      try { src = await getObjectUrl(bg.value); } catch { return null; }
    } else {
      src = bg.value;
    }
    const rgb = await sampleImageRgb(src);
    return rgb === null ? null : themeFromRgb(rgb, dim);
  }

  return null;
}
