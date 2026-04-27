import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import { getLinks, saveLinks, saveLink, deleteLink } from './lib/storage';
import { Moon, Sun, LayoutGrid } from 'lucide-react';
import './App.css';

function App() {
  const [links, setLinks] = useState([]);
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'

  useEffect(() => {
    // Load links
    getLinks().then(setLinks);
    
    // Load theme preference
    const savedTheme = localStorage.getItem('dashboardTheme') || 'system';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [theme]);

  const handleLayoutChange = (layout) => {
    const updatedLinks = links.map(link => {
      const layoutItem = layout.find(l => l.i === link.id);
      if (layoutItem) {
        return { ...link, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
      }
      return link;
    });
    setLinks(updatedLinks);
    saveLinks(updatedLinks);
  };

  const handleDelete = async (id) => {
    await deleteLink(id);
    setLinks(links.filter(l => l.id !== id));
  };

  const handleViewModeChange = async (id, newMode) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, viewMode: newMode } : l);
    setLinks(updatedLinks);
    await saveLinks(updatedLinks);
  };

  const cycleTheme = () => {
    const modes = ['system', 'light', 'dark'];
    const nextMode = modes[(modes.indexOf(theme) + 1) % modes.length];
    setTheme(nextMode);
    localStorage.setItem('dashboardTheme', nextMode);
  };
  
  // For demo/testing: add an iframe widget
  const addDemoWidget = async () => {
    const newWidget = {
      type: 'iframe',
      url: 'https://example.com',
      title: 'Tech News Demo',
    };
    const saved = await saveLink(newWidget);
    setLinks([...links, saved]);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1><LayoutGrid size={24} /> My Dashboard</h1>
        <div className="header-actions">
          <button onClick={addDemoWidget} className="btn-secondary">Add Widget</button>
          <button onClick={cycleTheme} className="theme-toggle" title={`Theme: ${theme}`}>
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <DashboardGrid 
          links={links} 
          onLayoutChange={handleLayoutChange} 
          onDelete={handleDelete}
          onViewModeChange={handleViewModeChange}
        />
      </main>
    </div>
  );
}

export default App;
