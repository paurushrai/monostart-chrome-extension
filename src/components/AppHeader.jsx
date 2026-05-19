/* eslint-disable react/prop-types */
import HeaderLink from './HeaderLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Hexagon, Edit2, Check, Settings, Link as LinkIcon, Palette, ExternalLink, LayoutGrid } from 'lucide-react';

export default function AppHeader({
  links,
  isEditing,
  settings,
  onUpdateSettings,
  onMoveLink,
  onDelete,
  onUpdateLink,
  headerDrag,
  onEnterEdit,
  onSaveEdit,
  onCancelEdit,
  onOpenAddLink,
  onOpenAddWidget,
  onOpenTheme,
}) {
  const headerLinks = links
    .filter(l => l.isHeaderLink)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const sections = links
    .filter(l => l.type === 'section')
    .map(s => ({ id: s.id, title: s.title }));

  return (
    <header className="grid grid-cols-3 items-center px-6 py-2 border-b border-border relative">
      <div className="flex items-center gap-3">
        <Hexagon size={24} strokeWidth={2.5} className="text-primary" />
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

      {/* Center: Header Links */}
      <div className="flex justify-center items-center gap-2 overflow-x-auto max-w-full no-scrollbar">
        {headerLinks.map(link => (
          <HeaderLink
            key={link.id}
            item={link}
            isEditing={isEditing}
            openInNewTab={settings.openInNewTab}
            sections={sections}
            onMoveLink={onMoveLink}
            onDelete={onDelete}
            onUpdateLink={onUpdateLink}
            draggedHeaderLinkId={headerDrag.draggedHeaderLinkId}
            dragOverHeaderLinkId={headerDrag.dragOverHeaderLinkId}
            onDragStart={headerDrag.onDragStart}
            onDragOver={headerDrag.onDragOver}
            onDrop={headerDrag.onDrop}
            onDragEnd={headerDrag.onDragEnd}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 relative">
        {isEditing && (
          <div className="flex items-center gap-2 mr-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveEdit}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
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
              onClick={() => onUpdateSettings({ ...settings, openInNewTab: !settings.openInNewTab })}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ExternalLink size={14} className="text-muted-foreground" />
                <span>Open links in new tab</span>
              </div>
              {settings.openInNewTab && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
