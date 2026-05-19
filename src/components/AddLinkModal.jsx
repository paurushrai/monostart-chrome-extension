import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { saveLink } from '../lib/storage';

const AddLinkModal = ({ open, onClose, sections = [] }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // Try to extract a sensible title and favicon if none is provided
    let finalTitle = title.trim();
    let faviconUrl = '';
    try {
      const urlObj = new URL(finalUrl);
      if (!finalTitle) {
        finalTitle = urlObj.hostname.replace('www.', '');
      }
      faviconUrl = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(finalUrl)}&size=128`;
    } catch (err) {
      if (!finalTitle) finalTitle = finalUrl;
    }

    setIsSubmitting(true);

    const isHeader = location === 'header';
    const sectionId = (location !== 'dashboard' && location !== 'header') ? location : undefined;

    await saveLink({
      url: finalUrl,
      title: finalTitle,
      favicon: faviconUrl,
      type: 'link',
      theme: 'default',
      viewMode: 'icon+text',
      w: 3,
      h: 1,
      isHeaderLink: isHeader
    }, sectionId);
    
    setIsSubmitting(false);
    setUrl('');
    setTitle('');
    setLocation('dashboard');
    onClose();
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
            <Label htmlFor="location">Location</Label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-bg-primary dark:border-border-dark dark:bg-dark-bg-primary px-3 py-2 text-sm text-ink dark:text-ink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <option value="dashboard">Main Dashboard</option>
              <option value="header">Header (Favicon only)</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Folder: {s.title}
                </option>
              ))}
            </select>
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
