/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import TodoWidget from './widgets/TodoWidget';
import TimerWidget from './widgets/TimerWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(GridLayout);

const DashboardGrid = ({ links, onLayoutChange, onDelete, onViewModeChange, onUpdateLink, isEditing, openInNewTab }) => {
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

  useEffect(() => {
    const handleResize = () => setDims(getDimensions());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const layout = links.map(link => {
    const isGoogleSearch = link.type === 'google-search';
    return {
      i:    link.id,
      x:    link.x ?? 0,
      y:    link.y ?? 0,
      w:    isGoogleSearch ? 6 : (link.w ?? (link.viewMode === 'icon' ? 1 : 3)),
      h:    isGoogleSearch ? 1 : (link.h ?? 1),
      minW: isGoogleSearch ? 6 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1),
      maxW: isGoogleSearch ? 6 : undefined,
      minH: isGoogleSearch ? 1 : (link.type === 'todo' || link.type === 'timer' ? 3 : 1),
      maxH: isGoogleSearch ? 1 : undefined,
      isResizable: isGoogleSearch ? false : undefined
    };
  });

  const renderWidget = (item) => {
    switch (item.type) {
      case 'google-search':
        return <GoogleSearchWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'iframe':
        return <IframeWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'todo':
        return <TodoWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'timer':
        return <TimerWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      default:
        return (
          <LinkCard
            item={item}
            onDelete={onDelete}
            onViewModeChange={onViewModeChange}
            onUpdateLink={onUpdateLink}
            isEditing={isEditing}
            openInNewTab={openInNewTab}
          />
        );
    }
  };

  return (
    <div className="w-full">
      <ReactGridLayout
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
      onLayoutChange={(newLayout) => onLayoutChange(newLayout)}
      >
        {links.map((item) => (
          <div key={item.id} className="rounded-card">
            {renderWidget(item)}
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
};

export default DashboardGrid;
