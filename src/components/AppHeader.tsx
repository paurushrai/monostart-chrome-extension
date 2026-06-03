import HeaderLink from './HeaderLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Hexagon, Edit2, Check, Settings, Link as LinkIcon, Palette, AppWindow, LayoutGrid, Trash2 } from 'lucide-react';
import type { WidgetItem, LinkItem, GroupItem, Settings as AppSettings, GridSlot } from '../types';
import type { UseHeaderDrag } from '../hooks/useHeaderDrag';

interface Props {
  links: WidgetItem[];
  isEditing: boolean;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onMoveItem: (linkId: string, targetGroupId: string | null, targetCoords?: GridSlot) => void;
  onDelete: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<WidgetItem>) => void;
  headerDrag: UseHeaderDrag;
  onEnterEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onOpenAddLink: () => void;
  onOpenAddWidget: () => void;
  onOpenTheme: () => void;
  onClearDashboard: () => void;
  isDropTarget?: boolean;
}

export default function AppHeader({
  links,
  isEditing,
  settings,
  onUpdateSettings,
  onMoveItem,
  onDelete,
  onUpdateItem,
  headerDrag,
  onEnterEdit,
  onSaveEdit,
  onCancelEdit,
  onOpenAddLink,
  onOpenAddWidget,
  onOpenTheme,
  onClearDashboard,
  isDropTarget = false,
}: Readonly<Props>) {
  const headerLinks = links
    .filter((l): l is LinkItem => l.isHeaderLink === true && l.type === 'link')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const groups = links
    .filter((l): l is GroupItem => l.type === 'group')
    .map(s => ({ id: s.id, title: s.title }));

  return (
    <header
      data-header-drop-target="true"
      className={`grid grid-cols-3 items-center px-4 py-2 border-b border-border relative transition-colors ${isDropTarget ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset' : ''}`}
    >
      <div className="flex items-center gap-3">
        <Hexagon size={24} strokeWidth={2.5} className="text-foreground" />
        <div className="flex items-baseline">
          <h1 className="text-xl font-bold text-foreground tracking-tight m-0">
            MonoStart
          </h1>
          <span className="text-xs text-muted-foreground font-medium opacity-60 ml-3">
            by{' '}
            <a
              href="https://www.paurushrai.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline hover:opacity-100 transition-all"
            >
              Paurush Rai
            </a>
          </span>
        </div>
      </div>

      <nav aria-label="Header links" className="flex justify-center items-center gap-2 overflow-x-auto max-w-full no-scrollbar">
        {headerLinks.map(link => (
          <HeaderLink
            key={link.id}
            item={link}
            isEditing={isEditing}
            openInNewTab={settings.openInNewTab}
            groups={groups}
            onMoveItem={onMoveItem}
            onDelete={onDelete}
            onUpdateItem={onUpdateItem}
            draggedHeaderLinkId={headerDrag.draggedHeaderLinkId}
            dragOverHeaderLinkId={headerDrag.dragOverHeaderLinkId}
            onDragStart={headerDrag.onDragStart}
            onDragOver={headerDrag.onDragOver}
            onDrop={headerDrag.onDrop}
            onDragEnd={headerDrag.onDragEnd}
          />
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3 relative">
        {isEditing && (
          <div className="flex items-center gap-2 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearDashboard}
              title="Clear Dashboard"
              className="text-red-500 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15"
            >
              <Trash2 size={14} className="mr-1.5" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveEdit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
            >
              <Check size={16} className="mr-1.5" />
              Save
            </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Settings"
              className="text-foreground"
            >
              <Settings size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={onOpenAddLink}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LinkIcon size={14} className="text-muted-foreground" />
              <span>Add Link</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenAddWidget}
              className="flex items-center gap-2 cursor-pointer"
            >
              <LayoutGrid size={14} className="text-muted-foreground" />
              <span>Add Widget</span>
            </DropdownMenuItem>

            {!isEditing && (
              <DropdownMenuItem
                onClick={onEnterEdit}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Edit2 size={14} className="text-muted-foreground" />
                <span>Edit Dashboard</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onOpenTheme}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-muted-foreground" />
                <span>Theme & Appearance</span>
              </div>
              <div
                className="w-3.5 h-3.5 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onUpdateSettings({ ...settings, openInNewTab: !settings.openInNewTab });
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <AppWindow size={14} className="text-muted-foreground" />
                <span>Open links in new tab</span>
              </div>
              <span
                className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                  settings.openInNewTab
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/50 bg-transparent'
                }`}
              >
                {settings.openInNewTab && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
