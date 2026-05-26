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
import type { ImageWidget as ImageWidgetItem } from '../../types';

const PRESET_IMAGES = [
  { name: 'Landscape', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80' },
  { name: 'Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' },
  { name: 'Abstract Art', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
  { name: 'Cozy Desk', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
];

interface Props {
  item: ImageWidgetItem;
  onDelete: (id: string) => void;
  onUpdateLink: (id: string, updates: Partial<ImageWidgetItem>) => void;
  isEditing: boolean;
}

const ImageWidget = ({ item, onDelete, onUpdateLink, isEditing }: Props) => {
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
    onUpdateLink(item.id, { title: newTitle });
  };

  const handleSaveUrl = (targetUrl: string) => {
    setUploadError("");
    onUpdateLink(item.id, { url: targetUrl.trim() });
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
        onUpdateLink(item.id, { url: base64 });
        setShowConfig(false);
        setUploadError("");
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const selectPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    handleSaveUrl(presetUrl);
  };

  const fitClass = fit === 'contain'
    ? 'object-contain' 
    : fit === 'fill' 
      ? 'object-fill' 
      : 'object-cover';

  return (
    <div className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">
      
      {(isEditing || showConfig || !url) && (
        <div className={`flex items-center justify-between px-2 py-1 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl z-20 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <ImageIcon size={12} className="text-primary shrink-0" />
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                defaultValue={title}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
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

          <div role="toolbar" aria-label="Image actions" className="flex items-center gap-1 shrink-0 relative z-25">
            {url && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    title="Image Settings"
                    className="flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  >
                    <Settings size={11} />
                  </button>
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
                    onClick={() => onUpdateLink(item.id, { fit: 'cover' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Cover (Crop)</span>
                    {fit === 'cover' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateLink(item.id, { fit: 'contain' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Contain (Aspect)</span>
                    {fit === 'contain' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdateLink(item.id, { fit: 'fill' })}
                    className="flex items-center justify-between py-1 cursor-pointer text-xs"
                  >
                    <span>Fill (Stretch)</span>
                    {fit === 'fill' && <Check size={12} className="text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
      )}

      {isEditing && !showConfig && <div className="absolute inset-x-0 bottom-0 top-[45px] z-10 bg-transparent cursor-grab drag-handle" />}

      <div className="flex-1 relative min-h-0 w-full h-full bg-gray-50/50 dark:bg-black/5 flex flex-col items-center justify-center rounded-b-xl overflow-hidden">

        {showConfig ? (
          <div className="w-full h-full p-4 flex flex-col justify-center overflow-y-auto space-y-3 z-20 bg-background/95 backdrop-blur-sm">
            <div className="space-y-1.5 text-center">
              <div className="inline-flex p-2 bg-primary/10 rounded-full text-primary">
                <ImageIcon size={18} />
              </div>
              <p className="text-xs font-medium text-foreground">Configure Widget Image</p>
            </div>

            <div className="flex gap-1.5">
              <Input
                type="text"
                placeholder="Paste image URL..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="h-8 text-xs flex-1"
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

            <div className="flex items-center text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">
              <div className="flex-1 h-px bg-border" />
              <span className="px-2">Or Choose</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
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

            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => selectPreset(preset.url)}
                  className="group/preset relative h-10 rounded border border-border/80 overflow-hidden hover:border-primary transition-all text-left"
                >
                  <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/preset:opacity-100 transition-opacity" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/40 text-[9px] text-white font-medium px-1 truncate py-0.5 pointer-events-none">
                    {preset.name}
                  </span>
                </button>
              ))}
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
        ) : (
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
        )}
      </div>

    </div>
  );
};

export default ImageWidget;
