import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ImageIcon } from 'lucide-react';

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    submitFile(file);
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    const url = imageUrl.trim();
    if (url) submitUrl(url);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-[#2a2a2e] text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-medium flex-1 text-center">
            Search any image with Lens
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

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
                className="text-blue-400 hover:underline"
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
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image link"
              className="flex-1 px-4 py-2 rounded-full bg-transparent border border-white/15 text-sm outline-none focus:border-white/30 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!imageUrl.trim()}
              className="px-5 py-2 rounded-full text-sm text-blue-400 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LensSearchModal;
