// Storage adapter. Single concern: persist/retrieve key-value blobs.
// `dashboardLinks` uses chrome.storage.local (large, cross-page sync).
// `dashboardSettings` uses localStorage (small, sync — needed for first-paint theme).

const LINKS_KEY = 'dashboardLinks';
const SETTINGS_KEY = 'dashboardSettings';

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome.storage;

export const getLinks = async () => {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([LINKS_KEY], (result) => {
        resolve(result[LINKS_KEY] || []);
      });
    });
  }
  const local = localStorage.getItem(LINKS_KEY);
  return local ? JSON.parse(local) : [];
};

export const saveLinks = async (links) => {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [LINKS_KEY]: links }, () => resolve());
    });
  }
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
};

const DEFAULT_SETTINGS = { openInNewTab: false };

export const getSettings = async () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through */ }

  // One-time migration from chrome.storage for installs that predate the localStorage switch
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
        resolve(settings);
      });
    });
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) { /* ignore */ }
};

// Generic per-widget storage: chrome.storage when available (cross-page sync),
// localStorage fallback for dev / non-extension contexts.
export const getStoredValue = async (key, defaultValue) => {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? defaultValue);
      });
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const setStoredValue = async (key, value) => {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* ignore */ }
};
