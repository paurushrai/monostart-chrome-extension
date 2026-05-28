import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredValue, setStoredValue } from '../lib/storage';

type SetValue<T> = (next: T | ((prev: T) => T)) => void;

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
