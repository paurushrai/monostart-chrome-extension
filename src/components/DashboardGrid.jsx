/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ReactGridLayout = WidthProvider(GridLayout);

const DashboardGrid = ({ links, onLayoutChange, onDelete, onViewModeChange, onUpdateLink, isEditing }) => {
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
  const maxY = links.reduce((max, link) => {
    if (link.y !== undefined && link.y !== null) {
      return Math.max(max, link.y + (link.h || 1));
    }
    return max;
  }, 0);

  let nextY = maxY;

  const layout = links.map(link => {
    let x = link.x;
    let y = link.y;

    if (x === undefined || x === null || y === undefined || y === null) {
      x = 0;
      y = nextY;
      nextY += (link.h || 1);
    }

    return {
      i:    link.id,
      x:    x,
      y:    y,
      w:    link.w ?? (link.viewMode === 'icon' ? 1 : 3),
      h:    link.h ?? 1,
      minW: 1,
      minH: 1,
    };
  });

  const renderWidget = (item) => {
    switch (item.type) {
      case 'google-search':
        return <GoogleSearchWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      case 'iframe':
        return <IframeWidget item={item} onDelete={onDelete} isEditing={isEditing} />;
      default:
        return (
          <LinkCard
            item={item}
            onDelete={onDelete}
            onViewModeChange={onViewModeChange}
            onUpdateLink={onUpdateLink}
            isEditing={isEditing}
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
        rowHeight={dims.rowHeight}
      margin={[16, 16]}
      compactType={null}
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
