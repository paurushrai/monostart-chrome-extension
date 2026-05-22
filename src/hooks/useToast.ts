import { useState, useEffect, useCallback } from 'react';

export interface UseToast {
  toast: string | null;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

export function useToast(durationMs: number = 3500): UseToast {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(t);
  }, [toast, durationMs]);

  const showToast = useCallback((message: string) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
