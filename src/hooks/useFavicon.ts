import { useCallback, useMemo, useState } from 'react';
import { faviconCandidates } from '../lib/favicon';

/**
 * Resolves the favicon for a link, walking through the candidate sources
 * (`faviconCandidates`) and advancing to the next one whenever the current
 * `<img>` fails to load. Returns an empty `src` once every source is
 * exhausted so the caller can render a placeholder instead of a broken image.
 */
export const useFavicon = (item: { url?: string; favicon?: string }) => {
  const candidates = useMemo(
    () => faviconCandidates(item),
    // Recompute only when the inputs that affect the candidates change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.url, item.favicon],
  );

  const key = candidates.join('|');
  const [progress, setProgress] = useState({ key, index: 0 });
  // If the candidate set changed (e.g. the URL was edited), restart from the top.
  const index = progress.key === key ? progress.index : 0;

  const onError = useCallback(() => {
    setProgress((prev) => {
      const base = prev.key === key ? prev.index : 0;
      return { key, index: base + 1 };
    });
  }, [key]);

  return { src: candidates[index] ?? '', onError };
};
