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
import { ArrowLeft, Mic, Camera } from "lucide-react";
import { isEmbedCode, extractEmbedSrc, extractEmbedTitle, sanitizeEmbed, rewriteToEmbedUrl } from '@/lib/embedSanitizer';
import type { LinkItem } from '../types';

const PreviewLogo = () => (
  <span
    className="text-3xl font-medium tracking-tight select-none whitespace-nowrap leading-none"
    style={{ fontFamily: '"Product Sans","Google Sans",system-ui,-apple-system,Segoe UI,Roboto,sans-serif' }}
  >
    <span style={{ color: '#4285F4' }}>G</span>
    <span style={{ color: '#EA4335' }}>o</span>
    <span style={{ color: '#FBBC05' }}>o</span>
    <span style={{ color: '#4285F4' }}>g</span>
    <span style={{ color: '#34A853' }}>l</span>
    <span style={{ color: '#EA4335' }}>e</span>
  </span>
);

const PreviewBar = () => (
  <div className="w-full max-w-[220px] h-7 rounded-full bg-white shadow-sm flex items-center px-3 gap-2">
    <span className="w-3 h-3 rounded-full border-2 border-gray-400" />
    <span className="flex-1 text-[10px] text-gray-400 truncate">Search Google or type a URL</span>
    <Mic size={11} className="text-gray-400" />
    <Camera size={11} className="text-gray-400" />
  </div>
);

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (widget: { type: LinkItem['type']; defaults?: Partial<LinkItem> }) => void;
}

const AddWidgetModal = ({ open, onClose, onSelect }: Readonly<Props>) => {
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
    } else if (w.type === 'google-search') {
      setSelectedWidget(w);
      setStep(3);  // variant picker
    } else {
      onSelect(w);
      handleClose();
    }
  };

  const pickGoogleVariant = (variant: 'bar' | 'logo') => {
    if (!selectedWidget) return;
    onSelect({
      type: 'google-search',
      defaults: {
        ...selectedWidget.defaults,
        variant,
        h: variant === 'logo' ? 4 : 1,
      } as Partial<LinkItem>,
    });
    handleClose();
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
          {(step === 2 || step === 3) && (
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStep(1)}>
              <ArrowLeft size={16} />
            </Button>
          )}
          <DialogTitle className="text-foreground">
            {step === 1 ? 'Add Widget' : step === 3 ? 'Choose Google Search style' : `Configure ${selectedWidget?.name}`}
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
                    {Icon && <Icon size={20} className="text-primary" />}
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
        ) : step === 3 ? (
          <div className="p-5 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => pickGoogleVariant('logo')}
              className="group flex flex-col items-stretch gap-3 rounded-xl border border-border bg-secondary p-4 hover:border-primary hover:bg-card transition-all text-left"
            >
              <div className="aspect-[4/3] rounded-lg bg-background flex flex-col items-center justify-center gap-3 px-3 py-4">
                <div className="flex-1 flex items-center justify-center">
                  <PreviewLogo />
                </div>
                <PreviewBar />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Logo + Bar</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Big Google logo above the search bar. Takes 4 rows.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => pickGoogleVariant('bar')}
              className="group flex flex-col items-stretch gap-3 rounded-xl border border-border bg-secondary p-4 hover:border-primary hover:bg-card transition-all text-left"
            >
              <div className="aspect-[4/3] rounded-lg bg-background flex items-center justify-center px-3">
                <PreviewBar />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Bar only</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Just the search bar. Takes 1 row. Compact.
                </div>
              </div>
            </button>
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
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
