import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import AddWidgetModal from './components/AddWidgetModal';
import { getLinks, saveLinks, saveLink, deleteLink } from './lib/storage';
import { LayoutGrid, PlusCircle, Edit2, Check, Settings } from 'lucide-react';

function App() {
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [originalLinks, setOriginalLinks] = useState([]);
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

  const handleAddWidget = async (widget) => {
    const saved = await saveLink({
      type: widget.type,
      ...widget.defaults,
    });
    setLinks(prev => [...prev, saved]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary dark:bg-dark-bg-primary transition-colors duration-normal">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <LayoutGrid size={22} className="text-accent" />
          <h1 className="text-xl font-semibold text-ink dark:text-ink-dark tracking-tight m-0">
            My Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3 relative">
          {isEditing && (
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={() => {
                  setLinks(originalLinks);
                  saveLinks(originalLinks); // Revert back to original layout in DB
                  setIsEditing(false);
                }}
                className="btn-secondary text-sm px-4 py-1.5 min-h-0 h-auto"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn-primary success text-sm px-4 py-1.5 min-h-0 h-auto"
              >
                <Check size={16} />
                Save
              </button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-md hover:bg-bg-hover dark:hover:bg-dark-bg-hover transition-colors"
            title="Settings"
          >
            <Settings size={20} className="text-ink dark:text-ink-dark" />
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 p-1.5 w-48 bg-white dark:bg-dark-bg-primary rounded-xl shadow-lg border border-border dark:border-border-dark flex flex-col gap-1 z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-ink dark:text-ink-dark hover:bg-bg-hover dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                >
                  <PlusCircle size={16} />
                  Add Widget
                </button>
                
                {!isEditing && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setOriginalLinks([...links]); // Snapshot state
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-ink dark:text-ink-dark hover:bg-bg-hover dark:hover:bg-dark-bg-hover rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                    <span>Edit Dashboard</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-6 py-2">
        <DashboardGrid
          links={links}
          onLayoutChange={handleLayoutChange}
          onDelete={handleDelete}
          onViewModeChange={handleViewModeChange}
          onUpdateLink={handleUpdateLink}
          isEditing={isEditing}
        />
      </main>

      <AddWidgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleAddWidget}
      />
    </div>
  );
}

export default App;
