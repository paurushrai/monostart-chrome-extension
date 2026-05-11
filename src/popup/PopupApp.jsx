import React, { useState, useEffect } from 'react';
import { saveLink } from '../lib/storage';
import { BookmarkPlus, Check } from 'lucide-react';
import './PopupApp.css';

function PopupApp() {
  const [saved, setSaved] = useState(false);
  const [tabInfo, setTabInfo] = useState(null);

  useEffect(() => {
    // Get current tab info
    if (chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab) {
          setTabInfo({
            url: tab.url,
            title: tab.title,
            favicon: tab.favIconUrl || ''
          });
        }
      });
    } else {
      // Fallback for local testing outside extension
      setTabInfo({
        url: 'https://example.com',
        title: 'Example Site',
        favicon: ''
      });
    }
  }, []);

  const handleSave = async () => {
    if (tabInfo) {
      await saveLink({
        type: 'link',
        url: tabInfo.url,
        title: tabInfo.title,
        favicon: tabInfo.favicon,
        viewMode: 'icon+text', // default mode
      });
      setSaved(true);
      setTimeout(() => window.close(), 1500);
    }
  };

  return (
    <div className="popup-container">
      <h3>Save to Dashboard</h3>
      {tabInfo && (
        <div className="tab-preview">
          {tabInfo.favicon && <img src={tabInfo.favicon} alt="" className="favicon" />}
          <span className="tab-title">{tabInfo.title}</span>
        </div>
      )}
      <button 
        className={`save-btn ${saved ? 'saved' : ''}`} 
        onClick={handleSave}
        disabled={saved}
      >
        {saved ? (
          <><Check size={16} /> Saved!</>
        ) : (
          <><BookmarkPlus size={16} /> Save Link</>
        )}
      </button>
    </div>
  );
}

export default PopupApp;
