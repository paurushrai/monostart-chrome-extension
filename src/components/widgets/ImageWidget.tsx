import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Image as ImageIcon, Trash2, Settings, Upload, Check, Link } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ImageItem } from '../../types';

interface Props {
  item: ImageItem;
  onDelete: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<ImageItem>) => void;
  isEditing: boolean;
}

const ImageWidget = ({ item, onDelete, onUpdateItem, isEditing }: Readonly<Props>) => {
  const { title = 'Image', url = '', fit = 'cover' } = item;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showConfig, setShowConfig] = useState(!url);
  const [inputUrl, setInputUrl] = useState(url);
  const [uploadError, setUploadError] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputUrl(url);
    setShowConfig(!url);
  }, [url]);

  const handleTitleClick = () => {
    if (isEditing) {
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const newTitle = titleInputRef.current?.value.trim() || 'Image';
    onUpdateItem(item.id, { title: newTitle });
  };

  const handleSaveUrl = (targetUrl: string) => {
    setUploadError("");
    onUpdateItem(item.id, { url: targetUrl.trim() });
    setShowConfig(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 1.5MB to optimize storage.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (typeof base64 === 'string') {
        onUpdateItem(item.id, { url: base64 });
        setShowConfig(false);
        setUploadError("");
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const fitClass = fit === 'contain'
    ? 'object-contain' 
    : fit === 'fill' 
      ? 'object-fill' 
      : 'object-cover';

  return (
    <article className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">

      {isEditing && (
        <header className={`flex items-center justify-between px-2 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl z-20 py-1 drag-handle cursor-grab active:cursor-grabbing`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <ImageIcon size={12} className="text-primary shrink-0" aria-hidden="true" />
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                type="text"
                defaultValue={title}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                aria-label="Image title"
                className={`h-auto font-medium bg-background border border-border rounded px-1 py-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 ${isEditing ? 'text-xs max-w-[140px]' : 'text-xs max-w-[120px]'}`}
              />
            ) : (
              <h3
                onClick={handleTitleClick}
                className={`font-medium truncate select-none ${isEditing ? 'text-xs cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded' : 'text-xs pointer-events-none'}`}
              >
                {title}
              </h3>
            )}
          </div>

          <div role="toolbar" aria-label="Image actions" className="flex items-center gap-1 shrink-0 relative z-25">
            {url && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Image Settings"
                    className={`text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground ${isEditing ? 'h-6 w-6' : 'h-5 w-5'}`}
                  >
                    <Settings size={isEditing ? 12 : 11} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 p-1">
                  <DropdownMenuItem 
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-2 py-1 cursor-pointer text-xs"
                  >
                    <Link size={12} className="text-muted-foreground" />
                    <span>Change Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onUpdateItem(item.id, { fit: 'cover' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Cover (Crop)</span>
                    {fit === 'cover' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateItem(item.id, { fit: 'contain' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Contain (Aspect)</span>
                    {fit === 'contain' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateItem(item.id, { fit: 'fill' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Fill (Stretch)</span>
                    {fit === 'fill' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title="Delete Widget"
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </header>
      )}

      {isEditing && !showConfig && <div className="absolute inset-x-0 bottom-0 top-[48px] z-10 bg-transparent cursor-grab drag-handle" />}

      <div className="flex-1 relative min-h-0 w-full h-full bg-gray-50/50 dark:bg-black/5 flex flex-col items-center justify-center rounded-b-xl overflow-hidden">

        {isEditing && showConfig ? (
          <div className="w-full h-full px-3 py-1 flex flex-col overflow-y-auto z-20 bg-background/95 backdrop-blur-sm">
            <div className="my-auto w-full space-y-2">
            <p className="text-xs font-medium text-foreground text-center shrink-0">Configure Widget Image</p>

            <div className="flex gap-1.5 shrink-0">
              <Input
                type="text"
                placeholder="Paste image URL..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="h-8 text-xs flex-1 bg-gray-100 dark:bg-white/5 border-none rounded-sm px-3 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                onKeyDown={(e) => e.key === 'Enter' && inputUrl.trim() && handleSaveUrl(inputUrl)}
              />
              <Button 
                size="sm" 
                className="h-8 text-xs shrink-0" 
                disabled={!inputUrl.trim()}
                onClick={() => handleSaveUrl(inputUrl)}
              >
                Save
              </Button>
            </div>

            <div className="flex items-center text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold shrink-0">
              <div className="flex-1 h-px bg-border" />
              <span className="px-2">Or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="shrink-0">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-8 text-xs flex items-center justify-center gap-1.5 border-dashed"
              >
                <Upload size={12} />
                Upload Local Image
              </Button>
              {uploadError && (
                <p className="text-[10px] text-red-500 mt-1 text-center">{uploadError}</p>
              )}
            </div>

            {url && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowConfig(false)}
                className="h-7 text-[10px] font-normal"
              >
                Cancel Configuration
              </Button>
            )}
            </div>
          </div>
        ) : url ? (
          <div className="w-full h-full relative select-none">
            <img
              src={url}
              alt={title}
              className={`w-full h-full pointer-events-none select-none rounded-b-xl ${fitClass}`}
              onError={() => {
                setUploadError("Image failed to load. The URL might be broken or blocked.");
                setShowConfig(true);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/25 select-none">
            <ImageIcon size={32} aria-hidden="true" />
          </div>
        )}
      </div>

    </article>
  );
};

export default ImageWidget;
