// Per-widget data keys in chrome.storage.local that get orphaned when their
// owning widget is removed from `dashboardLinks`. Each prefix is followed by
// the widget's id. Keep this list in sync with the widgets that use
// `useWidgetStorage` to persist their own data.
const WIDGET_DATA_PREFIXES = [
  'todo-widget-',
  'timer-widget-',
  'reminders-widget-',
] as const;

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage;

/** Removes the data keys for a single widget id (no-op if they don't exist). */
export const removeWidgetDataForId = (id: string): void => {
  if (!hasChromeStorage()) return;
  chrome.storage.local.remove(WIDGET_DATA_PREFIXES.map((p) => p + id));
};

/**
 * Scans every `<prefix><id>` key in storage; removes any whose id is not in
 * `currentLinkIds`. Used at app boot to clean up data left behind by widgets
 * deleted in prior sessions (before this cleanup existed). Returns the count
 * removed.
 */
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
