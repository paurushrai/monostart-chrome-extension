import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import { getLinks, saveLinks, saveLink, deleteLink } from './lib/storage';
import { LayoutGrid, PlusCircle, Edit2, Check } from 'lucide-react';

function App() {
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    getLinks().then(setLinks);
  }, []);

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
    const isIconOnly = newMode === 'icon';
    const updatedLinks = links.map(l => {
      if (l.id === id) {
        return {
          ...l,
          viewMode: newMode,
          w: isIconOnly ? 1 : 3,
          h: isIconOnly ? 1 : 1
        };
      }
      return l;
    });
    setLinks(updatedLinks);
    await saveLinks(updatedLinks);
  };


  const handleUpdateLink = async (id, updates) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, ...updates } : l);
    setLinks(updatedLinks);
    await saveLinks(updatedLinks);
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
            onClick={() => setIsEditing(!isEditing)}
            className={`btn-primary ${isEditing ? 'success' : ''}`}
            title={isEditing ? "Save layout" : "Edit Dashboard"}
          >
            {isEditing ? <><Check size={16} /> Done</> : <><Edit2 size={16} /> Edit Dashboard</>}
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
          onUpdateLink={handleUpdateLink}
          isEditing={isEditing}
        />
      </main>
    </div>
  );
}

export default App;
