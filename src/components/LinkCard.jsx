import React from 'react';
import { ExternalLink, X, Settings2 } from 'lucide-react';

const VIEW_MODES = ['icon', 'icon+text'];

const LinkCard = ({ item, onDelete, onViewModeChange, isEditing }) => {
  const { url, title, favicon, viewMode = 'icon+text' } = item;

  const nextViewMode = () => {
    const next = VIEW_MODES[(VIEW_MODES.indexOf(viewMode) + 1) % VIEW_MODES.length];
    onViewModeChange(item.id, next);
  };

  const getSiteName = (urlString) => {
    try {
      const hostname = new URL(urlString).hostname.replace(/^www\./, '');
      const name = hostname.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return title ? title.split(' - ')[0] : 'Link';
    }
  };

  const siteName = getSiteName(url);
  const isIconOnly = viewMode === 'icon' || item.w === 1;
  const isLarge = (item.w && item.w > 2) || (item.h && item.h > 1);

  return (
    <div className="group card-base relative w-full h-full overflow-hidden">

      {/* Action buttons */}
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          <button onClick={(e) => { e.preventDefault(); nextViewMode(); }} title="Toggle view mode" className="icon-btn shadow-sm">
            <Settings2 size={11} />
          </button>
          <button onClick={(e) => { e.preventDefault(); onDelete(item.id); }} title="Remove" className="icon-btn shadow-sm hover:!text-accent-danger hover:!border-accent-danger">
            <X size={11} />
          </button>
        </div>
      )}

      {/* Link */}
      <a
        href={url}
        target="_top"
        rel="noopener noreferrer"
        onClick={(e) => isEditing && e.preventDefault()}
        className={`flex w-full h-full text-inherit no-underline ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
          ${isIconOnly
            ? 'items-center justify-center p-0'
            : 'flex-row items-center justify-start gap-4 px-5 py-3'
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
          <div className="text-left flex flex-col justify-center flex-1 min-w-0 overflow-hidden">
            <h4 className={`m-0 text-sm font-medium text-ink dark:text-ink-dark truncate leading-tight ${isLarge ? 'mb-1' : ''}`}>
              {siteName}
            </h4>
            {isLarge && (
              <span className="text-2xs text-ink-secondary dark:text-ink-dark-secondary truncate block">
                {title}
              </span>
            )}
          </div>
        )}
      </a>
    </div>
  );
};

export default LinkCard;
