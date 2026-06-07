import { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings } from '../lib/storage';
import {
  normalizeAccentForContrast,
  foregroundForLuminance,
  parseHsl,
  snapHslToIntegerRgb,
} from '../lib/color';
import { deriveBackgroundTheme } from '../lib/backgroundTheme';
import { migrateLegacySeed } from '../lib/chromeThemes';
import type { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = { openInNewTab: false, themeMode: 'device', themeColor: '0 0% 30%' };

const DARK_TINT_SAT = '30%';
const LIGHT_TINT_SAT = '40%';
/* Mirrors the --background lightness ladder + --surface-shift in index.css. */
const BG_LIGHTNESS_DARK = 10;
const BG_LIGHTNESS_LIGHT = 94;
const SHIFT_DIVISOR = 6;
const SHIFT_CLAMP = 4;
const LIGHT_HEADER_FG = '0 0% 98%';
const SHADOW_FOR_LIGHT_TEXT = 'rgba(0,0,0,0.5)';
const SHADOW_FOR_DARK_TEXT = 'rgba(255,255,255,0.6)';

export interface UseTheme {
  settings: Settings;
  updateSettings: (next: Settings) => void;
}

const prefersDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveIsDark = (mode: Settings['themeMode'] | undefined): boolean =>
  mode === 'dark' || ((mode ?? 'device') === 'device' && prefersDark());

const applyAccent = (accentHsl: string, isDark: boolean): void => {
  const { style } = document.documentElement;
  const { accent, foreground } = normalizeAccentForContrast(accentHsl);
  const { h, s, l } = parseHsl(accent);
  let themeSat = LIGHT_TINT_SAT;
  if (s === 0) themeSat = '0%';
  else if (isDark) themeSat = DARK_TINT_SAT;
  style.setProperty('--primary', accent);
  style.setProperty('--ring', accent);
  style.setProperty('--primary-foreground', foreground);
  style.setProperty('--theme-hue', String(h));
  style.setProperty('--theme-sat', themeSat);
  // Seed lightness + achromatic flag drive the surface-lightness shift for
  // grey seeds (see index.css --surface-shift).
  style.setProperty('--theme-lum', `${l}%`);
  style.setProperty('--theme-sat-factor', s === 0 ? '0' : '1');

  // The dashboard background must land on exact integer sRGB channels:
  // fractional values (e.g. hsl(214 30% 10%) → rgb 17.85, 23.46, 33.15)
  // quantize differently between rasterization passes when Chrome converts
  // to wide-gamut display profiles, splitting large surfaces into two
  // near-identical shades. Compute the same color the CSS calc would and
  // snap it (see snapHslToIntegerRgb).
  const shift = s === 0 ? Math.max(-SHIFT_CLAMP, Math.min(SHIFT_CLAMP, (l - 50) / SHIFT_DIVISOR)) : 0;
  const bgLightness = (isDark ? BG_LIGHTNESS_DARK : BG_LIGHTNESS_LIGHT) + shift;
  const bgSat = parseFloat(themeSat);
  style.setProperty('--background', snapHslToIntegerRgb(`${h} ${bgSat}% ${bgLightness}%`));
};

const clearAccent = (): void => {
  const { style } = document.documentElement;
  for (const prop of [
    '--primary',
    '--ring',
    '--primary-foreground',
    '--theme-hue',
    '--theme-sat',
    '--theme-lum',
    '--theme-sat-factor',
    '--background',
  ]) {
    style.removeProperty(prop);
  }
};

const applyHeaderForeground = (luminance: number): void => {
  const { style } = document.documentElement;
  const fg = foregroundForLuminance(luminance);
  const isLightText = fg === LIGHT_HEADER_FG;
  style.setProperty('--header-fg', `hsl(${fg})`);
  style.setProperty('--header-shadow', isLightText ? SHADOW_FOR_LIGHT_TEXT : SHADOW_FOR_DARK_TEXT);
};

const clearHeaderForeground = (): void => {
  const { style } = document.documentElement;
  style.removeProperty('--header-fg');
  style.removeProperty('--header-shadow');
};

export function useTheme(): UseTheme {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then((s) => {
      const migratedColor = migrateLegacySeed(s.themeColor) ?? DEFAULT_SETTINGS.themeColor;
      const next = { ...DEFAULT_SETTINGS, ...s, themeColor: migratedColor };
      setSettings(next);
      // Persist legacy-seed migrations so theme-init.js paints the right
      // pre-React frame on every subsequent load.
      if (migratedColor !== s.themeColor) saveSettings(next);
    });
  }, []);

  // Light/dark class + root background colour (kept in sync with the device).
  useEffect(() => {
    // html's background comes from the `html { @apply bg-background }` rule —
    // never snapshot a computed color onto it here: an inline copy goes stale
    // when the theme color changes (it only re-ran on mode changes), leaving
    // the previous theme visible wherever html shows through.
    const applyMode = (): void => {
      document.documentElement.classList.toggle('dark', resolveIsDark(settings.themeMode));
    };
    applyMode();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      if ((settings.themeMode ?? 'device') === 'device') applyMode();
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.themeMode]);

  // Accent + header foreground. When a background is set the accent is derived
  // from the wallpaper (Material You style); otherwise the user's picked accent
  // is used and the header falls back to the theme foreground.
  const bgType = settings.background?.type;
  const bgValue = settings.background?.value;
  const bgDim = settings.background?.dim;
  useEffect(() => {
    let cancelled = false;
    const isDark = resolveIsDark(settings.themeMode);
    const run = async (): Promise<void> => {
      const derived = await deriveBackgroundTheme(settings.background ?? { type: 'none' });
      if (cancelled) return;
      if (derived) {
        applyAccent(derived.accent, isDark);
        applyHeaderForeground(derived.luminance);
      } else if (settings.themeColor) {
        applyAccent(settings.themeColor, isDark);
        clearHeaderForeground();
      } else {
        clearAccent();
        clearHeaderForeground();
      }
    };
    void run();
    return () => { cancelled = true; };
    // settings.background is read above but tracked via its primitive fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.themeMode, settings.themeColor, bgType, bgValue, bgDim]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, updateSettings };
}
