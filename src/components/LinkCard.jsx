import React from 'react';
import { ExternalLink, X, Settings2 } from 'lucide-react';

const VIEW_MODES = ['icon', 'icon+text'];

const LinkCard = ({ item, onDelete, onViewModeChange }) => {
  const { url, title, favicon, viewMode = 'icon+text' } = item;

  const getDomain = (url) => {
    try { return new URL(url).hostname; }
    catch { return url; }
  };

  const nextViewMode = () => {
    const next = VIEW_MODES[(VIEW_MODES.indexOf(viewMode) + 1) % VIEW_MODES.length];
    onViewModeChange(item.id, next);
  };

  const isIconOnly = viewMode === 'icon';

  return (
    <div className="group card-base relative w-full h-full overflow-hidden">

      {/* Action buttons — visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast z-10">
        <button onClick={nextViewMode} title="Toggle view mode" className="icon-btn">
          <Settings2 size={11} />
        </button>
        <button onClick={() => onDelete(item.id)} title="Remove" className="icon-btn hover:!text-accent-danger hover:!border-accent-danger">
          <X size={11} />
        </button>
      </div>

      {/* Link */}
      <a
        href={url}
        target="_top"
        rel="noopener noreferrer"
        className={`flex w-full h-full text-inherit no-underline
          ${isIconOnly
            ? 'items-center justify-center p-0'
            : 'flex-col items-center justify-center gap-3 p-4'
          }`}
      >
        {/* Favicon */}
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className={`object-contain rounded-lg flex-shrink-0
              ${isIconOnly ? 'w-12 h-12 rounded-xl' : 'w-8 h-8'}`}
          />
        ) : (
          <div className={`flex items-center justify-center rounded-lg bg-bg-hover dark:bg-dark-bg-hover text-ink-secondary dark:text-ink-dark-secondary flex-shrink-0
            ${isIconOnly ? 'w-12 h-12 rounded-xl' : 'w-8 h-8'}`}>
            <ExternalLink size={isIconOnly ? 24 : 18} />
          </div>
        )}

        {/* Text content */}
        {!isIconOnly && (
          <div className="text-center w-full min-w-0">
            <h4 className="m-0 mb-1 text-sm font-medium text-ink dark:text-ink-dark truncate">
              {title}
            </h4>
            <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate block">
              {getDomain(url)}
            </span>
          </div>
        )}
      </a>
    </div>
  );
};

export default LinkCard;
