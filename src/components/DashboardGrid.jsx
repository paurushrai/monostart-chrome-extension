/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import TodoWidget from './widgets/TodoWidget';
import TimerWidget from './widgets/TimerWidget';
import SectionWidget from './widgets/SectionWidget';
import NoteWidget from './widgets/NoteWidget';
import ImageWidget from './widgets/ImageWidget';
import LabelWidget from './widgets/LabelWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(GridLayout);

const DashboardGrid = ({ 
  links, 
  onLayoutChange, 
  onDelete, 
  onViewModeChange, 
  onUpdateLink, 
  isEditing, 
  openInNewTab,
  sections = [],
  onMoveLink
}) => {
  const getDimensions = () => {
    if (typeof window === 'undefined') return { rowHeight: 60 };
    
    const height = document.documentElement.clientHeight;
    
    const assumedMaxRows = 12; // Most standard single-screen layouts won't exceed 12 rows
    const availableHeight = height - 100; // Account for header and padding
    
    // Calculate the row height needed to fit exactly into the available height
    const rowHeight = Math.max((availableHeight - (16 * (assumedMaxRows - 1))) / assumedMaxRows, 30);
    
    return {
      rowHeight: Math.floor(rowHeight)
    };
  };

  const [dims, setDims] = useState(getDimensions());
  const [activeDragSectionId, setActiveDragSectionId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedItemType, setDraggedItemType] = useState(null);

  // Drag out state for nested folder links
  const [activeDragOutItem, setActiveDragOutItem] = useState(null);
  const [dragOutCoords, setDragOutCoords] = useState(null);

  // Cursor coordinates for section ingestion placeholders
  const [dragCursorCoords, setDragCursorCoords] = useState(null);

  const gridRef = useRef(null);
  const lastInnerDragCoordsRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setDims(getDimensions());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkCollision = (x, y, w, h) => {
    return links.some(item => {
      const isGoogleSearch = item.type === 'google-search';
      const isSection = item.type === 'section';
      const itemW = isGoogleSearch ? 6 : (isSection ? (item.w ?? 6) : (item.w ?? (item.viewMode === 'icon' ? 1 : 3)));
      const itemH = isGoogleSearch ? 1 : (isSection ? (item.h ?? 4) : (item.h ?? 1));
      const itemX = item.x ?? 0;
      const itemY = item.y ?? 0;

      return (
        x < itemX + itemW &&
        x + w > itemX &&
        y < itemY + itemH &&
        y + h > itemY
      );
    });
  };

  const handleInnerDragStart = (item, parentSectionId) => {
    setActiveDragOutItem(item);
    lastInnerDragCoordsRef.current = null;
  };

  const handleInnerDrag = (item, parentSectionId, clientX, clientY) => {
    lastInnerDragCoordsRef.current = { x: clientX, y: clientY };
    const sectionEl = document.querySelector(`[data-section-id="${parentSectionId}"]`);
    if (!sectionEl) return;

    const rect = sectionEl.getBoundingClientRect();
    const isOutside = 
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom;

    if (isOutside) {
      const gridEl = gridRef.current;
      if (gridEl) {
        const gridRect = gridEl.getBoundingClientRect();
        const colWidth = gridRect.width / 18;
        const rowHeight = dims.rowHeight + 16;
        
        const scrollLeft = gridEl.scrollLeft || 0;
        const scrollTop = gridEl.scrollTop || 0;
        const localX = clientX - gridRect.left + scrollLeft;
        const localY = clientY - gridRect.top + scrollTop;
        
        const w = item.viewMode === 'icon' ? 1 : 3;
        const h = 1;
        
        let gridX = Math.floor(localX / colWidth);
        let gridY = Math.floor(localY / rowHeight);
        
        gridX = Math.max(0, Math.min(18 - w, gridX));
        gridY = Math.max(0, gridY);
        
        setActiveDragOutItem(item);
        
        // Block coordinate updates if there is a collision
        if (checkCollision(gridX, gridY, w, h)) {
          setDragOutCoords(null);
        } else {
          setDragOutCoords({ x: gridX, y: gridY });
        }
      }
    } else {
      setDragOutCoords(null);
    }
  };

  const handleInnerDragStop = (item, parentSectionId, clientX, clientY) => {
    let finalX = clientX;
    let finalY = clientY;
    if ((finalX === undefined || finalY === undefined) && lastInnerDragCoordsRef.current) {
      finalX = lastInnerDragCoordsRef.current.x;
      finalY = lastInnerDragCoordsRef.current.y;
    }

    if (finalX !== undefined && finalY !== undefined) {
      const sectionEl = document.querySelector(`[data-section-id="${parentSectionId}"]`);
      if (sectionEl) {
        const rect = sectionEl.getBoundingClientRect();
        const isOutside = 
          finalX < rect.left ||
          finalX > rect.right ||
          finalY < rect.top ||
          finalY > rect.bottom;

        if (isOutside) {
          const gridEl = gridRef.current;
          if (gridEl) {
            const gridRect = gridEl.getBoundingClientRect();
            const colWidth = gridRect.width / 18;
            const rowHeight = dims.rowHeight + 16;
            
            const scrollLeft = gridEl.scrollLeft || 0;
            const scrollTop = gridEl.scrollTop || 0;
            const localX = finalX - gridRect.left + scrollLeft;
            const localY = finalY - gridRect.top + scrollTop;
            
            const w = item.viewMode === 'icon' ? 1 : 3;
            const h = 1;
            
            let gridX = Math.floor(localX / colWidth);
            let gridY = Math.floor(localY / rowHeight);
            
            gridX = Math.max(0, Math.min(18 - w, gridX));
            gridY = Math.max(0, gridY);
            
            // Only drop if there is no collision
            if (!checkCollision(gridX, gridY, w, h)) {
              onMoveLink(item.id, null, { x: gridX, y: gridY });
            }
          }
        }
      }
    }
    setActiveDragOutItem(null);
    setDragOutCoords(null);
    lastInnerDragCoordsRef.current = null;
  };

  const displayLinks = [...links];
  if (activeDragOutItem && dragOutCoords) {
    const w = activeDragOutItem.viewMode === 'icon' ? 1 : 3;
    const h = 1;
    displayLinks.push({
      id: 'drag-out-placeholder',
      type: 'link',
      title: 'Drop to Place',
      url: '',
      w,
      h,
      x: dragOutCoords.x,
      y: dragOutCoords.y
    });
  }

  const layout = displayLinks.map(link => {
    const isSection = link.type === 'section';
    const isGoogleSearch = link.type === 'google-search';
    const isPlaceholder = link.id === 'drag-out-placeholder';
    return {
      i:    link.id,
      x:    link.x ?? 0,
      y:    link.y ?? 0,
      w:    isGoogleSearch ? 6 : (isSection ? (link.w ?? 6) : (link.w ?? (link.viewMode === 'icon' ? 1 : 3))),
      h:    isGoogleSearch ? 1 : (isSection ? (link.h ?? 4) : (link.h ?? 1)),
      minW: isGoogleSearch ? 6 : (isSection ? 3 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1)),
      maxW: isGoogleSearch ? 6 : undefined,
      minH: isGoogleSearch ? 1 : (isSection ? 4 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1)),
      maxH: isGoogleSearch ? 1 : undefined,
      isResizable: isPlaceholder ? false : (isGoogleSearch ? false : (link.type === 'link' ? false : undefined))
    };
  });

  const handleDragStart = (layout, oldItem, newItem, placeholder, e) => {
    const item = links.find(l => l.id === newItem.i);
    setDraggedItem(item || null);
    setDraggedItemType(item?.type || null);
  };

  const handleDrag = (layout, oldItem, newItem, placeholder, e) => {
    if (!e || draggedItemType !== 'link') return;

    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY);

    if (clientX === undefined || clientY === undefined) {
      if (activeDragSectionId) setActiveDragSectionId(null);
      setDragCursorCoords(null);
      return;
    }

    setDragCursorCoords({ x: clientX, y: clientY });

    const sectionElements = document.querySelectorAll('[data-section-id]');
    let targetSectionId = null;

    for (const el of sectionElements) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetSectionId = el.getAttribute('data-section-id');
        break;
      }
    }

    if (targetSectionId !== activeDragSectionId) {
      setActiveDragSectionId(targetSectionId);
    }
  };

  const handleDragStop = (layout, oldItem, newItem, placeholder, e) => {
    setActiveDragSectionId(null);
    setDraggedItemType(null);
    setDraggedItem(null);
    setDragCursorCoords(null);

    if (!e) return;

    // Get cursor release coordinates (supports both mouse mouseup and touch touchend events)
    let clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX);
    let clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY);

    if ((clientX === undefined || clientY === undefined) && dragCursorCoords) {
      clientX = dragCursorCoords.x;
      clientY = dragCursorCoords.y;
    }

    if (clientX === undefined || clientY === undefined) return;

    // Find if the cursor was released inside any SectionWidget container
    const sectionElements = document.querySelectorAll('[data-section-id]');
    let targetSectionId = null;

    for (const el of sectionElements) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetSectionId = el.getAttribute('data-section-id');
        break;
      }
    }

    if (targetSectionId) {
      // Find the dragged link item from the top-level links list
      const draggedLink = links.find(l => l.id === newItem.i && l.type === 'link');
      if (draggedLink) {
        // Calculate target slot coordinates relative to the target section container
        const sectionEl = document.querySelector(`[data-section-id="${targetSectionId}"]`);
        const sectionItem = links.find(l => l.id === targetSectionId);
        
        let targetCoords = undefined;
        if (sectionEl && sectionItem) {
          const containerEl = sectionEl.querySelector('.overflow-y-auto');
          if (containerEl) {
            const rect = containerEl.getBoundingClientRect();
            const scrollLeft = containerEl.scrollLeft || 0;
            const scrollTop = containerEl.scrollTop || 0;
            const localX = clientX - rect.left + scrollLeft;
            const localY = clientY - rect.top + scrollTop;
            
            const cols = sectionItem.cols || 3;
            const isIcon = draggedLink.viewMode === 'icon';
            const w = Math.min(isIcon ? 1 : 3, cols);
            
            const colWidth = rect.width / cols;
            const rowHeight = 58; // 50 rowHeight + 8 margin
            
            let placeholderX = Math.floor(localX / colWidth);
            let placeholderY = Math.floor(localY / rowHeight);
            
            placeholderX = Math.max(0, Math.min(cols - w, placeholderX));
            placeholderY = Math.max(0, placeholderY);
            
            targetCoords = { x: placeholderX, y: placeholderY };
          }
        }

        // Move the link into the target section
        onMoveLink(draggedLink.id, targetSectionId, targetCoords);
      }
    }
  };

  const renderWidget = (item) => {
    if (item.id === 'drag-out-placeholder') {
      return (
        <div className="w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center bg-primary/5 transition-all duration-300 animate-pulse border-primary px-3 text-center select-none">
          <span className="text-2xs font-semibold text-primary block w-full text-center">
            {item.w === 1 ? 'Place' : 'Drop to Place'}
          </span>
        </div>
      );
    }

    switch (item.type) {
      case 'google-search':
        return <GoogleSearchWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'iframe':
        return <IframeWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'todo':
        return <TodoWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'timer':
        return <TimerWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'note':
        return <NoteWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
      case 'image':
        return <ImageWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
      case 'label':
        return <LabelWidget item={item} onDelete={onDelete} onUpdateLink={onUpdateLink} isEditing={isEditing} />;
      case 'section':
        return (
          <SectionWidget
            item={item}
            onDelete={onDelete}
            onUpdateLink={onUpdateLink}
            isEditing={isEditing}
            openInNewTab={openInNewTab}
            sections={sections}
            onMoveLink={onMoveLink}
            isDraggedOver={activeDragSectionId === item.id}
            dragCursorCoords={dragCursorCoords}
            onInnerDragStart={handleInnerDragStart}
            onInnerDrag={handleInnerDrag}
            onInnerDragStop={handleInnerDragStop}
            draggedItem={draggedItem}
          />
        );
      default:
        return (
          <LinkCard
            item={item}
            onDelete={onDelete}
            onViewModeChange={onViewModeChange}
            onUpdateLink={onUpdateLink}
            isEditing={isEditing}
            openInNewTab={openInNewTab}
            sections={sections}
            onMoveLink={onMoveLink}
            parentId={undefined}
          />
        );
    }
  };

  return (
    <div className="w-full" ref={gridRef}>
      <ReactGridLayout
        key={isEditing ? 'edit' : 'view'}
        className="layout"
        layout={layout}
        cols={18}
        maxRows={12}
        rowHeight={dims.rowHeight}
        margin={[16, 16]}
        compactType={null}
        preventCollision={true}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onLayoutChange={(newLayout) => onLayoutChange(newLayout)}
      >
        {displayLinks.map((item) => (
          <div key={item.id} className="rounded-card">
            <div className={`w-full h-full ${isEditing && item.id !== 'drag-out-placeholder' ? 'animate-jiggle' : ''}`}>
              {renderWidget(item)}
            </div>
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
};

export default DashboardGrid;
