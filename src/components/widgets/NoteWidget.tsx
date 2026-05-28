import { useState, useEffect, useRef } from 'react';
import { FileText, Trash2, Palette, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Note } from '../../types';

const NOTE_COLORS = [
  { id: 'default', name: 'Default', bg: 'bg-white dark:bg-card border-border text-foreground', headerBg: 'bg-gray-50/50 dark:bg-black/10', dot: 'bg-gray-300 dark:bg-gray-600' },
  { id: 'amber', name: 'Yellow', bg: 'bg-amber-50/95 dark:bg-amber-950/20 border-amber-200/40 text-amber-950 dark:text-amber-200', headerBg: 'bg-amber-100/50 dark:bg-amber-950/40', dot: 'bg-amber-400' },
  { id: 'sky', name: 'Blue', bg: 'bg-sky-50/95 dark:bg-sky-950/20 border-sky-200/40 text-sky-950 dark:text-sky-200', headerBg: 'bg-sky-100/50 dark:bg-sky-950/40', dot: 'bg-sky-400' },
  { id: 'rose', name: 'Pink', bg: 'bg-rose-50/95 dark:bg-rose-950/20 border-rose-200/40 text-rose-950 dark:text-rose-200', headerBg: 'bg-rose-100/50 dark:bg-rose-950/40', dot: 'bg-rose-400' },
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-50/95 dark:bg-emerald-950/20 border-emerald-200/40 text-emerald-950 dark:text-emerald-200', headerBg: 'bg-emerald-100/50 dark:bg-emerald-950/40', dot: 'bg-emerald-400' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-50/95 dark:bg-purple-950/20 border-purple-200/40 text-purple-950 dark:text-purple-200', headerBg: 'bg-purple-100/50 dark:bg-purple-950/40', dot: 'bg-purple-400' },
] as const;

// Default is guaranteed to exist at runtime (first entry); `as const` preserves tuple narrowing.
const DEFAULT_NOTE_COLOR = NOTE_COLORS[0];

interface Props {
  item: Note;
  onDelete: (id: string) => void;
  onUpdateLink: (id: string, updates: Partial<Note>) => void;
  isEditing: boolean;
}

const NoteWidget = ({ item, onDelete, onUpdateLink, isEditing }: Readonly<Props>) => {
  const { title = 'Note', content = '', noteColor = 'default' } = item;
  const [text, setText] = useState(content);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(content);
  }, [content]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTextChange = (newVal: string) => {
    setText(newVal);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateLink(item.id, { content: newVal });
    }, 800);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onUpdateLink(item.id, { content: text });
  };

  const handleTitleClick = () => {
    if (isEditing) {
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const newTitle = titleInputRef.current?.value.trim() || 'Note';
    onUpdateLink(item.id, { title: newTitle });
  };

  const activeColor = NOTE_COLORS.find(c => c.id === noteColor) ?? DEFAULT_NOTE_COLOR;

  return (
    <article className={`card-base w-full h-full relative group overflow-hidden flex flex-col transition-all duration-300 ${activeColor.bg}`}>

      <header className={`flex items-center justify-between px-2 border-b border-border/40 shrink-0 rounded-t-xl transition-all duration-300 ${activeColor.headerBg} ${isEditing ? 'py-1.5 drag-handle cursor-grab active:cursor-grabbing' : 'py-1'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText size={isEditing ? 14 : 12} className="text-primary shrink-0" aria-hidden="true" />
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              type="text"
              defaultValue={title}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              aria-label="Note title"
              className={`h-auto font-medium bg-background border border-border rounded px-1 py-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 ${isEditing ? 'text-sm max-w-[140px]' : 'text-xs max-w-[120px]'}`}
            />
          ) : (
            <h3
              onClick={handleTitleClick}
              className={`font-medium truncate select-none ${isEditing ? 'text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded' : 'text-xs pointer-events-none'}`}
            >
              {title}
            </h3>
          )}
        </div>

        <div role="toolbar" aria-label="Note actions" className="flex items-center gap-1 shrink-0 relative z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onMouseDown={(e) => e.stopPropagation()}
                title="Change Color"
                className={`text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground ${isEditing ? 'h-7 w-7' : 'h-5 w-5'}`}
              >
                <Palette size={isEditing ? 14 : 11} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-1 min-w-[120px]">
              {NOTE_COLORS.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => onUpdateLink(item.id, { noteColor: c.id })}
                  className="flex items-center justify-between py-1 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full border border-border/50 ${c.dot}`} aria-hidden="true" />
                    <span>{c.name}</span>
                  </div>
                  {noteColor === c.id && <Check size={12} className="text-primary ml-1" aria-hidden="true" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              title="Delete Widget"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </header>

      {isEditing && <div className="absolute inset-x-0 bottom-0 top-[48px] z-10 bg-transparent cursor-grab drag-handle" />}

      <div className="flex-1 overflow-hidden p-3 rounded-b-xl">
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write something..."
          disabled={isEditing}
          aria-label="Note content"
          className="w-full h-full resize-none bg-transparent border-none outline-none focus:ring-0 text-sm leading-relaxed placeholder-muted-foreground/50 overflow-y-auto"
        />
      </div>

    </article>
  );
};

export default NoteWidget;
