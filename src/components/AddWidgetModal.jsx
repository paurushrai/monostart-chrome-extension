import React, { useState } from 'react';
import { WIDGET_CATALOG } from '../lib/widgetCatalog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

const AddWidgetModal = ({ open, onClose, onSelect }) => {
  const [step, setStep] = useState(1);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [url, setUrl] = useState("");

  const handleClose = () => {
    setStep(1);
    setSelectedWidget(null);
    setUrl("");
    onClose();
  };

  const handleSelect = (w) => {
    if (w.type === 'iframe') {
      setSelectedWidget(w);
      setStep(2);
    } else {
      onSelect(w);
      handleClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    let hostname = 'Embed';
    try {
      hostname = new URL(url.trim()).hostname;
    } catch (err) {
      // ignore
    }
    
    onSelect({
      ...selectedWidget,
      defaults: {
        ...selectedWidget.defaults,
        url: url.trim(),
        title: hostname,
      }
    });
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
              <label className="text-sm font-medium text-foreground">Website URL</label>
              <Input
                autoFocus
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={!url.trim()}>
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
