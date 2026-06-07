import { useEffect, useState } from 'react';
import { BookmarkPlus, Folder, FolderOpen, Inbox, Pencil, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collectFolders, readBookmarkTree } from '../lib/bookmarkImport';

interface Preview {
  folderCount: number;
  bookmarkCount: number;
  otherCount: number;
  folderTitles: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ImportBookmarksModal({ open, onClose, onConfirm }: Readonly<Props>) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    readBookmarkTree()
      .then((namedRoots) => {
        if (cancelled) return;
        const { folders, otherBookmarks } = collectFolders(namedRoots);
        const bookmarkCount =
          folders.reduce((acc, f) => acc + f.bookmarks.length, 0) + otherBookmarks.length;
        setPreview({
          folderCount: folders.length,
          bookmarkCount,
          otherCount: otherBookmarks.length,
          folderTitles: folders.map((f) => f.title),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not read bookmarks.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  const totalGroups = preview ? preview.folderCount + (preview.otherCount > 0 ? 1 : 0) : 0;
  const canImport = !!preview && preview.bookmarkCount > 0 && !error;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus size={18} className="text-primary" />
            Import bookmarks
          </DialogTitle>
          <DialogDescription>
            We&apos;ll read your browser&apos;s bookmarks and lay them out as Groups on the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {loading && (
            <p className="text-muted-foreground">Reading bookmarks…</p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && !error && (
            <>
              <div className="rounded-md border border-border bg-gray-100 dark:bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2"><Folder size={14} /> Folders → Groups</span>
                  <span className="font-medium">{preview.folderCount}</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2"><Inbox size={14} /> Direct bookmarks → &quot;Other&quot;</span>
                  <span className="font-medium">{preview.otherCount}</span>
                </div>
                <div className="flex items-center justify-between text-foreground border-t border-border pt-2">
                  <span className="flex items-center gap-2"><FolderOpen size={14} /> Total bookmarks</span>
                  <span className="font-medium">{preview.bookmarkCount}</span>
                </div>
              </div>

              <div className="text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">What happens next:</p>
                <ul className="list-disc list-inside space-y-1 marker:text-muted-foreground/60">
                  <li>Each top-level folder becomes one Group.</li>
                  <li>Nested folders are flattened into their top-level parent.</li>
                  <li>Bookmarks not in any folder land in a single &quot;Other&quot; group.</li>
                  <li>If a Group with the same name already exists, bookmarks are appended (no duplicates).</li>
                  <li className="flex items-center gap-1.5">
                    <Pencil size={12} className="text-primary" />
                    The dashboard enters edit mode so you can review and Save, or Cancel to undo.
                  </li>
                </ul>
              </div>

              {preview.bookmarkCount === 0 && (
                <p className="text-muted-foreground italic">No bookmarks found to import.</p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canImport}
            onClick={() => { onConfirm(); onClose(); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {canImport
              ? `Import ${preview!.bookmarkCount} bookmark${preview!.bookmarkCount === 1 ? '' : 's'} → ${totalGroups} group${totalGroups === 1 ? '' : 's'}`
              : 'Import bookmarks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
