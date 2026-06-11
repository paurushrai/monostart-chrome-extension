import { useState } from 'react';
import MonoStartLogo from './MonoStartLogo';

/**
 * Logo with the product name and author byline tucked behind it.
 * Hovering the logo slides the text out; it stays out while the cursor
 * remains over the branding block, then slides back behind the logo.
 * Keyboard focus on the byline link (:focus-visible) also reveals it.
 */
export default function HeaderBranding() {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div
      className="flex items-center w-fit"
      onMouseLeave={() => setIsRevealed(false)}
    >
      <div className="shrink-0 flex" onMouseEnter={() => setIsRevealed(true)}>
        <MonoStartLogo size={36} />
      </div>
      <div className="overflow-hidden">
        <div
          className={`flex flex-col pl-2 whitespace-nowrap transition duration-300 ease-out has-[:focus-visible]:translate-x-0 has-[:focus-visible]:opacity-100 ${
            isRevealed ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          }`}
        >
          <h1 className="text-base font-bold tracking-tight leading-none m-0">
            MonoStart
          </h1>
          <span className="text-[10px] font-medium opacity-60 mt-0.5">
            by{' '}
            <a
              href="https://www.paurushrai.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:opacity-100 transition-all"
            >
              Paurush Rai
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
