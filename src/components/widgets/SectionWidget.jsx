/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import SectionHeader from './section/SectionHeader';
import SectionInnerGrid from './section/SectionInnerGrid';
import { useSectionDragOut } from '../../hooks/useSectionDragOut';

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
}) => {
  const { title, borderColor = '200 73% 52%', links = [], cols = 3 } = item;

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const addInputRef = useRef(null);
  const containerRef = useRef(null);

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

  const handleTitleBlur = (e) => {
    const newTitle = e.target.innerText.trim();
    if (newTitle && newTitle !== title) {
      onUpdateLink(item.id, { title: newTitle });
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleAddLinkSubmit = async (e) => {
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
    } catch (err) {
      linkTitle = url;
    }

    const currentCols = cols;
    const newLinkItem = {
      id: `link-${Date.now()}`,
      type: 'link',
      url,
      title: linkTitle,
      favicon,
      viewMode: 'icon',
      w: 1,
      h: 1,
    };

    // Find next free slot using same algorithm as the inner grid placeholder.
    const grid = [];
    links.forEach(l => {
      const lx = l.x ?? 0;
      const ly = l.y ?? 0;
      const lw = Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, currentCols)), currentCols);
      const lh = l.h ?? 1;
      for (let r = ly; r < ly + lh; r++) {
        while (grid.length <= r) grid.push(new Array(currentCols).fill(false));
        for (let c = lx; c < lx + lw && c < currentCols; c++) {
          grid[r][c] = true;
        }
      }
    });

    let placed = false;
    let r = 0;
    let newX = 0;
    let newY = 0;

    while (!placed) {
      while (grid.length <= r + newLinkItem.h) {
        grid.push(Array(currentCols).fill(false));
      }
      for (let c = 0; c <= currentCols - newLinkItem.w; c++) {
        let canFit = true;
        for (let i = 0; i < newLinkItem.h; i++) {
          for (let j = 0; j < newLinkItem.w; j++) {
            if (grid[r + i][c + j]) {
              canFit = false;
              break;
            }
          }
          if (!canFit) break;
        }
        if (canFit) {
          newX = c;
          newY = r;
          placed = true;
          break;
        }
      }
      r++;
    }

    newLinkItem.x = newX;
    newLinkItem.y = newY;

    onUpdateLink(item.id, { links: [...links, newLinkItem] });
    setNewUrl('');
    setIsAddingLink(false);
  };

  const handleInnerLayoutChange = (newLayout) => {
    if (dragOut.isMovingOutRef.current) {
      dragOut.isMovingOutRef.current = false;
      return;
    }
    const updatedLinks = links.map(l => {
      const layoutItem = newLayout.find(li => li.i === l.id);
      if (!layoutItem) return l;
      return { ...l, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
    });
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleInnerDelete = (linkId) => {
    onUpdateLink(item.id, { links: links.filter(l => l.id !== linkId) });
  };

  const handleInnerViewModeChange = (linkId, newMode) => {
    const isIconOnly = newMode === 'icon';
    const updatedLinks = links.map(l => {
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

  const handleInnerUpdateLink = (linkId, updates) => {
    const updatedLinks = links.map(l => l.id === linkId ? { ...l, ...updates } : l);
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleUpdateCols = (newCols) => {
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
      className={`relative flex flex-col w-full h-full bg-card/65 backdrop-blur-md rounded-xl border-2 border-dashed transition-all duration-300 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        borderColor: borderMutedCssColor,
        borderStyle: 'dashed',
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 0 16px -2px ${shadowCssColor}`,
      }}
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
