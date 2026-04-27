import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const IframeWidget = ({ item, onDelete }) => {
  return (
    <div className="group card-base flex flex-col w-full h-full overflow-hidden">

      {/* Drag handle / header */}
      <div className="flex items-center justify-between px-3 py-2
                      bg-bg-hover dark:bg-dark-bg-hover
                      border-b border-border dark:border-border-dark
                      cursor-grab active:cursor-grabbing flex-shrink-0">

        <span className="text-sm font-medium text-ink dark:text-ink-dark truncate mr-2">
          {item.title}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="icon-btn"
          >
            <ExternalLink size={11} />
          </a>
          <button
            onClick={() => onDelete(item.id)}
            title="Remove widget"
            className="icon-btn hover:!text-accent-danger hover:!border-accent-danger"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* Overlay to prevent iframe stealing mouse events while dragging */}
        <div className="react-draggable-dragging:block hidden absolute inset-0 z-10 bg-transparent" />
        <iframe
          src={item.url}
          title={item.title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default IframeWidget;
