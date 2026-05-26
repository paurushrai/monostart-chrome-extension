import type { FocusEvent, KeyboardEvent } from 'react';
import { Plus, Trash2, Palette, Folder, Check, MoreVertical, LayoutGrid } from 'lucide-react';
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
  isEditing: boolean;
  borderMutedCssColor: string;
  borderCssColor: string;
  textCssColor: string;
  onTitleBlur: (e: FocusEvent<HTMLSpanElement>) => void;
  onTitleKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => void;
  onAddLink: () => void;
  onTogglePalette: () => void;
  onUpdateCols: (num: number) => void;
  onDelete: () => void;
}

export default function SectionHeader({
  title,
  count,
  cols,
  isEditing,
  borderMutedCssColor,
  borderCssColor,
  textCssColor,
  onTitleBlur,
  onTitleKeyDown,
  onAddLink,
  onTogglePalette,
  onUpdateCols,
  onDelete,
}: Props) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-1 border-b bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-[10px] transition-all duration-300 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}
      style={{ borderBottomColor: borderMutedCssColor }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Folder size={12} className="shrink-0" style={{ color: textCssColor }} />
        <span
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={onTitleBlur}
          onKeyDown={onTitleKeyDown}
          onMouseDown={(e) => isEditing && e.stopPropagation()}
          className={`text-xs font-semibold outline-none truncate select-text ${isEditing ? 'cursor-text px-1 bg-secondary/40 rounded focus:bg-secondary/80 min-w-[50px] max-w-[120px]' : 'max-w-[200px]'}`}
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
            className="w-5 h-5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Add Link"
            onClick={onAddLink}
          >
            <Plus size={12} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <MoreVertical size={12} />
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
