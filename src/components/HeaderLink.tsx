import { useState, type DragEvent, type MouseEvent } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { MoreHorizontal, Trash2, FolderInput, Home, Folder, Edit2, Link2, Eye, Image as ImageIcon, Type, Check } from 'lucide-react';
import { siteFaviconUrl } from '../lib/favicon';
import Favicon from './Favicon';
import type { LinkItem, GridSlot } from '../types';

interface GroupRef {
  id: string;
  title: string;
}

interface Props {
  item: LinkItem;
  isEditing: boolean;
  openInNewTab?: boolean;
  groups?: GroupRef[];
  onMoveItem?: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  onDelete: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<LinkItem>) => void;
  draggedHeaderLinkId: string | null;
  dragOverHeaderLinkId: string | null;
  onDragStart: (id: string, e: DragEvent) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

const HeaderLink = ({
  item,
  isEditing,
  openInNewTab,
  groups = [],
  onMoveItem,
  onDelete,
  onUpdateItem,
  draggedHeaderLinkId,
  dragOverHeaderLinkId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Readonly<Props>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const siteName = item.customName || item.title || 'Link';
  const url = item.url;

  const showAsText = item.viewMode === 'text';

  const handleRename = (e: MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('Rename link:', siteName);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed) {
        onUpdateItem(item.id, { customName: trimmed });
      }
    }
    setIsMenuOpen(false);
  };

  const handleChangeUrl = (e: MouseEvent) => {
    e.stopPropagation();
    const newUrl = prompt('Change URL:', url);
    if (newUrl !== null) {
      let trimmed = newUrl.trim();
      if (trimmed) {
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          trimmed = 'https://' + trimmed;
        }
        onUpdateItem(item.id, { url: trimmed, favicon: siteFaviconUrl(trimmed) });
      }
    }
    setIsMenuOpen(false);
  };

  const isDragging = draggedHeaderLinkId === item.id;
  const isDragOver = dragOverHeaderLinkId === item.id;

  let linkContent: React.ReactNode;
  if (showAsText) {
    linkContent = (
      <span className="text-xs font-medium text-foreground truncate pointer-events-none px-0.5">
        {siteName}
      </span>
    );
  } else {
    linkContent = (
      <Favicon
        item={item}
        className="w-5 h-5 object-contain rounded-[3px] pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_1px_3px_rgba(255,255,255,0.2)]"
        fallback={
          <div className="flex items-center justify-center text-muted-foreground w-5 h-5 pointer-events-none">
            <Link2 size={14} />
          </div>
        }
      />
    );
  }

  return (
    <li
      className={`relative group rounded transition-all duration-150 flex items-center justify-center h-7
        ${showAsText ? 'min-w-[40px] max-w-[160px] px-2' : 'w-7'}
        ${isEditing ? 'cursor-grab active:cursor-grabbing hover:bg-secondary/70 border border-dashed border-border' : 'hover:bg-secondary/50'}
        ${isDragOver ? 'ring-2 ring-primary' : ''}
        ${isDragging ? 'opacity-30 scale-95' : ''}
      `}
      draggable={isEditing}
      onDragStart={(e) => onDragStart(item.id, e)}
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
        className="flex items-center justify-center w-full h-full select-none rounded outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      >
        {linkContent}
      </a>

      {isEditing && (
        <div 
          role="toolbar"
          aria-label="Link actions"
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

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Eye size={13} className="text-muted-foreground" />
                  <span>Show as</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-36" onMouseDown={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={() => {
                        onUpdateItem(item.id, { viewMode: 'icon' });
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon size={13} className="text-muted-foreground" />
                        <span>Icon</span>
                      </div>
                      {!showAsText && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onUpdateItem(item.id, { viewMode: 'text' });
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Type size={13} className="text-muted-foreground" />
                        <span>Text</span>
                      </div>
                      {showAsText && <Check size={13} className="text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {onMoveItem && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2">
                    <FolderInput size={13} className="text-muted-foreground" />
                    <span>Move to...</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-44" onMouseDown={(e) => e.stopPropagation()}>
                      <DropdownMenuItem 
                        onClick={() => {
                          onMoveItem(item.id, null);
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Home size={13} className="text-muted-foreground" />
                        <span>Main Dashboard</span>
                      </DropdownMenuItem>
                      {groups.map(s => (
                        <DropdownMenuItem 
                          key={s.id} 
                          onClick={() => {
                            onMoveItem(item.id, s.id);
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
    </li>
  );
};

export default HeaderLink;
