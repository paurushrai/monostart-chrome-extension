import type { FocusEvent, KeyboardEvent } from 'react';
import { Plus, Trash2, Palette, Folder, Check, MoreVertical, LayoutGrid, List, Rows3 } from 'lucide-react';
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "../../ui/dropdown-menu";

const COLUMN_OPTIONS = [1, 2, 3, 4, 5, 6];

interface Props {
  title: string;
  count: number;
  cols: number;
  layout: 'grid' | 'list';
  isEditing: boolean;
  borderMutedCssColor: string;
  borderCssColor: string;
  textCssColor: string;
  onTitleBlur: (e: FocusEvent<HTMLSpanElement>) => void;
  onTitleKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => void;
  onAddLink: () => void;
  onTogglePalette: () => void;
  onUpdateCols: (num: number) => void;
  onUpdateLayout: (next: 'grid' | 'list') => void;
  onDelete: () => void;
}

export default function SectionHeader({
  title,
  count,
  cols,
  layout,
  isEditing,
  borderMutedCssColor,
  borderCssColor,
  textCssColor,
  onTitleBlur,
  onTitleKeyDown,
  onAddLink,
  onTogglePalette,
  onUpdateCols,
  onUpdateLayout,
  onDelete,
}: Readonly<Props>) {
  return (
    <div
      className={`flex items-center justify-between px-2 border-b bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-[10px] transition-all duration-300 ${isEditing ? 'py-1 drag-handle cursor-grab active:cursor-grabbing' : 'py-0.5'}`}
      style={{ borderBottomColor: borderMutedCssColor }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Folder size={isEditing ? 12 : 10} className="shrink-0" style={{ color: textCssColor }} />
        <span
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={onTitleBlur}
          onKeyDown={onTitleKeyDown}
          onMouseDown={(e) => isEditing && e.stopPropagation()}
          className={`font-semibold outline-none truncate select-text ${isEditing ? 'text-xs cursor-text px-1 bg-secondary/40 rounded focus:bg-secondary/80 min-w-[60px] max-w-[140px]' : 'text-2xs max-w-[200px]'}`}
          style={{ color: textCssColor }}
        >
          {title}
        </span>
        <span className="text-2xs font-medium leading-none px-1 py-0.5 bg-secondary/60 text-muted-foreground rounded-full shrink-0">
          {count}
        </span>
      </div>

      {isEditing && (
        <div
          role="toolbar"
          aria-label="Section actions"
          className="flex items-center gap-0.5 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Add Link"
            onClick={onAddLink}
          >
            <Plus size={13} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <MoreVertical size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onMouseDown={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onAddLink}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Link
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onTogglePalette}
                className="flex items-center justify-between"
              >
                <span className="flex items-center">
                  <Palette className="mr-2 h-3.5 w-3.5" />
                  Color Border
                </span>
                <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: borderCssColor }} />
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center">
                  <Rows3 className="mr-2 h-3.5 w-3.5" />
                  Layout
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-36" onMouseDown={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={() => onUpdateLayout('grid')}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                        Grid
                      </span>
                      {layout === 'grid' && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdateLayout('list')}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <List className="mr-2 h-3.5 w-3.5" />
                        List
                      </span>
                      {layout === 'list' && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {layout === 'grid' && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center">
                    <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                    Grid Columns
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-36" onMouseDown={(e) => e.stopPropagation()}>
                      {COLUMN_OPTIONS.map((num) => (
                        <DropdownMenuItem
                          key={num}
                          onClick={() => onUpdateCols(num)}
                          className="flex items-center justify-between"
                        >
                          <span>{num} {num === 1 ? 'Column' : 'Columns'}</span>
                          {cols === num && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
