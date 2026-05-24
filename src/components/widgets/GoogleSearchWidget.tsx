import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Search, X, History } from 'lucide-react';
import LensSearchModal from './LensSearchModal';
import VoiceSearchOverlay from './VoiceSearchOverlay';
import type { GoogleSearch } from '../../types';

interface Suggestion {
  text: string;
  type: 'history' | 'search';
  url?: string;
}

// SpeechRecognition is a draft API — define a minimal shape we use.
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: ReadonlyArray<{ readonly isFinal: boolean; readonly [index: number]: { readonly transcript: string } }> & {
    readonly length: number;
  };
}

interface SpeechRecognitionLike {
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const LensIcon = ({ size = 20 }: { size?: number }) => (
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

const GoogleMicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#4285F4" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path fill="#34A853" d="M11 18.92h2V22h-2z" />
    <path fill="#FBBC05" d="M7 11H5c0 1.93.78 3.68 2.05 4.95l1.41-1.41C7.56 13.63 7 12.38 7 11z" />
    <path fill="#EA4335" d="M12 17c-1.38 0-2.63-.56-3.54-1.47l-1.41 1.41A6.99 6.99 0 0 0 12 19.08c3.86 0 7-3.14 7-7h-2c0 2.76-2.24 5-5 5z" />
  </svg>
);

const isLikelyUrl = (text: string) => /^(https?:\/\/|[\w-]+\.[\w-]+)/.test(text.trim());

interface Props {
  item: GoogleSearch;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const GoogleSearchWidget = ({ item, onDelete, isEditing }: Props) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lensOpen, setLensOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = query.trim();

