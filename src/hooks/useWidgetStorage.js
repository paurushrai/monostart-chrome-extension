import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredValue, setStoredValue } from '../lib/storage';

/**
 * Persistent per-widget state. Reads from the storage adapter on mount,
 * writes through every update. Same `[value, setValue]` shape as useState
 * so callers don't need to know storage exists.
 *
 *   const [todos, setTodos] = useWidgetStorage(`todo-widget-${id}`, []);
 *
 * Skips the initial write so we don't clobber persisted data with the default.
 */
export function useWidgetStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    getStoredValue(key, defaultValue).then((stored) => {
      if (cancelled) return;
      setValue(stored);
      isLoadedRef.current = true;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persistedSetValue = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (isLoadedRef.current) {
        setStoredValue(key, resolved);
      }
      return resolved;
    });
  }, [key]);

  return [value, persistedSetValue];
}
