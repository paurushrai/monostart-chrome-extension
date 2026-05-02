import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

const IframeWidget = ({ item, onDelete, isEditing }) => {
  return (
    <div className="group card-base flex flex-col w-full h-full overflow-hidden">

      {/* Drag handle / header */}
      <div className={`flex items-center justify-between px-3 py-2
                      bg-bg-hover dark:bg-dark-bg-hover
                      border-b border-border dark:border-border-dark flex-shrink-0
                      ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>

        <span className="text-sm font-medium text-ink dark:text-ink-dark truncate mr-2">
          {item.title}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-6 w-6 rounded-md hover:bg-bg-primary dark:hover:bg-dark-bg-primary"
            title="Open in new tab"
          >
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} />
            </a>
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              title="Remove widget"
              className="h-6 w-6 rounded-md hover:text-red-500 hover:bg-bg-primary dark:hover:bg-dark-bg-primary"
            >
              <X size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* Overlay to prevent iframe stealing mouse events while dragging */}
        {isEditing && <div className="absolute inset-0 z-10 bg-transparent" />}
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
