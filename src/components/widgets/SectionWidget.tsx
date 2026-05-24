import { useState, useEffect, useRef, type FocusEvent, type KeyboardEvent, type FormEvent, type DragEvent as ReactDragEvent } from 'react';
import type { Layout } from 'react-grid-layout/legacy';
import { X, Check } from 'lucide-react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import SectionHeader from './section/SectionHeader';
import SectionInnerGrid from './section/SectionInnerGrid';
import { useSectionDragOut } from '../../hooks/useSectionDragOut';
import { HEADER_LINK_DRAG_TYPE } from '../../hooks/useHeaderDrag';
import { findFirstFreeSlot } from '../../lib/grid';
import type { Section, RegularLink, LinkItem, DragCoords, GridSlot } from '../../types';

const PRESET_COLORS = [
  { name: 'Red', hsl: '346 87% 61%' },
  { name: 'Pink', hsl: '326 100% 74%' },
  { name: 'Purple', hsl: '271 91% 65%' },
  { name: 'Indigo', hsl: '239 84% 67%' },
  { name: 'Blue', hsl: '200 73% 52%' },
  { name: 'Cyan', hsl: '189 94% 43%' },
  { name: 'Teal', hsl: '175 84% 32%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Yellow', hsl: '45 93% 47%' },
  { name: 'Orange', hsl: '24 100% 50%' },
  { name: 'Slate', hsl: '215 16% 47%' },
  { name: 'Neutral', hsl: '0 0% 50%' },
];

interface SectionRef {
  id: string;
  title: string;
}

interface Props {
  item: Section;
  onDelete: (id: string) => void;
  onUpdateLink: (id: string, updates: Partial<LinkItem>) => void;
  isEditing: boolean;
  openInNewTab?: boolean;
  sections?: SectionRef[];
  onMoveLink?: (linkId: string, targetSectionId: string | null, targetCoords?: GridSlot) => void;
  isDraggedOver: boolean;
  dragCursorCoords: DragCoords | null;
  onInnerDragStart: (link: RegularLink, sectionId: string) => void;
  onInnerDrag: (link: RegularLink, sectionId: string, x: number, y: number) => void;
  onInnerDragStop: (link: RegularLink, sectionId: string, x: number, y: number) => void;
  draggedItem: LinkItem | null;
}

