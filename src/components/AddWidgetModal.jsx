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
      <DialogContent className="sm:max-w-2xl bg-bg-primary dark:bg-dark-bg-primary border-border dark:border-border-dark p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border dark:border-border-dark">
          <DialogTitle className="text-ink dark:text-ink-dark">Add Widget</DialogTitle>
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
                className="flex h-auto items-start justify-start gap-3 p-4 text-left rounded-lg border-border dark:border-border-dark hover:border-accent hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary transition-all font-normal whitespace-normal"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-bg-secondary dark:bg-dark-bg-secondary flex-shrink-0">
                  <Icon size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink dark:text-ink-dark">
                    {w.name}
                  </div>
                  <div className="text-xs text-ink-muted dark:text-ink-dark mt-0.5">
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
