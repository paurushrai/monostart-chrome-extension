import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import AddWidgetModal from './components/AddWidgetModal';
import { getLinks, saveLinks, saveLink, deleteLink, getSettings, saveSettings } from './lib/storage';
import { LayoutGrid, PlusCircle, Edit2, Check, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function App() {
  const [links, setLinks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [originalLinks, setOriginalLinks] = useState([]);
  const [settings, setSettings] = useState({ openInNewTab: false });

  useEffect(() => {
    getLinks().then(setLinks);
    getSettings().then(setSettings);
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
    const maxY = links.reduce((max, link) => {
      if (link.y !== undefined && link.y !== null) {
        return Math.max(max, link.y + (link.h || 1));
      }
      return max;
    }, 0);

    const widgetHeight = widget.defaults?.h || 1;
    if (maxY + widgetHeight > 12) {
      alert("No space left! Please remove or resize some widgets first.");
      return;
    }

    const saved = await saveLink({
      type: widget.type,
      ...widget.defaults,
    });
    setLinks(prev => [...prev, saved]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <LayoutGrid size={22} className="text-primary" />
          <h1 className="text-xl font-semibold text-foreground tracking-tight m-0">
            My Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3 relative">
          {isEditing && (
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLinks(originalLinks);
                  saveLinks(originalLinks);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditing(false)}
                className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-white"
              >
                <Check size={16} className="mr-1.5" />
                Save
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Settings"
                className="text-foreground"
              >
                <Settings size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Widget
              </DropdownMenuItem>
              
              {!isEditing && (
                <DropdownMenuItem
                  onClick={() => {
                    setOriginalLinks([...links]);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Dashboard
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={settings.openInNewTab}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, openInNewTab: checked };
                  setSettings(newSettings);
                  saveSettings(newSettings);
                }}
              >
                Open links in new tab
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          openInNewTab={settings.openInNewTab}
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
