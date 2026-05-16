import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import LensSearchModal from './LensSearchModal';

const LensIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path 
      d="M4 11.5V8C4 5.79086 5.79086 4 8 4H9.5L11 2H14.5L16 4H17" 
      stroke="#4285F4" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path 
      d="M17.5 4C19.9853 4 22 6.01472 22 8.5V12.5" 
      stroke="#FBBC05" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M4 14.5V16C4 18.2091 5.79086 20 8 20H13" 
      stroke="#EA4335" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <circle cx="12.5" cy="12.5" r="3.5" fill="#4285F4" />
    <circle cx="18.5" cy="18.5" r="2.2" fill="#34A853" />
  </svg>
);

const GoogleMicIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#4285F4" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path fill="#34A853" d="M11 18.92h2V22h-2z"/>
    <path fill="#FBBC05" d="M7 11H5c0 1.93.78 3.68 2.05 4.95l1.41-1.41C7.56 13.63 7 12.38 7 11z"/>
    <path fill="#EA4335" d="M12 17c-1.38 0-2.63-.56-3.54-1.47l-1.41 1.41A6.99 6.99 0 0 0 12 19.08c3.86 0 7-3.14 7-7h-2c0 2.76-2.24 5-5 5z"/>
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
          <GoogleMicIcon size={20} />
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
