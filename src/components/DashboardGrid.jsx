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
  const getRowHeight = () => {
    if (typeof window === 'undefined') return 60;
    const width = document.documentElement.clientWidth;
    const cols = 18;
    const containerWidth = width - 48; // px-6 in App.jsx (24px * 2)
    const colWidth = (containerWidth - (16 * (cols - 1))) / cols;
    return Math.max(Math.floor(colWidth), 30);
  };

  const [rowHeight, setRowHeight] = useState(getRowHeight());

  useEffect(() => {
    const handleResize = () => setRowHeight(getRowHeight());
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
    <ReactGridLayout
      className="layout"
      layout={layout}
      cols={18}
      rowHeight={rowHeight}
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
  );
};

export default DashboardGrid;
