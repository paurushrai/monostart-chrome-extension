import React from 'react';
import { ExternalLink, X, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

const VIEW_MODES = ['icon', 'icon+text'];

const LinkCard = ({ item, onDelete, onViewModeChange, onUpdateLink, isEditing, openInNewTab }) => {
  const { url, title, favicon, viewMode = 'icon+text', customName } = item;

  const nextViewMode = () => {
    const next = VIEW_MODES[(VIEW_MODES.indexOf(viewMode) + 1) % VIEW_MODES.length];
    onViewModeChange(item.id, next);
  };

  const getSiteName = (urlString) => {
    try {
      const hostname = new URL(urlString).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      let name = parts[0];
      if (parts.length >= 3 && ['app', 'docs', 'blog', 'mail', 'm', 'web', 'my', 'api', 'dev', 'shop'].includes(name.toLowerCase())) {
        name = parts[1];
      }
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return title ? title.split(' - ')[0] : 'Link';
    }
  };

  const siteName = customName || getSiteName(url);
  const isIconOnly = viewMode === 'icon' || item.w === 1;
  const isLarge = (item.w && item.w > 2) || (item.h && item.h > 1);

  const handleNameBlur = (e) => {
    const newName = e.target.innerText.trim();
    if (newName && newName !== siteName) {
      onUpdateLink(item.id, { customName: newName });
    }
  };

  const handleDescBlur = (e) => {
    const newDesc = e.target.innerText.trim();
    if (newDesc !== title) {
      onUpdateLink(item.id, { title: newDesc });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div className="group card-base relative w-full h-full overflow-hidden">

      {/* Action buttons */}
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); nextViewMode(); }} title="Toggle view mode" className="h-6 w-6 rounded-full bg-background/70 backdrop-blur-md shadow-sm border border-border">
            <Settings2 size={12} />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); onDelete(item.id); }} title="Remove" className="h-6 w-6 rounded-full bg-background/70 backdrop-blur-md shadow-sm border border-border hover:text-red-500 hover:border-red-500">
            <X size={12} />
          </Button>
        </div>
      )}

      {/* Link */}
      <a
        href={url}
        target={openInNewTab ? "_blank" : "_top"}
        rel="noopener noreferrer"
        draggable={false}
        onClick={(e) => isEditing && e.preventDefault()}
        className={`flex w-full h-full text-inherit no-underline ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}
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
            draggable={false}
            className={`object-contain rounded-lg flex-shrink-0 pointer-events-none
              ${isIconOnly ? 'w-12 h-12 rounded-xl' : 'w-8 h-8'}`}
          />
        ) : (
          <div className={`flex items-center justify-center rounded-lg bg-secondary text-muted-foreground flex-shrink-0 pointer-events-none
            ${isIconOnly ? 'w-12 h-12 rounded-xl' : 'w-8 h-8'}`}>
            <ExternalLink size={isIconOnly ? 24 : 18} />
          </div>
        )}

        {/* Text content */}
        {!isIconOnly && (
          <div className="text-left flex flex-col justify-center flex-1 min-w-0 overflow-hidden">
            <h4
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => isEditing && e.stopPropagation()}
              className={`m-0 text-sm font-medium text-foreground truncate leading-tight ${isLarge ? 'mb-1' : ''} ${isEditing ? 'cursor-text outline-none hover:bg-secondary focus:bg-secondary rounded px-1 -ml-1 transition-colors' : ''}`}
            >
              {siteName}
            </h4>
            {isLarge && (
              <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={handleDescBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={(e) => isEditing && e.stopPropagation()}
                className={`text-2xs text-muted-foreground truncate block ${isEditing ? 'cursor-text outline-none hover:bg-secondary focus:bg-secondary rounded px-1 -ml-1 mt-1 transition-colors' : ''}`}
              >
                {title}
              </span>
            )}
          </div>
        )}

        {/* Glassmorphism Hover Overlay for Icon Only Mode */}
        {isIconOnly && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center p-2 z-10 pointer-events-none">
            <span className="text-xs font-semibold text-foreground text-center truncate w-full drop-shadow-sm">
              {siteName}
            </span>
          </div>
        )}
      </a>
    </div>
  );
};

export default LinkCard;
