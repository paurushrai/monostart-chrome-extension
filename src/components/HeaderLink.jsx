import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { MoreHorizontal, Trash2, FolderInput, Home, Folder, Edit2, Link2 } from 'lucide-react';

const HeaderLink = ({
  item,
  isEditing,
  openInNewTab,
  sections = [],
  onMoveLink,
  onDelete,
  onUpdateLink,
  draggedHeaderLinkId,
  dragOverHeaderLinkId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const siteName = item.customName || item.title || 'Link';
  const url = item.url;
  
  const getFaviconUrl = (linkUrl) => {
    if (!linkUrl) return '';
    try {
      return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(linkUrl)}&size=128`;
    } catch {
      return '';
    }
  };

  const favicon = getFaviconUrl(url) || item.favicon;

  const handleRename = (e) => {
    e.stopPropagation();
    const newName = prompt('Rename link:', siteName);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed) {
        onUpdateLink(item.id, { customName: trimmed });
      }
    }
    setIsMenuOpen(false);
  };

  const handleChangeUrl = (e) => {
    e.stopPropagation();
    const newUrl = prompt('Change URL:', url);
    if (newUrl !== null) {
      let trimmed = newUrl.trim();
      if (trimmed) {
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          trimmed = 'https://' + trimmed;
        }
        try {
          const newFavicon = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(trimmed)}&size=128`;
          onUpdateLink(item.id, { url: trimmed, favicon: newFavicon });
        } catch {
          onUpdateLink(item.id, { url: trimmed });
        }
      }
    }
    setIsMenuOpen(false);
  };

  const isDragging = draggedHeaderLinkId === item.id;
  const isDragOver = dragOverHeaderLinkId === item.id;

  return (
    <div
      className={`relative group rounded transition-all duration-150 flex items-center justify-center w-7 h-7
        ${isEditing ? 'cursor-grab active:cursor-grabbing hover:bg-secondary/70 border border-dashed border-border' : 'hover:bg-secondary/50'}
        ${isDragOver ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}
        ${isDragging ? 'opacity-30 scale-95' : ''}
      `}
      draggable={isEditing}
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDrop={() => onDrop(item.id)}
      onDragEnd={onDragEnd}
      title={siteName}
    >
      <a
        href={url}
        target={openInNewTab ? "_blank" : "_top"}
        rel="noopener noreferrer"
        draggable={false}
        onClick={(e) => isEditing && e.preventDefault()}
        className="flex items-center justify-center w-full h-full select-none"
      >
        {favicon ? (
          <img
            src={favicon}
            alt=""
            draggable={false}
            className="w-4 h-4 object-contain pointer-events-none"
          />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground w-4 h-4 pointer-events-none">
            <Link2 size={12} />
          </div>
        )}
      </a>

      {isEditing && (
        <div 
          className={`absolute top-0 right-0 z-30 -translate-y-[30%] translate-x-[30%] transition-all duration-200 flex items-center
            ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Options"
                className="h-5 w-5 rounded-full bg-background shadow-md border border-border hover:bg-secondary flex items-center justify-center transition-transform active:scale-95"
              >
                <MoreHorizontal size={10} className="text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48" onMouseDown={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={handleRename}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Edit2 size={13} className="text-muted-foreground" />
                <span>Rename</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleChangeUrl}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Link2 size={13} className="text-muted-foreground" />
                <span>Change URL</span>
              </DropdownMenuItem>

              {onMoveLink && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <FolderInput size={13} className="text-muted-foreground" />
                    <span>Move to...</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-44" onMouseDown={(e) => e.stopPropagation()}>
                      <DropdownMenuItem 
                        onClick={() => {
                          onMoveLink(item.id, null);
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Home size={13} className="text-muted-foreground" />
                        <span>Main Dashboard</span>
                      </DropdownMenuItem>
                      {sections.map(s => (
                        <DropdownMenuItem 
                          key={s.id} 
                          onClick={() => {
                            onMoveLink(item.id, s.id);
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Folder size={13} className="text-muted-foreground" />
                          <span className="truncate">{s.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  onDelete(item.id);
                  setIsMenuOpen(false);
                }}
                className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 flex items-center gap-2"
              >
                <Trash2 size={13} />
                <span>Delete Link</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default HeaderLink;
