// Storage adapter. Single concern: persist/retrieve key-value blobs.
// `dashboardLinks` uses chrome.storage.local (large, cross-page sync).
// `dashboardSettings` uses localStorage (small, sync — needed for first-paint theme).
//
// Trust-at-boundary: reads cast to the expected type. We do not validate the
// shape at the storage boundary (single-user, locally controlled data). If we
// ever add cloud sync or multi-device, revisit and add runtime validation.

import type { LinkItem, Settings } from '../types';

const LINKS_KEY = 'dashboardLinks';
const SETTINGS_KEY = 'dashboardSettings';

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage;

export const getLinks = async (): Promise<LinkItem[]> => {
  if (hasChromeStorage()) {
    return new Promise<LinkItem[]>((resolve) => {
      chrome.storage.local.get([LINKS_KEY], (result) => {
        resolve((result[LINKS_KEY] as LinkItem[] | undefined) ?? []);
      });
    });
  }
  const local = localStorage.getItem(LINKS_KEY);
  return local ? (JSON.parse(local) as LinkItem[]) : [];
};

export const saveLinks = async (links: readonly LinkItem[]): Promise<void> => {
  if (hasChromeStorage()) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [LINKS_KEY]: links }, () => resolve());
    });
  }
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
};

const DEFAULT_SETTINGS: Settings = { openInNewTab: false };

export const getSettings = async (): Promise<Settings> => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch { /* fall through */ }

  // One-time migration from chrome.storage for installs that predate the localStorage switch
  if (hasChromeStorage()) {
    return new Promise<Settings>((resolve) => {
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = (result[SETTINGS_KEY] as Settings | undefined) ?? DEFAULT_SETTINGS;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
        resolve(settings);
      });
    });
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
};

// Generic per-widget storage: chrome.storage when available (cross-page sync),
// localStorage fallback for dev / non-extension contexts. Generic over the
// stored value type so callers like `useWidgetStorage<TodoEntry[]>` flow types
// through without casts.
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
  } catch { /* ignore */ }
};
