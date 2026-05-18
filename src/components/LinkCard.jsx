import React from 'react';
import { ExternalLink, X, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";

const VIEW_MODES = ['icon', 'icon+text'];

const LinkCard = ({
  item,
  onDelete,
  onViewModeChange,
  onUpdateLink,
  isEditing,
  openInNewTab,
  sections = [],
  onMoveLink,
  parentId
}) => {
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
    <div className={`group card-base relative w-full h-full ${!isEditing ? 'overflow-hidden' : ''}`}>

      {/* Action buttons */}
      {isEditing && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Settings"
                className="h-6 w-6 rounded-full bg-background shadow-md border border-border hover:bg-secondary"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Settings2 size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onMouseDown={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.preventDefault(); nextViewMode(); }}>
                Toggle view mode
              </DropdownMenuItem>
              
              {onMoveLink && (sections.length > 0 || parentId) && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Move to...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent onMouseDown={(e) => e.stopPropagation()}>
                      {parentId && (
                        <DropdownMenuItem onClick={() => onMoveLink(item.id, null)}>
                          Main Dashboard
                        </DropdownMenuItem>
                      )}
                      {sections
                        .filter(s => s.id !== parentId)
                        .map(s => (
                          <DropdownMenuItem key={s.id} onClick={() => onMoveLink(item.id, s.id)}>
                            {s.title}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); onDelete(item.id); }}
                className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                Delete Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <a
        href={url}
        target={openInNewTab ? "_blank" : "_top"}
        rel="noopener noreferrer"
        draggable={false}
        onClick={(e) => isEditing && e.preventDefault()}
        className={`flex w-full h-full text-inherit no-underline ${isEditing ? (parentId ? 'inner-drag-handle' : 'drag-handle') + ' cursor-grab active:cursor-grabbing' : ''}
          ${isIconOnly
            ? 'items-center justify-center p-0'
            : `flex-row items-center justify-start gap-3 pl-4 py-2 ${isEditing ? 'pr-9' : 'pr-4'}`
          }`}
      >
        {/* Favicon */}
        {favicon ? (
          <img
            src={favicon}
            alt=""
            draggable={false}
            className={`object-contain flex-shrink-0 pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_1px_3px_rgba(255,255,255,0.2)]
              ${isIconOnly ? 'w-9 h-9 rounded-lg' : 'w-8 h-8 rounded-lg'}`}
          />
        ) : (
          <div className={`flex items-center justify-center rounded-lg bg-secondary text-muted-foreground flex-shrink-0 pointer-events-none
            ${isIconOnly ? 'w-9 h-9' : 'w-8 h-8'}`}>
            <ExternalLink size={isIconOnly ? 20 : 18} />
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
        {isIconOnly && !isEditing && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center p-2 z-10 pointer-events-none">
            <span className="text-2xs font-semibold text-foreground text-center truncate w-full drop-shadow-sm">
              {siteName}
            </span>
          </div>
        )}
      </a>
    </div>
  );
};

export default LinkCard;
