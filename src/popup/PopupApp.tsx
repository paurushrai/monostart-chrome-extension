import { useState, useEffect, useMemo } from 'react';
import { getSettings, getLinks } from '../lib/storage';
import { saveLink } from '../lib/linkRepository';
import { disambiguateSections } from '../lib/disambiguateSections';
import { BookmarkPlus, Check, ExternalLink, Bell, X, Repeat, LayoutGrid, Bookmark, Folder, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Settings, Section } from '../types';

interface PendingReminder {
  firedId: string;
  text: string;
  timeLabel: string;
  recurrence: 'none' | 'daily' | 'weekly';
  firedAt: number;
}

const PENDING_KEY = 'pendingReminders';

interface TabInfo {
  url: string;
  title: string;
  favicon: string;
}

// 'main' = top-level grid · 'header' = header bar · section.id = inside that section
type Destination = 'main' | 'header' | string;

function PopupApp() {
  const [saved, setSaved] = useState(false);
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [pending, setPending] = useState<PendingReminder[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [destination, setDestination] = useState<Destination>('main');

  useEffect(() => {
    getLinks().then((links) => {
      setSections(links.filter((l): l is Section => l.type === 'section'));
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([PENDING_KEY], (result) => {
        const list = Array.isArray(result[PENDING_KEY]) ? (result[PENDING_KEY] as PendingReminder[]) : [];
        setPending(list);
      });
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          setTabInfo({ url: tab.url ?? '', title: tab.title ?? '', favicon: tab.favIconUrl || '' });
        }
      });
    } else {
      setTabInfo({ url: 'https://www.google.com', title: 'Example Site', favicon: '' });
    }

    getSettings().then((settings: Settings) => {
      if (!settings) return;
      if (settings.themeColor) {
        document.documentElement.style.setProperty('--primary', settings.themeColor);
        document.documentElement.style.setProperty('--ring', settings.themeColor);
        
        const parts = settings.themeColor.split(' ');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          document.documentElement.style.setProperty('--theme-hue', parts[0]);
          const baseSat = parseInt(parts[1], 10);
          if (baseSat === 0) {
            document.documentElement.style.setProperty('--theme-sat', '0%');
          } else {
            const mode = settings.themeMode || 'device';
            const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.style.setProperty('--theme-sat', isDark ? '30%' : '40%');
          }
        }
      }
      const applyMode = (mode: Settings['themeMode']) => {
        const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      applyMode(settings.themeMode || 'device');
    });

    const timer = setTimeout(() => setCanSave(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!tabInfo || !canSave) return;
    const base = { type: 'link' as const, url: tabInfo.url, title: tabInfo.title, favicon: tabInfo.favicon };
    if (destination === 'header') {
      await saveLink({ ...base, isHeaderLink: true });
    } else if (destination === 'main') {
      await saveLink({ ...base, viewMode: 'icon', w: 1, h: 1 });
    } else {
      await saveLink({ ...base, viewMode: 'icon', w: 1, h: 1 }, destination);
    }
    setSaved(true);
    setTimeout(() => window.close(), 1500);
  };

  const pageHost = useMemo(() => {
    if (!tabInfo?.url) return '';
    try {
      return new URL(tabInfo.url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [tabInfo?.url]);

  const displaySections = useMemo(() => disambiguateSections(sections), [sections]);
  const destinationLabel =
    destination === 'main' ? 'Main dashboard' :
    destination === 'header' ? 'Header bar' :
    displaySections.find((s) => s.id === destination)?.title ?? 'Main dashboard';
  const DestinationIcon =
    destination === 'main' ? LayoutGrid :
    destination === 'header' ? Bookmark :
    Folder;

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'chrome://newtab' });
    } else {
      window.open('/', '_blank');
    }
  };

  const dismissOne = (firedId: string) => {
    setPending((prev) => prev.filter((p) => p.firedId !== firedId));
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'reminders/dismiss', firedId });
    }
  };

  const dismissAll = () => {
    setPending([]);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'reminders/dismissAll' });
    }
  };

  return (
    <main className="w-[300px] min-w-[300px] bg-bg-primary font-sans p-4 flex flex-col gap-3">
      {pending.length > 0 && (
        <section aria-label="Pending reminders" className="flex flex-col gap-2 -mx-1 -mt-1 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell size={13} className="text-red-600 dark:text-red-400" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-red-700 dark:text-red-300">
                {pending.length} reminder{pending.length === 1 ? '' : 's'}
              </h3>
            </div>
            <Button
              type="button"
              variant="link"
              onClick={dismissAll}
              className="h-auto p-0 text-2xs text-red-700 dark:text-red-300 hover:text-red-700"
            >
              Clear all
            </Button>
          </header>
          <ul className="flex flex-col gap-1 max-h-[180px] overflow-y-auto list-none">
            {pending.map((p) => (
              <li
                key={p.firedId}
                className="group flex items-start gap-2 px-2 py-1.5 rounded-lg bg-white/60 dark:bg-black/20"
              >
                {p.recurrence !== 'none' ? (
                  <Repeat size={11} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <span className="w-[11px]" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink break-words">{p.text}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    {p.timeLabel}
                    {p.recurrence !== 'none' && <span> · {p.recurrence}</span>}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissOne(p.firedId)}
                  title="Dismiss"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-transparent opacity-60 hover:opacity-100"
                >
                  <X size={12} />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h3 className="m-0 text-sm font-semibold text-ink">Save to MonoStart</h3>

      {tabInfo && (
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-bg-hover flex items-center justify-center shrink-0 overflow-hidden">
            {tabInfo.favicon ? (
              <img src={tabInfo.favicon} alt="" className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_1px_3px_rgba(255,255,255,0.2)]" />
            ) : (
              <Bookmark size={16} className="text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate leading-tight">{tabInfo.title}</div>
            {pageHost && <div className="text-2xs text-muted-foreground truncate mt-0.5">{pageHost}</div>}
          </div>
        </div>
      )}

      <div className="h-px bg-border -mx-1" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="popup-destination-trigger" className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Destination</label>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id="popup-destination-trigger"
            type="button"
            variant="outline"
            className="flex items-center gap-2 w-full h-auto px-3 py-2 rounded-sm bg-bg-hover border border-border text-sm text-ink hover:border-primary hover:bg-bg-hover transition-colors"
          >
            <DestinationIcon size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left truncate">{destinationLabel}</span>
            <ChevronDown size={12} className="text-muted-foreground shrink-0" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          collisionPadding={8}
          className="w-[268px] max-h-[min(260px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
        >
          <DropdownMenuItem onClick={() => setDestination('main')} className="text-xs">
            <LayoutGrid size={13} className="mr-2" aria-hidden="true" /> Main dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDestination('header')} className="text-xs">
            <Bookmark size={13} className="mr-2" aria-hidden="true" /> Header bar
          </DropdownMenuItem>
          {displaySections.length > 0 && <DropdownMenuSeparator />}
          {displaySections.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => setDestination(s.id)} className="text-xs">
              <Folder size={13} className="mr-2" aria-hidden="true" /> {s.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={saved || !canSave}
        className={`btn-primary w-full ${saved ? 'success' : ''} ${!canSave && !saved ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {saved ? (
          <><Check size={15} className="mr-1.5" aria-hidden="true" /> Saved!</>
        ) : (
          <><BookmarkPlus size={15} className="mr-1.5" aria-hidden="true" /> Save Link</>
        )}
      </Button>

      <Button
        type="button"
        onClick={handleOpenDashboard}
        className="btn-secondary w-full justify-center flex items-center gap-1.5"
      >
        <ExternalLink size={15} aria-hidden="true" />
        Open Dashboard
      </Button>
    </main>
  );
}

export default PopupApp;
