import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { LinkItem } from '../types';

interface Counts {
  mainItems: number;
  sections: number;
  bookmarksInsideSections: number;
  headerLinks: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  links: LinkItem[];
  onConfirm: (clearHeaderToo: boolean) => void;
}

const computeCounts = (links: readonly LinkItem[]): Counts => {
  let mainItems = 0;
  let sections = 0;
  let bookmarksInsideSections = 0;
  let headerLinks = 0;
  for (const l of links) {
    if (l.isHeaderLink) {
      headerLinks += 1;
      continue;
    }
    if (l.type === 'section') {
      sections += 1;
      bookmarksInsideSections += (l as { links?: unknown[] }).links?.length ?? 0;
      continue;
    }
    mainItems += 1;
  }
  return { mainItems, sections, bookmarksInsideSections, headerLinks };
};

export default function ClearDashboardModal({ open, onClose, links, onConfirm }: Readonly<Props>) {
  const [clearHeaderToo, setClearHeaderToo] = useState(false);
  const counts = computeCounts(links);

  useEffect(() => {
    if (!open) setClearHeaderToo(false);
  }, [open]);

  const widgetTotal = counts.mainItems + counts.sections;
  const willDeleteHeader = clearHeaderToo ? counts.headerLinks : 0;
  const nothingToClear = widgetTotal === 0 && (!clearHeaderToo || counts.headerLinks === 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} />
            Clear dashboard
          </DialogTitle>
          <DialogDescription>
            This removes widgets from the dashboard. You&apos;re in edit mode, so you can still hit Cancel to undo before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-border bg-gray-100 dark:bg-white/5 p-3 space-y-1.5 text-foreground">
            <div className="flex justify-between">
              <span>Widgets &amp; sections on the main grid</span>
              <span className="font-medium">{widgetTotal}</span>
            </div>
            {counts.bookmarksInsideSections > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground pl-3">
                <span>↳ links inside sections</span>
                <span>{counts.bookmarksInsideSections}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5">
              <span>Header bar links</span>
              <span className="font-medium">{counts.headerLinks}</span>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={clearHeaderToo}
              onChange={(e) => setClearHeaderToo(e.target.checked)}
              className="mt-0.5 accent-destructive w-4 h-4 cursor-pointer"
            />
            <span>
              <span className="text-foreground font-medium">Also clear the header bar links</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                By default the header bar is preserved. Tick this to wipe it too.
              </span>
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {widgetTotal > 0 && <>About to delete <strong>{widgetTotal}</strong> widget{widgetTotal === 1 ? '' : 's'}/section{widgetTotal === 1 ? '' : 's'}</>}
              {widgetTotal > 0 && willDeleteHeader > 0 && <> and </>}
              {willDeleteHeader > 0 && <><strong>{willDeleteHeader}</strong> header link{willDeleteHeader === 1 ? '' : 's'}</>}
              {(widgetTotal > 0 || willDeleteHeader > 0) && <>. Cancel in edit-mode toolbar restores them.</>}
              {nothingToClear && <>Nothing to clear with the current selection.</>}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={nothingToClear}
            onClick={() => { onConfirm(clearHeaderToo); onClose(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 size={14} className="mr-1.5" />
            {clearHeaderToo ? 'Clear everything' : 'Clear widgets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