      try {
        let historyResults: Suggestion[] = [];
        if (typeof chrome !== 'undefined' && chrome.history) {
          const historyItems = await new Promise<chrome.history.HistoryItem[]>((resolve) => {
            chrome.history.search({ text: q, maxResults: q ? 5 : 8 }, resolve);
          });

          historyResults = historyItems
            .map((h): Suggestion => {
              let text = h.title || h.url;
              if (text && text.endsWith(' - Google Search')) {
                text = text.replace(' - Google Search', '');
              }
              return { text: text || h.url || '', type: 'history', url: h.url };
            });

          // Dedupe by display text (case-insensitive). chrome.history.search
          // returns one entry per visit, so the same query/page can repeat.
          const seenHistory = new Set<string>();
          historyResults = historyResults.filter((h) => {
            const key = h.text.toLowerCase();
            if (seenHistory.has(key)) return false;
            seenHistory.add(key);
            return true;
          });

          // If there is a query, filter strictly. If empty, show recent history.
          if (q) {
            historyResults = historyResults.filter(h => h.text.toLowerCase().includes(q.toLowerCase()));
          }
        }

        // If query is empty, only show history. Don't fetch autocomplete.
        if (!q) {
          setSuggestions(historyResults.slice(0, 8));
          return;
        }

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            { action: 'fetchSuggestions', query: q },
            (response: { data?: [string, string[]] }) => {
              let autoResults: Suggestion[] = [];
              if (response && response.data && response.data[1]) {
                autoResults = response.data[1].map((text): Suggestion => ({ text, type: 'search' }));
              }

              // Merge, deduplicate by text (case insensitive), and slice to top 8
              const combined: Suggestion[] = [...historyResults, ...autoResults];
              const unique: Suggestion[] = [];
              const seen = new Set<string>();
              for (const s of combined) {
                const lower = s.text.toLowerCase();
                if (!seen.has(lower)) {
                  seen.add(lower);
                  unique.push(s);
                }
              }
              setSuggestions(unique.slice(0, 8));
            }
          );
        } else {
          // Fallback
          const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
          const data = (await res.json()) as [string, string[]];
          if (data && data[1]) {
            setSuggestions(data[1].slice(0, 8).map((text): Suggestion => ({ text, type: 'search' })));
          }
        }
      } catch (e) {
        console.error('Failed to fetch suggestions', e);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  // Reset keyboard selection whenever the user types — typing should always
  // surface the typed query, not a stale highlighted suggestion.
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Keep the keyboard-selected suggestion visible inside the dropdown.
  useEffect(() => {
    if (activeIndex < 0) return;
    suggestionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    const handleClick = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Elevate parent grid item z-index so dropdown doesn't get hidden under other widgets
  useEffect(() => {
    if (containerRef.current) {
      const gridItem = containerRef.current.closest('.react-grid-item') as HTMLElement | null;
      if (gridItem) {
        if (showSuggestions && suggestions.length > 0) {
          gridItem.style.zIndex = '100';
        } else {
          gridItem.style.zIndex = '';
        }
      }
    }
  }, [showSuggestions, suggestions.length]);

  const navigateToSuggestion = (suggestion: Suggestion) => {
    setShowSuggestions(false);
    setActiveIndex(-1);
    if (suggestion.type === 'history' && suggestion.url && !suggestion.url.includes('google.com/search')) {
      window.location.href = suggestion.url;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(suggestion.text)}`;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      navigateToSuggestion(suggestions[activeIndex]!);
      return;
    }
    const q = query.trim();
    if (!q) return;
    const url = isLikelyUrl(q)
      ? q.startsWith('http') ? q : `https://${q}`
      : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.location.href = url;
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1 >= suggestions.length ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleVoice = () => {
    const Recognizer =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognizer) {
      window.open('https://www.google.com/?gws_rd=ssl#spf=1', '_self');
      return;
    }
    const r = new Recognizer();
    r.interimResults = true;
    r.lang = 'en-US';

    r.onstart = () => {
      setVoiceOpen(true);
      setVoiceTranscript('');
    };

    r.onresult = (event: SpeechRecognitionResultEvent) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const alt = event.results[i]?.[0];
        if (alt) current += alt.transcript;
      }
      setVoiceTranscript(current);

      if (event.results[0]?.isFinal) {
        setQuery(current);
        setTimeout(() => {
          setVoiceOpen(false);
          window.location.href = `https://www.google.com/search?q=${encodeURIComponent(current)}`;
        }, 800);
      }
    };

    r.onerror = () => {
      setVoiceOpen(false);
      setVoiceTranscript('');
    };

    r.onend = () => {
      // If it ends without a final result, we can close it
      setTimeout(() => setVoiceOpen(false), 500);
    };

    r.start();
  };

  return (
    <div className="group relative flex flex-col items-center justify-center w-full h-full gap-4">
      {isEditing && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
          title="Remove widget"
          className="absolute -top-2 -right-2 z-[100] h-6 w-6 rounded-full bg-background border border-border hover:text-red-500 shadow-md flex items-center justify-center cursor-pointer"
        >
          <X size={12} />
        </button>
      )}

      {item.showGoogleLogo && (
        <img
          src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
          alt="Google"
          draggable={false}
          className="h-10 sm:h-12 w-auto select-none pointer-events-none dark:brightness-110"
        />
      )}

      <div
        ref={containerRef}
        className={`relative w-full max-w-2xl bg-white transition-shadow z-50 ${showSuggestions && suggestions.length > 0 ? 'rounded-t-[24px] rounded-b-none shadow-xl' : 'rounded-full shadow-md hover:shadow-lg'}`}
      >
        <form
          onSubmit={handleSubmit}
          className={`relative flex items-center w-full h-12 px-5 ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}
        >
          {/* Invisible overlay to prevent input/buttons from blocking drag */}
          {isEditing && <div className="absolute inset-0 z-10 bg-transparent rounded-full" />}

          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleInputKeyDown}
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

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white border-t border-gray-100 rounded-b-[24px] py-2 overflow-hidden shadow-xl text-left">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                ref={(el) => { suggestionRefs.current[idx] = el; }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex items-center px-5 py-1.5 cursor-pointer ${idx === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                onClick={() => navigateToSuggestion(suggestion)}
              >
                {suggestion.type === 'history' ? (
                  <History size={16} className="text-gray-400 mr-4 flex-shrink-0" />
                ) : (
                  <Search size={16} className="text-gray-400 mr-4 flex-shrink-0" />
                )}
                <span className="text-[15px] font-medium text-gray-800 truncate">{suggestion.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <LensSearchModal open={lensOpen} onClose={() => setLensOpen(false)} />
      <VoiceSearchOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        transcript={voiceTranscript}
      />
    </div>
  );
};

export default GoogleSearchWidget;