const SectionWidget = ({
  item,
  onDelete,
  onUpdateLink,
  isEditing,
  openInNewTab,
  sections = [],
  onMoveLink,
  isDraggedOver,
  dragCursorCoords,
  onInnerDragStart,
  onInnerDrag,
  onInnerDragStop,
  draggedItem,
}: Props) => {
  const { title, borderColor = '200 73% 52%', links = [], cols = 3 } = item;

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isHeaderDragOver, setIsHeaderDragOver] = useState(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Accept HTML5 drops of header links — the link gets moved into this section.
  const isHeaderLinkDrag = (e: ReactDragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes(HEADER_LINK_DRAG_TYPE);

  const handleHeaderDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isHeaderLinkDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isHeaderDragOver) setIsHeaderDragOver(true);
  };

  const handleHeaderDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsHeaderDragOver(false);
  };

  const handleHeaderDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    setIsHeaderDragOver(false);
    if (!isHeaderLinkDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const linkId = e.dataTransfer.getData(HEADER_LINK_DRAG_TYPE);
    if (!linkId || !onMoveLink) return;
    onMoveLink(linkId, item.id);
  };

  const dragOut = useSectionDragOut({
    containerRef,
    sectionId: item.id,
    links,
    onInnerDragStart,
    onInnerDrag,
    onInnerDragStop,
  });

  useEffect(() => {
    if (isAddingLink && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAddingLink]);

  const handleTitleBlur = (e: FocusEvent<HTMLSpanElement>) => {
    const newTitle = e.target.innerText.trim();
    if (newTitle && newTitle !== title) {
      onUpdateLink(item.id, { title: newTitle });
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const handleAddLinkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let linkTitle = '';
    let favicon = '';
    try {
      const urlObj = new URL(url);
      linkTitle = urlObj.hostname.replace('www.', '');
      favicon = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=128`;
    } catch {
      linkTitle = url;
    }

    const currentCols = cols;
    const newLinkItem: RegularLink = {
      id: `link-${Date.now()}`,
      type: 'link',
      url,
      title: linkTitle,
      favicon,
      viewMode: 'icon',
      w: 1,
      h: 1,
    };

    const occupied = links.map((l) => ({
      x: l.x ?? 0,
      y: l.y ?? 0,
      w: Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, currentCols)), currentCols),
      h: l.h ?? 1,
    }));
    const slot = findFirstFreeSlot(occupied, newLinkItem.w!, newLinkItem.h!, currentCols);
    if (slot) {
      newLinkItem.x = slot.x;
      newLinkItem.y = slot.y;
    }

    onUpdateLink(item.id, { links: [...links, newLinkItem] });
    setNewUrl('');
    setIsAddingLink(false);
  };

  const handleInnerLayoutChange = (newLayout: Layout) => {
    if (dragOut.isMovingOutRef.current) {
      dragOut.isMovingOutRef.current = false;
      return;
    }
    const updatedLinks = links.map((l) => {
      const layoutItem = newLayout.find((li) => li.i === l.id);
      if (!layoutItem) return l;
      return { ...l, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
    });
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleInnerDelete = (linkId: string) => {
    onUpdateLink(item.id, { links: links.filter((l) => l.id !== linkId) });
  };

  const handleInnerViewModeChange = (linkId: string, newMode: 'icon' | 'icon+text') => {
    const isIconOnly = newMode === 'icon';
    const updatedLinks = links.map((l) => {
      if (l.id === linkId) {
        return {
          ...l,
          viewMode: newMode,
          w: isIconOnly ? 1 : Math.min(3, cols),
          h: isIconOnly ? 1 : 1,
        };
      }
      return l;
    });
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleInnerUpdateLink = (linkId: string, updates: Partial<RegularLink>) => {
    const updatedLinks = links.map((l) => (l.id === linkId ? { ...l, ...updates } : l));
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleUpdateCols = (newCols: number) => {
    // Clamp any link layouts that exceed the new columns count
    const updatedLinks = links.map(l => {
      const defaultW = l.viewMode === 'icon' ? 1 : Math.min(3, newCols);
      const w = Math.min(l.w ?? defaultW, newCols);
      const x = Math.min(l.x ?? 0, newCols - w);
      return { ...l, w, x };
    });
    onUpdateLink(item.id, { cols: newCols, links: updatedLinks });
  };

  // HSL format support (preset / custom)
  const isHsl = borderColor.split(' ').length >= 2;
  const borderCssColor = isHsl ? `hsl(${borderColor})` : borderColor;
  const borderMutedCssColor = isHsl ? `hsl(${borderColor} / 0.3)` : borderColor;
  const textCssColor = isHsl ? `hsl(${borderColor} / 0.85)` : borderColor;
  const shadowCssColor = isHsl ? `hsl(${borderColor} / 0.04)` : borderColor;

  return (
    <div
      data-section-id={item.id}
      className={`relative flex flex-col w-full h-full bg-card/65 backdrop-blur-md rounded-xl border-2 border-dashed transition-all duration-300 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''} ${isHeaderDragOver ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background' : ''}`}
      style={{
        borderColor: borderMutedCssColor,
        borderStyle: 'dashed',
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 0 16px -2px ${shadowCssColor}`,
      }}
      onDragOver={handleHeaderDragOver}
      onDragLeave={handleHeaderDragLeave}
      onDrop={handleHeaderDrop}
    >
      <SectionHeader
        title={title}
        count={links.length}
        cols={cols}
        isEditing={isEditing}
        borderMutedCssColor={borderMutedCssColor}
        borderCssColor={borderCssColor}
        textCssColor={textCssColor}
        onTitleBlur={handleTitleBlur}
        onTitleKeyDown={handleTitleKeyDown}
        onAddLink={() => setIsAddingLink(true)}
        onTogglePalette={() => setShowColorPicker(!showColorPicker)}
        onUpdateCols={handleUpdateCols}
        onDelete={() => onDelete(item.id)}
      />

      {/* Color Preset Palette Selection Panel */}
      {showColorPicker && isEditing && (
        <div
          className="mt-4 mx-3 px-3 py-2 bg-secondary/40 border border-border/40 rounded-lg flex flex-wrap gap-1.5 justify-center items-center select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {PRESET_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => {
                onUpdateLink(item.id, { borderColor: color.hsl });
                setShowColorPicker(false);
              }}
              className={`w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center ring-offset-background ${
                borderColor === color.hsl ? 'ring-1.5 ring-foreground' : 'border border-border/60'
              }`}
              style={{ backgroundColor: `hsl(${color.hsl})` }}
              title={color.name}
            />
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 rounded-full"
            onClick={() => setShowColorPicker(false)}
          >
            <X size={12} />
          </Button>
        </div>
      )}

      {/* Inline Quick Add Link Input */}
      {isAddingLink && (
        <form
          onSubmit={handleAddLinkSubmit}
          className="mt-4 mx-3 p-2 bg-secondary/25 border border-border/30 rounded-lg flex gap-2 items-center shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Input
            ref={addInputRef}
            type="text"
            placeholder="Paste URL..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="h-8 text-xs flex-1 bg-background"
          />
          <div className="flex gap-1">
            <Button type="submit" size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700">
              <Check size={12} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsAddingLink(false);
                setNewUrl('');
              }}
            >
              <X size={12} />
            </Button>
          </div>
        </form>
      )}

      <SectionInnerGrid
        sectionId={item.id}
        cols={cols}
        isEditing={isEditing}
        links={links}
        isDraggedOver={isDraggedOver}
        draggedItem={draggedItem}
        dragCursorCoords={dragCursorCoords}
        openInNewTab={openInNewTab}
        sections={sections}
        onMoveLink={onMoveLink}
        borderCssColor={borderCssColor}
        textCssColor={textCssColor}
        containerRef={containerRef}
        onInnerLayoutChange={handleInnerLayoutChange}
        onRglDragStart={dragOut.handleRglDragStart}
        onRglDrag={dragOut.handleRglDrag}
        onRglDragStop={dragOut.handleRglDragStop}
        onInnerDelete={handleInnerDelete}
        onInnerViewModeChange={handleInnerViewModeChange}
        onInnerUpdateLink={handleInnerUpdateLink}
        onAddFirstLink={() => setIsAddingLink(true)}
      />
    </div>
  );
};

export default SectionWidget;
