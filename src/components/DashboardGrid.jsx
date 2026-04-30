/* eslint-disable react/prop-types */
import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import LinkCard from './LinkCard';
import IframeWidget from './IframeWidget';
import GoogleSearchWidget from './widgets/GoogleSearchWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardGrid = ({ links, onLayoutChange, onDelete, onViewModeChange, onUpdateLink, isEditing }) => {
  const layouts = {
    lg: links.map(link => ({
      i:    link.id,
      x:    link.x ?? 0,
      y:    link.y ?? Infinity,
      w:    link.w ?? (link.viewMode === 'icon' ? 1 : 3),
      h:    link.h ?? 1,
      minW: 1,
      minH: 1,
    })),
  };

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
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 18, md: 12, sm: 8, xs: 4, xxs: 2 }}
      rowHeight={60}
      margin={[16, 16]}
      compactType={null}
      isDraggable={isEditing}
      isResizable={isEditing}
      draggableHandle=".drag-handle"
      onLayoutChange={(layout) => onLayoutChange(layout)}
    >
      {links.map((item) => (
        <div key={item.id} className="rounded-card">
          {renderWidget(item)}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardGrid;
