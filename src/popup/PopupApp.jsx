import React, { useState, useEffect } from 'react';
import { saveLink, getSettings } from '../lib/storage';
import { BookmarkPlus, Check, ExternalLink } from 'lucide-react';

function PopupApp() {
  const [saved, setSaved] = useState(false);
  const [tabInfo, setTabInfo] = useState(null);
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          setTabInfo({ url: tab.url, title: tab.title, favicon: tab.favIconUrl || '' });
        }
      });
    } else {
      setTabInfo({ url: 'https://www.google.com', title: 'Example Site', favicon: '' });
    }

    getSettings().then((settings) => {
      if (!settings) return;
      if (settings.themeColor) {
        document.documentElement.style.setProperty('--primary', settings.themeColor);
        document.documentElement.style.setProperty('--ring', settings.themeColor);
        
        const parts = settings.themeColor.split(' ');
        if (parts.length >= 2) {
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
      const applyMode = (mode) => {
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
    await saveLink({ type: 'link', url: tabInfo.url, title: tabInfo.title, favicon: tabInfo.favicon, viewMode: 'icon+text', w: 3, h: 1 });
    setSaved(true);
    setTimeout(() => window.close(), 1500);
  };

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'chrome://newtab' });
    } else {
      window.open('/', '_blank');
    }
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-bg-primary font-sans p-4 flex flex-col gap-3">
      <h3 className="m-0 text-sm font-semibold text-ink">Save to MonoStart</h3>

      {tabInfo && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-hover border border-border overflow-hidden">
          {tabInfo.favicon && (
            <img src={tabInfo.favicon} alt="" className="w-5 h-5 rounded flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_1px_3px_rgba(255,255,255,0.2)]" />
          )}
          <span className="text-sm font-medium text-ink truncate">{tabInfo.title}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saved || !canSave}
        className={`btn-primary w-full ${saved ? 'success' : ''} ${!canSave && !saved ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {saved ? (
          <><Check size={15} /> Saved!</>
        ) : (
          <><BookmarkPlus size={15} /> Save Link</>
        )}
      </button>

      <button
        onClick={handleOpenDashboard}
        className="btn-secondary w-full justify-center flex items-center gap-1.5"
      >
        <ExternalLink size={15} />
        Open Dashboard
      </button>
    </div>
  );
}

export default PopupApp;
