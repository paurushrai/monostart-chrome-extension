import { useState, useMemo, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ChevronDown, Check, LayoutGrid, Bookmark, Folder } from 'lucide-react';
import { saveItem } from '../lib/itemRepository';
import { siteFaviconUrl } from '../lib/favicon';

interface GroupRef {
  id: string;
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAfterAdd?: () => void;
  groups?: GroupRef[];
}

const AddLinkModal = ({ open, onClose, onAfterAdd, groups = [] }: Readonly<Props>) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { locationLabel, LocationIcon } = useMemo(() => {
    if (location === 'dashboard') return { locationLabel: 'Main Dashboard', LocationIcon: LayoutGrid };
    if (location === 'header') return { locationLabel: 'Header (Favicon only)', LocationIcon: Bookmark };
    const group = groups.find((s) => s.id === location);
    return { locationLabel: group ? `Group: ${group.title}` : 'Main Dashboard', LocationIcon: Folder };
  }, [location, groups]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    let finalTitle = title.trim();
    let faviconUrl = '';
    try {
      const urlObj = new URL(finalUrl);
      if (!finalTitle) {
        finalTitle = urlObj.hostname.replace('www.', '');
      }
      faviconUrl = siteFaviconUrl(finalUrl);
    } catch {
      if (!finalTitle) finalTitle = finalUrl;
    }

    setIsSubmitting(true);

    const isHeader = location === 'header';
    const groupId = (location !== 'dashboard' && location !== 'header') ? location : undefined;

    await saveItem({
      url: finalUrl,
      title: finalTitle,
      favicon: faviconUrl,
      type: 'link',
      theme: 'default',
      viewMode: 'icon',
      w: 1,
      h: 1,
      isHeaderLink: isHeader
    }, groupId);
    
    setIsSubmitting(false);
    setUrl('');
    setTitle('');
    setLocation('dashboard');
    onClose();
    onAfterAdd?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
          <DialogDescription>
            Paste a URL to add a new link card to your dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              placeholder="My Link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-trigger">Location</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="location-trigger"
                  type="button"
                  variant="outline"
                  className="w-full justify-between h-8 px-3 font-normal text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <LocationIcon size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="truncate">{locationLabel}</span>
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground shrink-0 opacity-60" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[260px] overflow-y-auto"
              >
                <DropdownMenuItem onClick={() => setLocation('dashboard')} className="text-sm">
                  <LayoutGrid size={14} className="mr-2 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">Main Dashboard</span>
                  {location === 'dashboard' && <Check size={14} className="ml-2 text-primary" aria-hidden="true" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('header')} className="text-sm">
                  <Bookmark size={14} className="mr-2 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">Header (Favicon only)</span>
                  {location === 'header' && <Check size={14} className="ml-2 text-primary" aria-hidden="true" />}
                </DropdownMenuItem>
                {groups.length > 0 && <DropdownMenuSeparator />}
                {groups.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => setLocation(s.id)} className="text-sm">
                    <Folder size={14} className="mr-2 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 truncate">Folder: {s.title}</span>
                    {location === s.id && <Check size={14} className="ml-2 text-primary shrink-0" aria-hidden="true" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !url.trim()}>
              Add Link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLinkModal;
