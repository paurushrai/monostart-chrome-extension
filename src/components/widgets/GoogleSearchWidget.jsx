import React, { useState } from 'react';
import { Search, X, Mic } from 'lucide-react';
import LensSearchModal from './LensSearchModal';

const LensIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M 7.5 4.2 A 8 8 0 0 1 16.5 4.2"
      stroke="#EA4335"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M 19.8 7.5 A 8 8 0 0 1 19.8 16.5"
      stroke="#FBBC05"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M 16.5 19.8 A 8 8 0 0 1 10 20"
      stroke="#34A853"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <circle cx="6.5" cy="17.5" r="3" fill="#4285F4" />
  </svg>
);

const isLikelyUrl = (text) => /^(https?:\/\/|[\w-]+\.[\w-]+)/.test(text.trim());

const GoogleSearchWidget = ({ item, onDelete, isEditing }) => {
  const [query, setQuery] = useState('');
  const [lensOpen, setLensOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const url = isLikelyUrl(q)
      ? q.startsWith('http') ? q : `https://${q}`
      : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.location.href = url;
  };

  const handleVoice = () => {
    const Recognizer =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognizer) {
      window.open('https://www.google.com/?gws_rd=ssl#spf=1', '_self');
      return;
    }
    const r = new Recognizer();
    r.lang = 'en-US';
    r.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(transcript)}`;
    };
    r.start();
  };

  return (
    <div className="group relative flex items-center justify-center w-full h-full">
      {isEditing && (
        <button
          onClick={() => onDelete(item.id)}
          title="Remove widget"
          className="absolute -top-2 -right-2 z-10 bg-bg-primary dark:bg-dark-bg-primary border border-border dark:border-border-dark rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} className="text-ink dark:text-ink-dark" />
        </button>
      )}
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center w-full max-w-2xl h-12 px-5 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}
      >
        {/* Invisible overlay to prevent input/buttons from blocking drag */}
        {isEditing && <div className="absolute inset-0 z-10 bg-transparent rounded-full" />}
        <Search size={18} className="text-gray-500 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Google or type a URL"
          disabled={isEditing}
          className="flex-1 mx-4 bg-transparent border-0 outline-none text-gray-800 placeholder-gray-500 text-base"
        />
        <button
          type="button"
          onClick={handleVoice}
          title="Voice search"
          className="p-1 flex-shrink-0"
          tabIndex={-1}
        >
          <Mic size={18} color="#4285F4" />
        </button>
        <button
          type="button"
          onClick={() => setLensOpen(true)}
          title="Search any image with Lens"
          className="p-1 ml-1 flex-shrink-0"
          tabIndex={-1}
        >
          <LensIcon size={18} />
        </button>
      </form>

      <LensSearchModal open={lensOpen} onClose={() => setLensOpen(false)} />
    </div>
  );
};

export default GoogleSearchWidget;
