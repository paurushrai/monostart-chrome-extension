import React, { useState, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import AddWidgetModal from './components/AddWidgetModal';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import { getLinks, saveLinks, saveLink, deleteLink, getSettings, saveSettings } from './lib/storage';
import { Hexagon, PlusCircle, Edit2, Check, Settings, Link as LinkIcon, Palette, ExternalLink, LayoutGrid, Sparkles } from 'lucide-react';
import AddLinkModal from './components/AddLinkModal';
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
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
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
    setLinks(prevLinks => {
      const updatedLinks = prevLinks.map(link => {
        const item = layout.find(l => l.i === link.id);
        if (!item) return link;
        const isResizableType = ['section', 'todo', 'timer', 'iframe', 'note', 'image', 'label'].includes(link.type);
        return {
          ...link,
          x: item.x,
          y: item.y,
          ...(isResizableType ? { w: item.w, h: item.h } : {})
        };
      });
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  };

  const handleAutoArrange = () => {
    setLinks(prevLinks => {
      const topLevelLinks = prevLinks.filter(link => !link.parentId);
      const nestedLinks = prevLinks.filter(link => link.parentId);

      const typePriority = {
        'google-search': 1,
        'label': 2,
        'section': 3,
        'todo': 4,
        'timer': 4,
        'note': 4,
        'image': 4,
        'iframe': 4,
        'link': 5
      };

      const sorted = [...topLevelLinks].sort((a, b) => {
        const priorityA = typePriority[a.type] || 6;
        const priorityB = typePriority[b.type] || 6;
        if (priorityA !== priorityB) return priorityA - priorityB;
        const nameA = a.title || a.text || a.url || '';
        const nameB = b.title || b.text || b.url || '';
        return nameA.localeCompare(nameB) || a.id.localeCompare(b.id);
      });

      const maxCols = 18;
      const grid = [];

      const updatedTopLevel = sorted.map(link => {
        let w = link.w;
        let h = link.h;

        if (link.type === 'google-search') {
          w = 6;
          h = 1;
        } else if (link.type === 'section') {
          w = w || 6;
          h = h || 4;
        } else if (['todo', 'timer', 'note', 'image'].includes(link.type)) {
          w = w || 3;
          h = h || 3;
        } else if (link.type === 'iframe') {
          w = w || 4;
          h = h || 4;
        } else if (link.type === 'label') {
          w = w || 4;
          h = 1;
        } else {
          w = w || (link.viewMode === 'icon' ? 1 : 3);
          h = h || 1;
        }

        let foundX = 0;
        let foundY = 0;
        let placed = false;
        let r = 0;

        while (!placed) {
          while (grid.length <= r + h) {
            grid.push(Array(maxCols).fill(false));
          }

          for (let c = 0; c <= maxCols - w; c++) {
            let canFit = true;
            for (let i = 0; i < h; i++) {
              for (let j = 0; j < w; j++) {
                if (grid[r + i][c + j]) {
                  canFit = false;
                  break;
                }
              }
              if (!canFit) break;
            }

            if (canFit) {
              foundX = c;
              foundY = r;
              for (let i = 0; i < h; i++) {
                for (let j = 0; j < w; j++) {
                  grid[r + i][c + j] = true;
                }
              }
              placed = true;
              break;
            }
          }
          r++;
        }

        return {
          ...link,
          x: foundX,
          y: foundY,
          w,
          h
        };
      });

      const nextLinks = [...updatedTopLevel, ...nestedLinks];
      saveLinks(nextLinks);
      return nextLinks;
    });
  };

  const handleDelete = async (id) => {
    await deleteLink(id);
    const deleteNested = (items) => {
      return items
        .filter(item => item.id !== id)
        .map(item => {
          if (item.type === 'section' && item.links) {
            return { ...item, links: deleteNested(item.links) };
          }
          return item;
        });
    };
    setLinks(prev => deleteNested(prev));
  };

  const handleViewModeChange = async (id, newMode) => {
    const isIconOnly = newMode === 'icon';
    setLinks(prevLinks => {
      const updateNested = (items) => {
        return items.map(l => {
          if (l.id === id) {
            return {
              ...l,
              viewMode: newMode,
              w: isIconOnly ? 1 : 3,
              h: isIconOnly ? 1 : 1
            };
          }
          if (l.type === 'section' && l.links) {
            return { ...l, links: updateNested(l.links) };
          }
          return l;
        });
      };
      const updatedLinks = updateNested(prevLinks);
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  };

  const handleUpdateLink = async (id, updates) => {
    setLinks(prevLinks => {
      const updateNested = (items) => {
        return items.map(l => {
          if (l.id === id) {
            return { ...l, ...updates };
          }
          if (l.type === 'section' && l.links) {
            return { ...l, links: updateNested(l.links) };
          }
          return l;
        });
      };
      const updatedLinks = updateNested(prevLinks);
      saveLinks(updatedLinks);
      return updatedLinks;
    });
  };

  const handleMoveLink = async (linkId, targetSectionId, targetCoords) => {
    setLinks(prevLinks => {
      let foundLink = null;
      
      // Remove from top level or sections
      let cleanedLinks = prevLinks.filter(l => {
        if (l.id === linkId) {
          foundLink = l;
          return false;
        }
        return true;
      });

      cleanedLinks = cleanedLinks.map(item => {
        if (item.type === 'section' && item.links) {
          const hasLink = item.links.some(l => l.id === linkId);
          if (hasLink) {
            foundLink = item.links.find(l => l.id === linkId);
            return {
              ...item,
              links: item.links.filter(l => l.id !== linkId)
            };
          }
        }
        return item;
      });

      if (!foundLink) return prevLinks;

      let updatedLinks = [];
      if (targetSectionId) {
        // Put in a section
        updatedLinks = cleanedLinks.map(item => {
          if (item.id === targetSectionId && item.type === 'section') {
            const sectionLinks = item.links || [];
            const w = foundLink.viewMode === 'icon' ? 1 : 3;
            const h = 1;

            let newX = 0;
            let newY = 0;

            if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
              const cols = item.cols || 3;
              newX = Math.max(0, Math.min(cols - w, targetCoords.x));
              newY = Math.max(0, targetCoords.y);
            } else {
              // Simple slot finder
              const cols = item.cols || 3;
              const grid = [];
              sectionLinks.forEach(l => {
                const lx = l.x ?? 0;
                const ly = l.y ?? 0;
                const lw = Math.min(l.w ?? (l.viewMode === 'icon' ? 1 : Math.min(3, cols)), cols);
                const lh = l.h ?? 1;
                for (let r = ly; r < ly + lh; r++) {
                  while (grid.length <= r) grid.push(Array(cols).fill(false));
                  for (let c = lx; c < lx + lw && c < cols; c++) {
                    grid[r][c] = true;
                  }
                }
              });

              let placed = false;
              let r = 0;

              while (!placed) {
                while (grid.length <= r + h) grid.push(Array(cols).fill(false));
                for (let c = 0; c <= cols - w; c++) {
                  let canFit = true;
                  for (let i = 0; i < h; i++) {
                    for (let j = 0; j < w; j++) {
                      if (grid[r + i][c + j]) {
                        canFit = false;
                        break;
                      }
                    }
                    if (!canFit) break;
                  }
                  if (canFit) {
                    newX = c;
                    newY = r;
                    placed = true;
                    break;
                  }
                }
                r++;
              }
            }

            return {
              ...item,
              links: [
                ...sectionLinks,
                {
                  ...foundLink,
                  x: newX,
                  y: newY,
                  w,
                  h
                }
              ]
            };
          }
          return item;
        });
      } else {
        // Put back in main dashboard grid
        const w = foundLink.viewMode === 'icon' ? 1 : 3;
        const h = 1;

        let newX = 0;
        let newY = 0;

        if (targetCoords && targetCoords.x !== undefined && targetCoords.y !== undefined) {
          const maxCols = 18;
          newX = Math.max(0, Math.min(maxCols - w, targetCoords.x));
          newY = Math.max(0, targetCoords.y);
        } else {
          const maxCols = 18;
          const maxRows = 12;
          const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
          
          cleanedLinks.forEach(link => {
            if (link.x !== undefined && link.y !== undefined) {
              for (let r = link.y; r < link.y + (link.h || 1) && r < maxRows; r++) {
                for (let c = link.x; c < link.x + (link.w || 1) && c < maxCols; c++) {
                  grid[r][c] = true;
                }
              }
            }
          });

          let placed = false;

          for (let r = 0; r <= maxRows - h && !placed; r++) {
            for (let c = 0; c <= maxCols - w && !placed; c++) {
              let canFit = true;
              for (let i = 0; i < h; i++) {
                for (let j = 0; j < w; j++) {
                  if (grid[r + i][c + j]) {
                    canFit = false;
                    break;
                  }
                }
                if (!canFit) break;
              }
              if (canFit) {
                newX = c;
                newY = r;
                placed = true;
              }
            }
          }

          if (!placed) {
            newX = 0;
            newY = 11;
          }
        }

        updatedLinks = [
          ...cleanedLinks,
          {
            ...foundLink,
            x: newX,
            y: newY,
            w,
            h
          }
        ];
      }

      saveLinks(updatedLinks);
      return updatedLinks;
    });
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
              by{' '}
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => setAddLinkModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <LinkIcon size={14} className="text-muted-foreground" />
                <span>Add Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <LayoutGrid size={14} className="text-muted-foreground" />
                <span>Add Widget</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!isEditing) {
                    setOriginalLinks([...links]);
                    setIsEditing(true);
                  }
                  handleAutoArrange();
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} className="text-muted-foreground" />
                <span>Auto-Arrange Grid</span>
              </DropdownMenuItem>
              
              {!isEditing && (
                <DropdownMenuItem
                  onClick={() => {
                    setOriginalLinks([...links]);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 size={14} className="text-muted-foreground" />
                  <span>Edit Dashboard</span>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setThemeModalOpen(true)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-muted-foreground" />
                  <span>Theme & Appearance</span>
                </div>
                <div 
                  className="w-3.5 h-3.5 rounded-full border border-border shadow-sm" 
                  style={{ backgroundColor: 'hsl(var(--primary))' }} 
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const newSettings = { ...settings, openInNewTab: !settings.openInNewTab };
                  setSettings(newSettings);
                  saveSettings(newSettings);
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-muted-foreground" />
                  <span>Open links in new tab</span>
                </div>
                {settings.openInNewTab && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </DropdownMenuItem>
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
          sections={links.filter(l => l.type === 'section').map(s => ({ id: s.id, title: s.title }))}
          onMoveLink={handleMoveLink}
        />
      </main>


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

      <AddLinkModal
        open={addLinkModalOpen}
        onClose={() => setAddLinkModalOpen(false)}
      />
    </div>
  );
}

export default App;
