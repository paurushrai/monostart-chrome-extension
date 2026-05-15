import { useState, type FormEvent } from 'react';
import { WIDGET_CATALOG } from '../lib/widgetCatalog';
import type { WidgetMeta } from '../lib/widgetCatalog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { isEmbedCode, extractEmbedSrc, extractEmbedTitle, sanitizeEmbed, rewriteToEmbedUrl } from '@/lib/embedSanitizer';
import type { LinkItem } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (widget: { type: LinkItem['type']; defaults?: Partial<LinkItem> }) => void;
}

const AddWidgetModal = ({ open, onClose, onSelect }: Props) => {
  const [step, setStep] = useState(1);
  const [selectedWidget, setSelectedWidget] = useState<WidgetMeta | null>(null);
  const [input, setInput] = useState("");

  const handleClose = () => {
    setStep(1);
    setSelectedWidget(null);
    setInput("");
    onClose();
  };

  const handleSelect = (w: WidgetMeta) => {
    if (w.type === 'iframe') {
      setSelectedWidget(w);
      setStep(2);
    } else {
      onSelect(w);
      handleClose();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (!selectedWidget) return;
    let defaults: Partial<LinkItem>;
    if (isEmbedCode(trimmed)) {
      const sanitized = sanitizeEmbed(trimmed);
      if (!sanitized) return;
      const src = extractEmbedSrc(sanitized);
      defaults = {
        ...selectedWidget.defaults,
        mode: 'embed',
        embedHtml: sanitized,
        url: src,
        title: extractEmbedTitle(sanitized) || 'Embed',
      } as Partial<LinkItem>;
    } else {
      const embedUrl = rewriteToEmbedUrl(trimmed);
      let hostname = 'Embed';
      try {
        if (embedUrl) hostname = new URL(embedUrl).hostname.replace(/^www\./, '');
      } catch {
        // ignore
      }
      defaults = {
        ...selectedWidget.defaults,
        mode: 'url',
        url: embedUrl ?? undefined,
        title: hostname,
      } as Partial<LinkItem>;
    }

    onSelect({ type: selectedWidget.type, defaults });
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-2xl bg-background border-border p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border flex flex-row items-center gap-3 space-y-0">
          {step === 2 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStep(1)}>
              <ArrowLeft size={16} />
            </Button>
          )}
          <DialogTitle className="text-foreground">
            {step === 1 ? 'Add Widget' : `Configure ${selectedWidget?.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-3 p-5">
            {WIDGET_CATALOG.map((w) => {
              const Icon = w.icon;
              return (
                <Button
                  key={w.type}
                  variant="outline"
                  onClick={() => handleSelect(w)}
                  className="flex h-auto items-start justify-start gap-3 p-4 text-left rounded-lg border-border hover:border-primary hover:bg-secondary transition-all font-normal whitespace-normal"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-secondary flex-shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {w.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {w.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">URL or embed code</label>
              <textarea
                autoFocus
                rows={5}
                placeholder={'https://example.com\nor\n<iframe src="https://www.youtube.com/embed/..." ...></iframe>'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Paste a URL for simple embeds, or paste an <code className="font-mono">{'<iframe>'}</code> snippet
                from sites that block direct loading (YouTube, Figma, Spotify, CodePen, etc.).
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={!input.trim()}>
                Embed Widget
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddWidgetModal;
