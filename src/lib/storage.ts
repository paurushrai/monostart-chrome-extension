import type { WidgetItem, Settings } from '../types';

const LINKS_KEY = 'dashboardLinks';
const SETTINGS_KEY = 'dashboardSettings';

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage;

export const getItemsSync = (): WidgetItem[] => {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    return raw ? (JSON.parse(raw) as WidgetItem[]) : [];
  } catch {
    return [];
  }
};

export const getItems = async (): Promise<WidgetItem[]> => {
  if (hasChromeStorage()) {
    return new Promise<WidgetItem[]>((resolve) => {
      chrome.storage.local.get([LINKS_KEY], (result) => {
        resolve((result[LINKS_KEY] as WidgetItem[] | undefined) ?? []);
      });
    });
  }
  return getItemsSync();
};

export const saveItems = async (links: readonly WidgetItem[]): Promise<void> => {
  try { localStorage.setItem(LINKS_KEY, JSON.stringify(links)); } catch { /* empty */ }

  if (hasChromeStorage()) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [LINKS_KEY]: links }, () => resolve());
    });
  }
};

const DEFAULT_SETTINGS: Settings = { openInNewTab: false };

export const getSettings = async (): Promise<Settings> => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch { /* empty */ }

  if (hasChromeStorage()) {
    return new Promise<Settings>((resolve) => {
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = (result[SETTINGS_KEY] as Settings | undefined) ?? DEFAULT_SETTINGS;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* empty */ }
        resolve(settings);
      });
    });
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* empty */ }
};

export const getStoredValue = async <T>(key: string, defaultValue: T): Promise<T> => {
  if (hasChromeStorage()) {
    return new Promise<T>((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] as T | undefined) ?? defaultValue);
      });
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStoredValue = async <T>(key: string, value: T): Promise<void> => {
  if (hasChromeStorage()) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* empty */ }
};
