import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import AddWidgetModal from './components/AddWidgetModal';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import { getLinks, saveLinks, saveLink, deleteLink, getSettings, saveSettings } from './lib/storage';
import { Hexagon, PlusCircle, Edit2, Check, Settings } from 'lucide-react';
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
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [originalLinks, setOriginalLinks] = useState([]);
  const [settings, setSettings] = useState({ openInNewTab: false, themeMode: 'device', themeColor: '200 73% 52%' });

  useEffect(() => {
    getLinks().then(setLinks);
    getSettings().then((s) => setSettings({ openInNewTab: false, themeMode: 'device', themeColor: '200 73% 52%', ...s }));
    
    // Auto-sync across extension components (popup -> tab)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const listener = (changes, area) => {
        if (area === 'local' && changes.dashboardLinks) {
          setLinks(changes.dashboardLinks.newValue || []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  // Theme Applier
  useEffect(() => {
    if (!settings) return;

    // Apply color and blend hue
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
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--theme-hue');
      document.documentElement.style.removeProperty('--theme-sat');
    }

    // Apply dark mode
    const applyMode = (mode) => {
      const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyMode(settings.themeMode || 'device');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.themeMode === 'device' || !settings.themeMode) {
        applyMode('device');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.themeMode, settings.themeColor]);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Hexagon size={24} strokeWidth={2.5} className="text-primary" />
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-foreground tracking-tight m-0">
              MonoStart
            </h1>
            <span className="text-xs text-muted-foreground font-medium opacity-60 ml-3">
              Developed by{' '}
              <a
                href="https://www.paurushrai.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline hover:opacity-100 transition-all"
              >
                Paurush Rai
              </a>
            </span>
          </div>
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
              <DropdownMenuItem
                onClick={() => setThemeModalOpen(true)}
              >
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                  Theme & Appearance
                </div>
              </DropdownMenuItem>
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

      {/* Footer */}
      <footer className="w-full py-2 flex items-center justify-center border-t border-border bg-background/50 text-xs text-muted-foreground z-10">
        <span className="opacity-70">
          Developed by{' '}
          <a
            href="https://www.paurushrai.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline hover:opacity-100 font-medium transition-all"
          >
            Paurush Rai
          </a>
        </span>
      </footer>

      <AddWidgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleAddWidget}
      />

      <ThemeSettingsModal 
        open={themeModalOpen}
        onOpenChange={setThemeModalOpen}
        settings={settings}
        updateSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
      />
    </div>
  );
}

export default App;
