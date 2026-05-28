import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredValue, setStoredValue } from '../lib/storage';

type SetValue<T> = (next: T | ((prev: T) => T)) => void;

export function useWidgetStorage<T>(key: string, defaultValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(defaultValue);
  const isUserDirtyRef = useRef<boolean>(false);
  const lastWriteSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getStoredValue<T>(key, defaultValue).then((stored) => {
      if (cancelled || isUserDirtyRef.current) return;
      setValue(stored);
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (
        changes: { [k: string]: chrome.storage.StorageChange },
        area: chrome.storage.AreaName,
      ): void => {
        if (area !== 'local') return;
        if (!changes[key]) return;
        const newValue = changes[key].newValue as T | undefined;
        if (newValue === undefined) return;
        const serialized = JSON.stringify(newValue);
        if (serialized === lastWriteSerializedRef.current) {
          return;
        }
        setValue(newValue);
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
    isUserDirtyRef.current = true;
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      lastWriteSerializedRef.current = JSON.stringify(resolved);
      setStoredValue(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, persistedSetValue];
}
