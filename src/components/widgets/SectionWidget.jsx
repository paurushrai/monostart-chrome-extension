/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import LinkCard from '../LinkCard';
import { Plus, Trash2, Palette, Folder, X, Check, MoreVertical, LayoutGrid } from 'lucide-react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
} from "../ui/dropdown-menu";

const ReactGridLayout = WidthProvider(GridLayout);

const findNextAvailableSlot = (links, cols, itemW, itemH) => {
  const grid = [];
  links.forEach(l => {
    const lx = l.x ?? 0;
    const ly = l.y ?? 0;
    const lw = Math.min(l.w ?? 1, cols);
    const lh = l.h ?? 1;
    for (let r = ly; r < ly + lh; r++) {
      while (grid.length <= r) grid.push(Array(cols).fill(false));
      for (let c = lx; c < lx + lw && c < cols; c++) {
        grid[r][c] = true;
      }
    }
  });

  let placed = false;
  let r = 0;
  let newX = 0;
  let newY = 0;

  while (!placed) {
    while (grid.length <= r + itemH) {
      grid.push(Array(cols).fill(false));
    }
    for (let c = 0; c <= cols - itemW; c++) {
      let canFit = true;
      for (let i = 0; i < itemH; i++) {
        for (let j = 0; j < itemW; j++) {
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
  return { x: newX, y: newY };
};

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
  draggedItem
}) => {
  const { title, borderColor = '200 73% 52%', links = [], cols = 3 } = item;
  
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const addInputRef = useRef(null);
  const containerRef = useRef(null);
  const isMovingOutRef = useRef(false);
  const lastCursorCoordsRef = useRef(null);

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

  const handleKeyDown = (e) => {
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
    const defaultW = Math.min(3, currentCols);
    const newLinkItem = {
      id: `link-${Date.now()}`,
      type: 'link',
      url,
      title: linkTitle,
      favicon,
      viewMode: 'icon+text',
      w: defaultW,
      h: 1,
    };

    // Calculate layout position for the new link
    const grid = [];
    links.forEach(l => {
      const lx = l.x ?? 0;
      const ly = l.y ?? 0;
      const lw = Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, currentCols)), currentCols);
      const lh = l.h ?? 1;
      for (let r = ly; r < ly + lh; r++) {
        while (grid.length <= r) grid.push(Array(currentCols).fill(false));
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

    const updatedLinks = [...links, newLinkItem];
    onUpdateLink(item.id, { links: updatedLinks });
    setNewUrl('');
    setIsAddingLink(false);
  };

  const handleInnerLayoutChange = (newLayout) => {
    if (isMovingOutRef.current) {
      isMovingOutRef.current = false;
      return;
    }
    const updatedLinks = links.map(l => {
      const layoutItem = newLayout.find(li => li.i === l.id);
      return layoutItem ? { ...l, x: layoutItem.x, y: layoutItem.y } : l;
    });
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleInnerDelete = (linkId) => {
    const updatedLinks = links.filter(l => l.id !== linkId);
    onUpdateLink(item.id, { links: updatedLinks });
  };

  const handleInnerViewModeChange = (linkId, newMode) => {
    const isIconOnly = newMode === 'icon';
    const updatedLinks = links.map(l => {
      if (l.id === linkId) {
        return {
          ...l,
          viewMode: newMode,
          w: isIconOnly ? 1 : Math.min(3, cols),
          h: isIconOnly ? 1 : 1
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
      return {
        ...l,
        w,
        x
      };
    });
    onUpdateLink(item.id, { cols: newCols, links: updatedLinks });
  };

  const displayLinks = [...links];
  if (isDraggedOver) {
    const isIcon = draggedItem?.viewMode === 'icon';
    const w = Math.min(isIcon ? 1 : 3, cols);
    const h = 1;
    let placeholderX = 0;
    let placeholderY = 0;

    if (dragCursorCoords && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft || 0;
      const scrollTop = containerRef.current.scrollTop || 0;
      const localX = dragCursorCoords.x - rect.left + scrollLeft;
      const localY = dragCursorCoords.y - rect.top + scrollTop;

      const colWidth = rect.width / cols;
      const rowHeight = 58; // 50 rowHeight + 8 margin

      placeholderX = Math.floor(localX / colWidth);
      placeholderY = Math.floor(localY / rowHeight);

      placeholderX = Math.max(0, Math.min(cols - w, placeholderX));
      placeholderY = Math.max(0, placeholderY);
    } else {
      const { x, y } = findNextAvailableSlot(links, cols, w, h);
      placeholderX = x;
      placeholderY = y;
    }

    displayLinks.push({
      id: 'drag-placeholder',
      type: 'link',
      title: 'Drop to Add',
      url: '',
      w,
      h,
      x: placeholderX,
      y: placeholderY,
      viewMode: isIcon ? 'icon' : 'card'
    });
  }

  const layout = displayLinks.map(l => {
    const defaultW = l.viewMode === 'icon' ? 1 : Math.min(3, cols);
    const w = Math.min(l.w ?? defaultW, cols);
    return {
      i: l.id,
      x: Math.min(l.x ?? 0, cols - w),
      y: l.y ?? 0,
      w,
      h: l.h ?? 1,
      minW: 1,
      maxW: cols,
      minH: 1,
      maxH: 1,
      isResizable: false
    };
  });

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
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 0 16px -2px ${shadowCssColor}`
      }}
    >
      {/* Header */}
      <div 
        className={`flex items-center justify-between px-2 py-1 border-b bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-[10px] transition-all duration-300 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}
        style={{ borderBottomColor: borderMutedCssColor }}
      >
        {/* Left Side: Title & Count Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Folder size={12} className="shrink-0" style={{ color: textCssColor }} />
          <span
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => isEditing && e.stopPropagation()}
            className={`text-xs font-semibold outline-none truncate select-text ${isEditing ? 'cursor-text px-1 bg-secondary/40 rounded focus:bg-secondary/80 min-w-[50px] max-w-[120px]' : 'max-w-[200px]'}`}
            style={{ color: textCssColor }}
          >
            {title}
          </span>
          <span className="text-2xs font-medium leading-none px-1 py-0.5 bg-secondary/60 text-muted-foreground rounded-full shrink-0">
            {links.length}
          </span>
        </div>

        {/* Right Side: Action Controls (Visible in edit mode) */}
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
              onClick={() => setIsAddingLink(true)}
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
                <DropdownMenuItem onClick={() => setIsAddingLink(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Link
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => setShowColorPicker(!showColorPicker)}
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
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <DropdownMenuItem
                          key={num}
                          onClick={() => handleUpdateCols(num)}
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
                  onClick={() => onDelete(item.id)}
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

      {/* Nested Grid Layout Container */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-x-hidden overflow-y-auto px-1.5 pt-0 pb-1.5 select-none custom-scrollbar min-h-0 z-0 isolate"
        onMouseDown={(e) => {
          if (!isEditing) return;

          // If clicked on the scrollbar track (clientX is on the right scrollbar track), stop propagation
          const rect = e.currentTarget.getBoundingClientRect();
          const isClickOnScrollbar = e.clientX >= rect.left + e.currentTarget.clientWidth;
          if (isClickOnScrollbar) {
            e.stopPropagation();
            return;
          }

          // Stop propagation only for clicks inside card elements, inputs, forms, and menus 
          // to let empty spaces bubble up and trigger section widget dragging!
          const isCardOrInteractive = e.target.closest('.rounded-card') || 
                                     e.target.closest('button') || 
                                     e.target.closest('form') || 
                                     e.target.closest('input') || 
                                     e.target.closest('[role="menuitem"]') || 
                                     e.target.closest('[role="menu"]');
          if (isCardOrInteractive) {
            e.stopPropagation();
          }
        }}
      >
        {displayLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 min-h-[120px]">
            <Folder size={28} className="text-muted-foreground/30 mb-1.5" />
            <span className="text-xs text-muted-foreground/60 font-medium">Empty Section</span>
            {isEditing && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsAddingLink(true)}
                className="text-2xs text-primary mt-0.5 hover:no-underline px-2 h-auto"
              >
                Add first link
              </Button>
            )}
          </div>
        ) : (
          <ReactGridLayout
            className="layout inner-grid-layout"
            layout={layout}
            cols={cols}
            rowHeight={50}
            margin={[8, 8]}
            compactType="vertical"
            preventCollision={false}
            isDraggable={isEditing}
            isResizable={isEditing}
            draggableHandle=".inner-drag-handle"
            onLayoutChange={handleInnerLayoutChange}
            onDragStart={(layout, oldItem, newItem, placeholder, e) => {
              lastCursorCoordsRef.current = null;
              if (onInnerDragStart) {
                const subItem = links.find(l => l.id === newItem.i);
                if (subItem) onInnerDragStart(subItem, item.id);
              }
            }}
            onDrag={(layout, oldItem, newItem, placeholder, e) => {
              if (onInnerDrag && e) {
                const subItem = links.find(l => l.id === newItem.i);
                if (subItem) {
                  const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX);
                  const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY);
                  if (clientX !== undefined && clientY !== undefined) {
                    lastCursorCoordsRef.current = { x: clientX, y: clientY };
                    onInnerDrag(subItem, item.id, clientX, clientY);
                  }
                }
              }
            }}
            onDragStop={(layout, oldItem, newItem, placeholder, e) => {
              let clientX = e?.clientX ?? (e?.touches?.[0]?.clientX ?? e?.changedTouches?.[0]?.clientX);
              let clientY = e?.clientY ?? (e?.touches?.[0]?.clientY ?? e?.changedTouches?.[0]?.clientY);

              if ((clientX === undefined || clientY === undefined) && lastCursorCoordsRef.current) {
                clientX = lastCursorCoordsRef.current.x;
                clientY = lastCursorCoordsRef.current.y;
              }

              let isOutside = false;
              if (clientX !== undefined && clientY !== undefined && containerRef.current) {
                const parentWidgetEl = containerRef.current.closest('[data-section-id]');
                if (parentWidgetEl) {
                  const parentRect = parentWidgetEl.getBoundingClientRect();
                  isOutside = 
                    clientX < parentRect.left ||
                    clientX > parentRect.right ||
                    clientY < parentRect.top ||
                    clientY > parentRect.bottom;
                }
              }

              if (isOutside) {
                isMovingOutRef.current = true;
              } else {
                isMovingOutRef.current = false;
              }

              if (onInnerDragStop && clientX !== undefined && clientY !== undefined) {
                const subItem = links.find(l => l.id === newItem.i);
                if (subItem) {
                  onInnerDragStop(subItem, item.id, clientX, clientY);
                }
              }
              
              lastCursorCoordsRef.current = null;
            }}
          >
            {displayLinks.map((subItem) => (
              <div key={subItem.id} className="rounded-card">
                {subItem.id === 'drag-placeholder' ? (
                  <div 
                    className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center bg-primary/5 transition-all duration-300 animate-pulse px-3 text-center select-none"
                    style={{ borderColor: borderCssColor }}
                  >
                    <span className="text-2xs font-semibold block w-full text-center" style={{ color: textCssColor }}>
                      {subItem.w === 1 ? 'Add' : 'Drop to Add'}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full">
                    <LinkCard
                      item={subItem}
                      onDelete={handleInnerDelete}
                      onViewModeChange={handleInnerViewModeChange}
                      onUpdateLink={handleInnerUpdateLink}
                      isEditing={isEditing}
                      openInNewTab={openInNewTab}
                      sections={sections}
                      onMoveLink={onMoveLink}
                      parentId={item.id}
                    />
                  </div>
                )}
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>
    </div>
  );
};

export default SectionWidget;
