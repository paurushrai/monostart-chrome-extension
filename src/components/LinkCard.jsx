import React from 'react';
import { ExternalLink, X, Settings2 } from 'lucide-react';
import './LinkCard.css';

const LinkCard = ({ item, onDelete, onViewModeChange }) => {
  const { url, title, favicon, viewMode = 'icon+text' } = item;

  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const nextViewMode = () => {
    const modes = ['icon', 'icon+text'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onViewModeChange(item.id, modes[nextIndex]);
  };

  return (
    <div className={`link-card mode-${viewMode}`}>
      <div className="card-actions">
        <button onClick={nextViewMode} title="Toggle View Mode"><Settings2 size={12} /></button>
        <button onClick={() => onDelete(item.id)} title="Remove"><X size={12} /></button>
      </div>
      
      <a href={url} className="card-content" target={item.type === 'iframe' ? '_self' : '_top'}>
        {favicon ? (
          <img src={favicon} alt="" className="favicon" />
        ) : (
          <div className="fallback-icon"><ExternalLink size={24} /></div>
        )}
        
        {viewMode === 'icon+text' && (
          <div className="text-container">
            <h4 className="title">{title}</h4>
            <span className="domain">{getDomain(url)}</span>
          </div>
        )}
      </a>
    </div>
  );
};

export default LinkCard;
