import React, { useState, useEffect, useRef } from 'react';
import { FileText, Trash2, Palette, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTE_COLORS = [
  { id: 'default', name: 'Default', bg: 'bg-white dark:bg-card border-border text-foreground', headerBg: 'bg-gray-50/50 dark:bg-black/10', dot: 'bg-gray-300 dark:bg-gray-600' },
  { id: 'amber', name: 'Yellow', bg: 'bg-amber-50/95 dark:bg-amber-950/20 border-amber-200/40 text-amber-950 dark:text-amber-200', headerBg: 'bg-amber-100/50 dark:bg-amber-950/40', dot: 'bg-amber-400' },
  { id: 'sky', name: 'Blue', bg: 'bg-sky-50/95 dark:bg-sky-950/20 border-sky-200/40 text-sky-950 dark:text-sky-200', headerBg: 'bg-sky-100/50 dark:bg-sky-950/40', dot: 'bg-sky-400' },
  { id: 'rose', name: 'Pink', bg: 'bg-rose-50/95 dark:bg-rose-950/20 border-rose-200/40 text-rose-950 dark:text-rose-200', headerBg: 'bg-rose-100/50 dark:bg-rose-950/40', dot: 'bg-rose-400' },
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-50/95 dark:bg-emerald-950/20 border-emerald-200/40 text-emerald-950 dark:text-emerald-200', headerBg: 'bg-emerald-100/50 dark:bg-emerald-950/40', dot: 'bg-emerald-400' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-50/95 dark:bg-purple-950/20 border-purple-200/40 text-purple-950 dark:text-purple-200', headerBg: 'bg-purple-100/50 dark:bg-purple-950/40', dot: 'bg-purple-400' },
];

const NoteWidget = ({ item, onDelete, onUpdateLink, isEditing }) => {
  const { title = 'Note', content = '', noteColor = 'default' } = item;
  const [text, setText] = useState(content);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync state if item changes from outside
  useEffect(() => {
    setText(content);
  }, [content]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTextChange = (newVal) => {
    setText(newVal);
    
    // Auto-save debounced
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

  const activeColor = NOTE_COLORS.find(c => c.id === noteColor) || NOTE_COLORS[0];

  return (
    <div className={`card-base w-full h-full relative group overflow-hidden flex flex-col transition-all duration-300 ${activeColor.bg}`}>
      
      {/* Header bar */}
      <div className={`flex items-center justify-between px-2 py-1 border-b border-border/40 shrink-0 rounded-t-xl transition-all duration-300 ${activeColor.headerBg} ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText size={12} className="text-primary shrink-0" />
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              defaultValue={title}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              className="text-xs font-medium bg-background border border-border rounded px-1 py-0.5 outline-none max-w-[120px]"
            />
          ) : (
            <span 
              onClick={handleTitleClick}
              className={`text-xs font-medium truncate select-none ${isEditing ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded' : 'pointer-events-none'}`}
            >
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 relative z-20">
          {/* Color palette selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                title="Change Color"
                className="flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              >
                <Palette size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-1 min-w-[120px]">
              {NOTE_COLORS.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => onUpdateLink(item.id, { noteColor: c.id })}
                  className="flex items-center justify-between py-1 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border border-border/50 ${c.dot}`} />
                    <span>{c.name}</span>
                  </div>
                  {noteColor === c.id && <Check size={12} className="text-primary ml-1" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditing && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="flex items-center justify-center h-5 w-5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete Widget"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>

      {isEditing && <div className="absolute inset-x-0 bottom-0 top-[45px] z-10 bg-transparent cursor-grab drag-handle" />}

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden p-3 rounded-b-xl">
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write something..."
          disabled={isEditing}
          className="w-full h-full resize-none bg-transparent border-none outline-none focus:ring-0 text-sm leading-relaxed placeholder-muted-foreground/50 overflow-y-auto"
        />
      </div>

    </div>
  );
};

export default NoteWidget;
