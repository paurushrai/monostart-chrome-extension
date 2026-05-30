import type { ReactNode } from 'react';
import { useFavicon } from '../hooks/useFavicon';

interface Props {
  item: { url?: string; favicon?: string };
  className?: string;
  /** Rendered when no favicon source resolves (all candidates failed). */
  fallback: ReactNode;
}

/**
 * Renders a link's favicon with an automatic source fallback chain
 * (see `useFavicon`). Never shows a broken image — when every source fails,
 * it renders `fallback` instead.
 */
const Favicon = ({ item, className, fallback }: Readonly<Props>) => {
  const { src, onError } = useFavicon(item);
  if (!src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={onError}
      className={className}
    />
  );
};

export default Favicon;
