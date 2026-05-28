const WIDGET_DATA_PREFIXES = [
  'todo-widget-',
  'timer-widget-',
  'reminders-widget-',
] as const;

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage;

export const removeWidgetDataForId = (id: string): void => {
  if (!hasChromeStorage()) return;
  chrome.storage.local.remove(WIDGET_DATA_PREFIXES.map((p) => p + id));
};

export const cleanupOrphanedWidgetData = (currentLinkIds: ReadonlySet<string>): Promise<number> => {
  if (!hasChromeStorage()) return Promise.resolve(0);
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (all) => {
      const orphans: string[] = [];
      for (const key of Object.keys(all)) {
        for (const prefix of WIDGET_DATA_PREFIXES) {
          if (key.startsWith(prefix)) {
            const id = key.slice(prefix.length);
            if (!currentLinkIds.has(id)) orphans.push(key);
            break;
          }
        }
      }
      if (orphans.length === 0) {
        resolve(0);
        return;
      }
      chrome.storage.local.remove(orphans, () => resolve(orphans.length));
    });
  });
};
