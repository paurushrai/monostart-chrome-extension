import React, { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const UPLOAD_ENDPOINT = 'https://www.google.com/searchbyimage/upload';

const submitFile = (file) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = UPLOAD_ENDPOINT;
  form.enctype = 'multipart/form-data';

  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'encoded_image';

  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
};

const submitUrl = (url) => {
  window.location.href = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(url)}&sbisrc=tg`;
};

const LensSearchModal = ({ open, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    submitFile(file);
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    const url = imageUrl.trim();
    if (url) submitUrl(url);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-xl bg-[#2a2a2e] border-none text-white p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-5 py-4 border-none text-center">
          <DialogTitle className="text-base font-medium text-white flex-1 text-center leading-none">
            Search any image with Lens
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-lg bg-[#1f1f23] border ${
              dragOver ? 'border-blue-400' : 'border-transparent'
            } px-6 py-10 flex items-center justify-center gap-4 transition-colors`}
          >
            <ImageIcon size={36} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm">
              Drag an image here or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:underline outline-none"
              >
                upload a file
              </button>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex items-center gap-3 my-4 text-xs text-gray-400">
            <div className="flex-1 h-px bg-white/10" />
            <span>OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
            <Input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image link"
              className="flex-1 rounded-full bg-transparent border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-white/30 h-10 px-4"
            />
            <Button
              type="submit"
              disabled={!imageUrl.trim()}
              variant="ghost"
              className="rounded-full text-blue-400 hover:bg-white/5 hover:text-blue-400 disabled:opacity-40"
            >
              Search
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LensSearchModal;
