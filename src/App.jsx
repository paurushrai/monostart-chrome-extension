import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import { getLinks, saveLinks, saveLink, deleteLink } from './lib/storage';
import { Moon, Sun, LayoutGrid, PlusCircle } from 'lucide-react';

function App() {
  const [links, setLinks] = useState([]);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    getLinks().then(setLinks);
    const savedTheme = localStorage.getItem('dashboardTheme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (mode) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const handleLayoutChange = (layout) => {
    const updatedLinks = links.map(link => {
      const item = layout.find(l => l.i === link.id);
      return item ? { ...link, x: item.x, y: item.y, w: item.w, h: item.h } : link;
    });
    setLinks(updatedLinks);
    saveLinks(updatedLinks);
  };

  const handleDelete = async (id) => {
    await deleteLink(id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleViewModeChange = async (id, newMode) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, viewMode: newMode } : l);
    setLinks(updatedLinks);
    await saveLinks(updatedLinks);
  };

  const cycleTheme = () => {
    const modes = ['system', 'light', 'dark'];
    const next = modes[(modes.indexOf(theme) + 1) % modes.length];
    setTheme(next);
    localStorage.setItem('dashboardTheme', next);
    applyTheme(next);
  };

  const addDemoWidget = async () => {
    const saved = await saveLink({
      type: 'iframe',
      url: 'https://www.google.com',
      title: 'Google',
      favicon: '',
    });
    setLinks(prev => [...prev, saved]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary dark:bg-dark-bg-primary transition-colors duration-normal">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-6 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <LayoutGrid size={22} className="text-accent" />
          <h1 className="text-xl font-semibold text-ink dark:text-ink-dark tracking-tight m-0">
            My Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={addDemoWidget}
            className="btn-secondary"
            title="Add iframe widget"
          >
            <PlusCircle size={16} />
            Add Widget
          </button>

          <button
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            className="flex items-center justify-center w-9 h-9 rounded-md
                       text-ink-secondary dark:text-ink-dark-secondary
                       hover:bg-bg-hover dark:hover:bg-dark-bg-hover
                       hover:text-ink dark:hover:text-ink-dark
                       transition-all duration-fast"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-8 py-6">
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
