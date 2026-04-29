import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { WIDGET_CATALOG } from '../lib/widgetCatalog';

const AddWidgetModal = ({ open, onClose, onSelect }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-bg-primary dark:bg-dark-bg-primary border border-border dark:border-border-dark shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-border-dark">
          <h2 className="text-lg font-semibold text-ink dark:text-ink-dark">
            Add Widget
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary transition-colors"
            title="Close"
          >
            <X size={18} className="text-ink dark:text-ink-dark" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          {WIDGET_CATALOG.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.type}
                onClick={() => {
                  onSelect(w);
                  onClose();
                }}
                className="flex items-start gap-3 p-4 text-left rounded-lg border border-border dark:border-border-dark hover:border-accent hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary transition-all"
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;
