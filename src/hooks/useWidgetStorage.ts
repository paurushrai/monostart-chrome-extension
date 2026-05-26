import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredValue, setStoredValue } from '../lib/storage';

/** Setter function with the same shape as React's `Dispatch<SetStateAction<T>>`. */
type SetValue<T> = (next: T | ((prev: T) => T)) => void;

/**
 * Persistent per-widget state. Reads from the storage adapter on mount,
 * writes through every update. Same `[value, setValue]` shape as useState
 * so callers don't need to know storage exists.
 *
 *   const [todos, setTodos] = useWidgetStorage(`todo-widget-${id}`, []);
 *
 * Skips the initial write so we don't clobber persisted data with the default.
 */
export function useWidgetStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(defaultValue);
  const isLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    getStoredValue<T>(key, defaultValue).then((stored) => {
      if (cancelled) return;
      setValue(stored);
      isLoadedRef.current = true;
    });

    // Subscribe to writes from other contexts (notably the SW advancing
    // dueAt / lastFiredAt on recurring reminders). Without this, widget UI
    // is stale until reload.
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (
        changes: { [k: string]: chrome.storage.StorageChange },
        area: chrome.storage.AreaName,
      ): void => {
        if (area !== 'local') return;
        if (!changes[key]) return;
        const newValue = changes[key].newValue as T | undefined;
        if (newValue !== undefined) setValue(newValue);
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        cancelled = true;
        chrome.storage.onChanged.removeListener(listener);
      };
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persistedSetValue = useCallback<SetValue<T>>((next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      if (isLoadedRef.current) {
        setStoredValue(key, resolved);
      }
      return resolved;
    });
  }, [key]);

  return [value, persistedSetValue];
}
