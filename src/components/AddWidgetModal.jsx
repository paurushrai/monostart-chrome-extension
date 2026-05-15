import React from 'react';
import { WIDGET_CATALOG } from '../lib/widgetCatalog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AddWidgetModal = ({ open, onClose, onSelect }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-background border-border p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-foreground">Add Widget</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 p-5">
          {WIDGET_CATALOG.map((w) => {
            const Icon = w.icon;
            return (
              <Button
                key={w.type}
                variant="outline"
                onClick={() => {
                  onSelect(w);
                  onClose();
                }}
                className="flex h-auto items-start justify-start gap-3 p-4 text-left rounded-lg border-border hover:border-accent hover:bg-secondary transition-all font-normal whitespace-normal"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-secondary flex-shrink-0">
                  <Icon size={20} className="text-accent" />
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
      </DialogContent>
    </Dialog>
  );
};

export default AddWidgetModal;
