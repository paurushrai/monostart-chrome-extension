import { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings } from '../lib/storage';
import { normalizeAccentForContrast } from '../lib/color';
import type { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = { openInNewTab: false, themeMode: 'device', themeColor: '271 91% 65%' };

export interface UseTheme {
  settings: Settings;
  updateSettings: (next: Settings) => void;
}

export function useTheme(): UseTheme {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
  }, []);

  useEffect(() => {
    if (!settings) return;

    if (settings.themeColor) {
      const { accent, foreground } = normalizeAccentForContrast(settings.themeColor);
      document.documentElement.style.setProperty('--primary', accent);
      document.documentElement.style.setProperty('--ring', accent);
      document.documentElement.style.setProperty('--primary-foreground', foreground);

      const parts = settings.themeColor.split(' ');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        document.documentElement.style.setProperty('--theme-hue', parts[0]);
        const baseSat = parseInt(parts[1], 10);
        if (baseSat === 0) {
          document.documentElement.style.setProperty('--theme-sat', '0%');
        } else {
          const mode = settings.themeMode || 'device';
          const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.style.setProperty('--theme-sat', isDark ? '30%' : '40%');
        }
      }
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.style.removeProperty('--theme-hue');
      document.documentElement.style.removeProperty('--theme-sat');
    }

    const applyMode = (mode: Settings['themeMode'] | undefined): void => {
      const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const cs = getComputedStyle(document.body);
      document.documentElement.style.backgroundColor = cs.backgroundColor;
    };

    applyMode(settings.themeMode || 'device');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      if (settings.themeMode === 'device' || !settings.themeMode) {
        applyMode('device');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.themeMode, settings.themeColor]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  return { settings, updateSettings };
}
