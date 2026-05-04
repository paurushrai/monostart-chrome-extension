import React, { useState, useEffect } from 'react';
import { saveLink } from '../lib/storage';
import { BookmarkPlus, Check } from 'lucide-react';

function PopupApp() {
  const [saved, setSaved] = useState(false);
  const [tabInfo, setTabInfo] = useState(null);

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
  }, []);

  const handleSave = async () => {
    if (!tabInfo) return;
    await saveLink({ type: 'link', url: tabInfo.url, title: tabInfo.title, favicon: tabInfo.favicon, viewMode: 'icon+text', w: 3, h: 1 });
    setSaved(true);
    setTimeout(() => window.close(), 1500);
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-bg-primary font-sans p-4 flex flex-col gap-3">
      <h3 className="m-0 text-sm font-semibold text-ink">Save to Dashboard</h3>

      {tabInfo && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-hover border border-border overflow-hidden">
          {tabInfo.favicon && (
            <img src={tabInfo.favicon} alt="" className="w-5 h-5 rounded flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-ink truncate">{tabInfo.title}</span>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saved}
        className={`btn-primary w-full ${saved ? 'success' : ''}`}
      >
        {saved ? (
          <><Check size={15} /> Saved!</>
        ) : (
          <><BookmarkPlus size={15} /> Save Link</>
        )}
      </button>
    </div>
  );
}

export default PopupApp;
