import React, { useMemo, useCallback, type MouseEvent, type PointerEvent, type TouchEvent } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { sanitizeEmbed, extractEmbedSrc } from '@/lib/embedSanitizer';
import type { Iframe } from '../types';

const EmbedContent = React.memo(function EmbedContent({ html }: { html: string }) {
  return (
    <div
      className="w-full h-full embed-html-container"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

const UrlContent = React.memo(function UrlContent({ url, title }: { url?: string; title: string }) {
  return (
    <iframe
      src={url}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="w-full h-full border-0"
    />
  );
});

interface Props {
  item: Iframe;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const IframeWidget = React.memo(({ item, onDelete, isEditing }: Readonly<Props>) => {
  const isEmbed = item.mode === 'embed' && !!item.embedHtml;

  const sanitizedHtml = useMemo(
    () => (isEmbed ? sanitizeEmbed(item.embedHtml) : ''),
    [isEmbed, item.embedHtml]
  );

  const openUrl = isEmbed ? extractEmbedSrc(sanitizedHtml) || item.url : item.url;

  const handleDeleteClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(item.id);
  }, [onDelete, item.id]);

  const stopPointer = useCallback((e: MouseEvent | PointerEvent | TouchEvent) => {
    e.stopPropagation();
  }, []);

  if (isEmbed) {
    return (
      <div className="group card-base relative w-full h-full overflow-hidden rounded-xl">
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-background">
          <EmbedContent html={sanitizedHtml} />
          {isEditing && (
            <div className="absolute inset-0 z-10 bg-transparent drag-handle cursor-grab active:cursor-grabbing" />
          )}
        </div>

        {isEditing && (
          <div
            className="absolute top-1 right-1 z-20 flex items-center gap-1"
            onMouseDown={stopPointer}
            onPointerDown={stopPointer}
            onTouchStart={stopPointer}
          >
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={stopPointer}
              onPointerDown={stopPointer}
              onTouchStart={stopPointer}
              onClick={handleDeleteClick}
              title="Remove widget"
              className="h-6 w-6 rounded-md bg-background/80 backdrop-blur-sm hover:text-red-500 shadow-sm"
            >
              <X size={12} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group card-base flex flex-col w-full h-full overflow-hidden">

      <div className={`flex items-center justify-between px-2
                      bg-secondary
                      border-b border-border flex-shrink-0
                      rounded-t-xl
                      ${isEditing ? 'py-1.5 drag-handle cursor-grab active:cursor-grabbing' : 'py-1'}`}>

        <span className={`font-medium text-foreground truncate mr-2 ${isEditing ? 'text-sm' : 'text-xs'}`}>
          {item.title}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {openUrl && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              onMouseDown={(e) => e.stopPropagation()}
              className={`rounded-md hover:bg-background ${isEditing ? 'h-7 w-7' : 'h-5 w-5'}`}
              title="Open in new tab"
            >
              <a href={openUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={isEditing ? 14 : 10} />
              </a>
            </Button>
          )}
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={stopPointer}
              onPointerDown={stopPointer}
              onTouchStart={stopPointer}
              onClick={handleDeleteClick}
              title="Remove widget"
              className="h-7 w-7 rounded-md hover:text-red-500 hover:bg-background"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Iframe container — iframe first, overlay after, so iframe doesn't get remounted by sibling position change */}
      <div className="relative flex-1 w-full overflow-hidden rounded-b-xl bg-background">
        <UrlContent url={item.url} title={item.title} />
        {isEditing && <div className="absolute inset-0 z-10 bg-transparent" />}
      </div>
    </div>
  );
}, (prev, next) => (
  prev.isEditing === next.isEditing &&
  prev.onDelete === next.onDelete &&
  prev.item.id === next.item.id &&
  prev.item.mode === next.item.mode &&
  prev.item.embedHtml === next.item.embedHtml &&
  prev.item.url === next.item.url &&
  prev.item.title === next.item.title
));

IframeWidget.displayName = 'IframeWidget';

export default IframeWidget;
