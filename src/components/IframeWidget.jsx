import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import './IframeWidget.css';

const IframeWidget = ({ item, onDelete }) => {
  return (
    <div className="iframe-widget">
      <div className="widget-header">
        <span className="widget-title">{item.title}</span>
        <div className="widget-actions">
          <a href={item.url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
            <ExternalLink size={12} />
          </a>
          <button onClick={() => onDelete(item.id)} title="Remove widget">
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="iframe-container">
        <iframe src={item.url} title={item.title} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" />
      </div>
    </div>
  );
};

export default IframeWidget;
