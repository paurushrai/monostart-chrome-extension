import { useState, useEffect } from 'react';
import { isIdbRef } from '../lib/imageRef';
import { getObjectUrl } from '../lib/imageStore';

export type ImageSrcStatus = 'resolved' | 'loading' | 'error';

export interface ImageSrcState {
  src: string;
  status: ImageSrcStatus;
}

// Resolve a stored image value to a usable src. `idb:` refs load from
// IndexedDB; every other value (data:, http(s):, blank) passes through
// synchronously, preserving today's behavior.
export const useImageSrc = (value: string | undefined): ImageSrcState => {
  const [state, setState] = useState<ImageSrcState>(() =>
    isIdbRef(value)
      ? { src: '', status: 'loading' }
      : { src: value ?? '', status: 'resolved' },
  );

  useEffect(() => {
    if (!isIdbRef(value)) {
      setState({ src: value ?? '', status: 'resolved' });
      return;
    }
    let cancelled = false;
    setState({ src: '', status: 'loading' });
    getObjectUrl(value)
      .then((url) => {
        if (!cancelled) setState({ src: url, status: 'resolved' });
      })
      .catch(() => {
        if (!cancelled) setState({ src: '', status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return state;
};
