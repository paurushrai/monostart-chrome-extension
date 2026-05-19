import React, { useState, useEffect, useRef } from 'react';
import { Type, Trash2, Settings, AlignLeft, AlignCenter, AlignRight, Check, Bold, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const FONT_SIZES = [
  { id: 'text-sm', name: 'Small' },
  { id: 'text-base', name: 'Medium' },
  { id: 'text-lg', name: 'Large' },
  { id: 'text-xl', name: 'Extra Large' },
  { id: 'text-2xl', name: '2X Large' },
  { id: 'text-3xl', name: '3X Large' },
  { id: 'text-4xl', name: '4X Large' },
  { id: 'text-5xl', name: '5X Large' },
  { id: 'text-6xl', name: '6X Large' },
  { id: 'text-7xl', name: '7X Large' },
  { id: 'text-8xl', name: '8X Large' },
  { id: 'text-9xl', name: '9X Large' },
  { id: 'text-[10rem]', name: '10X Large' },
  { id: 'text-[12rem]', name: '12X Large' },
];

const FONT_WEIGHTS = [
  { id: 'font-thin', name: 'Thin' },
  { id: 'font-light', name: 'Light' },
  { id: 'font-normal', name: 'Regular' },
  { id: 'font-medium', name: 'Medium' },
  { id: 'font-semibold', name: 'Semi Bold' },
  { id: 'font-bold', name: 'Bold' },
  { id: 'font-extrabold', name: 'Extra Bold' },
  { id: 'font-black', name: 'Black' },
];

const OPACITIES = [
  { id: 'opacity-100', name: '100% (Bright)' },
  { id: 'opacity-80', name: '80%' },
  { id: 'opacity-60', name: '60%' },
  { id: 'opacity-40', name: '40% (Muted)' },
];

const LabelWidget = ({ item, onDelete, onUpdateLink, isEditing }) => {
  const { 
    text = 'Google', 
    align = 'left', 
    size = 'text-3xl', 
    fontWeight = 'font-bold',
    opacity = 'opacity-100',
    cardStyle = false
  } = item;

  const [isEditingText, setIsEditingText] = useState(false);
  const [inputText, setInputText] = useState(text);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputText(text);
  }, [text]);

  const handleTextClick = () => {
    if (isEditing) {
      setIsEditingText(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSaveText = () => {
    setIsEditingText(false);
    const trimmed = inputText.trim();
    onUpdateLink(item.id, { text: trimmed || 'Text' });
  };

  // Alignment classes
  const alignClass = align === 'center' 
    ? 'text-center justify-center' 
    : align === 'right' 
      ? 'text-right justify-end' 
      : 'text-left justify-start';

  return (
    <div 
      className={`w-full h-full relative group/label flex items-center transition-all duration-200 rounded-lg ${alignClass} ${
        cardStyle 
          ? 'card-base bg-white dark:bg-card shadow-sm border border-border' 
          : `bg-transparent border border-dashed ${isEditing && !isEditingText ? 'border-transparent hover:border-border/40' : 'border-transparent'}`
      } ${
        isEditing && !isEditingText 
          ? 'drag-handle cursor-grab active:cursor-grabbing' 
          : ''
      }`}
    >
      
      {/* Settings overlay (only visible in edit mode) */}
      {isEditing && !isEditingText && (
        <div role="toolbar" aria-label="Label actions" className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/label:opacity-100 transition-opacity duration-200 z-30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                title="Text Settings"
                className="flex items-center justify-center h-5 w-5 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground"
              >
                <Settings size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1">
              <DropdownMenuItem 
                onClick={() => {
                  setIsEditingText(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-2 py-1 cursor-pointer text-xs"
              >
                <Type size={12} className="text-muted-foreground" />
                <span>Edit Text</span>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => onUpdateLink(item.id, { cardStyle: !cardStyle })}
                className="flex items-center justify-between py-1 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded border border-border flex items-center justify-center bg-background shrink-0">
                    {cardStyle && <Check size={10} className="text-primary" />}
                  </div>
                  <span>Show Card Style</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Size sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 py-1 cursor-pointer text-xs">
                  <Sparkles size={12} className="text-muted-foreground" />
                  <span>Font Size</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1">
                  {FONT_SIZES.map((fs) => (
                    <DropdownMenuItem
                      key={fs.id}
                      onClick={() => onUpdateLink(item.id, { size: fs.id })}
                      className="flex items-center justify-between py-1 cursor-pointer text-xs"
                    >
                      <span>{fs.name}</span>
                      {size === fs.id && <Check size={12} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Alignment sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 py-1 cursor-pointer text-xs">
                  <AlignLeft size={12} className="text-muted-foreground" />
                  <span>Alignment</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1">
                  <DropdownMenuItem
                    onClick={() => onUpdateLink(item.id, { align: 'left' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlignLeft size={12} />
                      <span>Left</span>
                    </div>
                    {align === 'left' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateLink(item.id, { align: 'center' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlignCenter size={12} />
                      <span>Center</span>
                    </div>
                    {align === 'center' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateLink(item.id, { align: 'right' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlignRight size={12} />
                      <span>Right</span>
                    </div>
                    {align === 'right' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Weight sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 py-1 cursor-pointer text-xs">
                  <Bold size={12} className="text-muted-foreground" />
                  <span>Font Weight</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1">
                  {FONT_WEIGHTS.map((fw) => (
                    <DropdownMenuItem
                      key={fw.id}
                      onClick={() => onUpdateLink(item.id, { fontWeight: fw.id })}
                      className="flex items-center justify-between py-1 cursor-pointer text-xs"
                    >
                      <span>{fw.name}</span>
                      {fontWeight === fw.id && <Check size={12} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Opacity sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 py-1 cursor-pointer text-xs">
                  <div className="w-3 h-3 rounded-full border border-current opacity-60" />
                  <span className="ml-0.5">Opacity</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-1">
                  {OPACITIES.map((op) => (
                    <DropdownMenuItem
                      key={op.id}
                      onClick={() => onUpdateLink(item.id, { opacity: op.id })}
                      className="flex items-center justify-between py-1 cursor-pointer text-xs"
                    >
                      <span>{op.name}</span>
                      {opacity === op.id && <Check size={12} className="text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="flex items-center gap-2 py-1 cursor-pointer text-xs text-red-500 hover:text-red-600 focus:text-red-600"
              >
                <Trash2 size={12} />
                <span>Delete Text</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="flex items-center justify-center h-5 w-5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500"
            title="Delete Widget"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}

      {/* Text Render/Input */}
      <div className={`px-4 py-2 w-full truncate leading-none ${size} ${fontWeight} ${opacity}`}>
        {isEditingText ? (
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={handleSaveText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveText();
              } else if (e.key === 'Escape') {
                setIsEditingText(false);
                setInputText(text);
              }
            }}
            className="w-full text-foreground p-0 m-0 focus:ring-0 focus:outline-none focus-visible:ring-0 outline-none leading-none bg-transparent border-none"
            style={{ 
              fontSize: 'inherit', 
              fontWeight: 'inherit', 
              textAlign: align,
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <span 
            onClick={handleTextClick}
            className={`truncate select-none ${isEditing ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1' : ''}`}
          >
            {text}
          </span>
        )}
      </div>

    </div>
  );
};

export default LabelWidget;
