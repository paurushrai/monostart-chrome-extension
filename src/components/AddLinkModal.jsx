import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { saveLink } from '../lib/storage';

const AddLinkModal = ({ open, onClose }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
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
      faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
    } catch (err) {
      if (!finalTitle) finalTitle = finalUrl;
    }

    setIsSubmitting(true);
    await saveLink({
      url: finalUrl,
      title: finalTitle,
      favicon: faviconUrl,
      type: 'link',
      theme: 'default',
      viewMode: 'icon+text',
      w: 3,
      h: 1
    });
    
    setIsSubmitting(false);
    setUrl('');
    setTitle('');
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
