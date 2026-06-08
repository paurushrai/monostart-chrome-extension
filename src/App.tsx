import { useState, useCallback, useRef, useEffect } from 'react';
import DashboardGrid from './components/DashboardGrid';
import DashboardBackground from './components/DashboardBackground';
import AddWidgetModal from './components/AddWidgetModal';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import AddLinkModal from './components/AddLinkModal';
import AppHeader from './components/AppHeader';
import ClearDashboardModal from './components/ClearDashboardModal';
import FooterGuide from './components/FooterGuide';
import Toast from './components/Toast';
import { useDashboard } from './hooks/useDashboard';
import { useTheme } from './hooks/useTheme';
import { useHeaderDrag } from './hooks/useHeaderDrag';
import { useToast } from './hooks/useToast';
import { disambiguateGroups } from './lib/disambiguateGroups';
import { getItemsSync } from './lib/storage';
import type { WidgetItem, GroupItem } from './types';

interface AddWidgetInput {
  type: WidgetItem['type'];
  defaults?: Partial<WidgetItem>;
}

const EDIT_MODE_KEY = 'dashboardEditMode';
const ORIGINAL_LINKS_KEY = 'dashboardEditOriginalLinks';

function App() {
  const { toast, showToast, dismissToast } = useToast();

  const {
    links,
    replaceLinks,
    handleLayoutChange,
    handleDelete,
    handleViewModeChange,
    handleUpdateLink,
    handleMoveLink,
    handleHeaderLinkReorder,
    handleSwap,
    addWidget,
  } = useDashboard({ onSwapFailed: showToast });

  const { settings, updateSettings } = useTheme();
  const headerDrag = useHeaderDrag(handleHeaderLinkReorder);

  const [isEditing, setIsEditing] = useState<boolean>(() => {
    try { return localStorage.getItem(EDIT_MODE_KEY) === 'true'; } catch { return false; }
  });
  const [originalLinks, setOriginalLinks] = useState<WidgetItem[]>(() => {
    try {
      const raw = localStorage.getItem(ORIGINAL_LINKS_KEY);
      return raw ? (JSON.parse(raw) as WidgetItem[]) : [];
    } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [isHeaderTargeted, setIsHeaderTargeted] = useState(false);

  const preAddSnapshotRef = useRef<WidgetItem[] | null>(null);

  const enterEditModeWithSnapshot = useCallback((snapshot: WidgetItem[]) => {
    setOriginalLinks(snapshot);
    setIsEditing(true);
    try {
      localStorage.setItem(EDIT_MODE_KEY, 'true');
      localStorage.setItem(ORIGINAL_LINKS_KEY, JSON.stringify(snapshot));
    } catch { /* empty */ }
  }, []);

  const enterEditMode = useCallback(() => {
    enterEditModeWithSnapshot(getItemsSync());
  }, [enterEditModeWithSnapshot]);

  const enterEditModeAfterAdd = useCallback(() => {
    if (isEditing) {
      preAddSnapshotRef.current = null;
      return;
    }
    const snapshot = preAddSnapshotRef.current ?? getItemsSync();
    preAddSnapshotRef.current = null;
    enterEditModeWithSnapshot(snapshot);
  }, [isEditing, enterEditModeWithSnapshot]);

  const saveEditMode = useCallback(() => {
    const isEmptyImage = (l: WidgetItem) => l.type === 'image' && !(l.url ?? '').trim();
    const emptyImageCount = links.filter(isEmptyImage).length;
    if (emptyImageCount > 0) {
      replaceLinks(links.filter((l) => !isEmptyImage(l)));
      showToast(`Removed ${emptyImageCount} empty photo widget${emptyImageCount === 1 ? '' : 's'}.`);
    }
    setIsEditing(false);
    setOriginalLinks([]);
    try {
      localStorage.removeItem(EDIT_MODE_KEY);
      localStorage.removeItem(ORIGINAL_LINKS_KEY);
    } catch { /* empty */ }
  }, [links, replaceLinks, showToast]);

  const cancelEditMode = useCallback(() => {
    replaceLinks(originalLinks);
    setIsEditing(false);
    setOriginalLinks([]);
    try {
      localStorage.removeItem(EDIT_MODE_KEY);
      localStorage.removeItem(ORIGINAL_LINKS_KEY);
    } catch { /* empty */ }
  }, [originalLinks, replaceLinks]);

  const handleClearDashboard = useCallback((clearHeaderToo: boolean) => {
    const kept = clearHeaderToo ? [] : links.filter((l) => l.isHeaderLink);
    const removedMain = links.filter((l) => !l.isHeaderLink).length;
    const removedHeader = clearHeaderToo ? links.filter((l) => l.isHeaderLink).length : 0;
    if (removedMain === 0 && removedHeader === 0) return;
    replaceLinks(kept);
    const parts: string[] = [];
    if (removedMain > 0) parts.push(`${removedMain} widget${removedMain === 1 ? '' : 's'}`);
    if (removedHeader > 0) parts.push(`${removedHeader} header link${removedHeader === 1 ? '' : 's'}`);
    showToast(`Cleared ${parts.join(' + ')}. Cancel to undo, or Save to confirm.`);
  }, [links, replaceLinks, showToast]);

  const handleAddWidget = useCallback(async (widget: AddWidgetInput) => {
    if (widget.type === 'google-search' && links.some((l) => l.type === 'google-search')) {
      showToast('Only one Google search widget is allowed.');
      return;
    }
    if (!isEditing) preAddSnapshotRef.current = getItemsSync();
    const saved = await addWidget(widget);
    if (!saved) {
      preAddSnapshotRef.current = null;
      showToast('No room for this widget. Resize or remove something to make space.');
      return;
    }
    enterEditModeAfterAdd();
  }, [addWidget, showToast, links, isEditing, enterEditModeAfterAdd]);

  const groups = disambiguateGroups(
    links.filter((l): l is GroupItem => l.type === 'group'),
  );

  const hasBackground = !!(settings.background && settings.background.type !== 'none' && settings.background.value);

  // theme-init.js injects a one-time <style> (pre-React anti-flash background).
  // Remove it once React mounts so DashboardBackground fully owns the background;
  // otherwise removing/changing the background at runtime wouldn't take effect
  // until a refresh (the injected pseudo-element background would persist).
  useEffect(() => {
    document.getElementById('monostart-bg-init')?.remove();
  }, []);

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-200 ${hasBackground ? 'bg-transparent' : 'bg-background'}`}>
      <DashboardBackground background={settings.background} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <AppHeader
        links={links}
        isEditing={isEditing}
        settings={settings}
        onUpdateSettings={updateSettings}
        onMoveItem={handleMoveLink}
        onDelete={handleDelete}
        onUpdateItem={handleUpdateLink}
        headerDrag={headerDrag}
        onEnterEdit={enterEditMode}
        onSaveEdit={saveEditMode}
        onCancelEdit={cancelEditMode}
        onOpenAddLink={() => {
          if (!isEditing) preAddSnapshotRef.current = getItemsSync();
          setAddLinkModalOpen(true);
        }}
        onOpenAddWidget={() => setModalOpen(true)}
        onOpenTheme={() => setThemeModalOpen(true)}
        onClearDashboard={() => setClearModalOpen(true)}
        isDropTarget={isHeaderTargeted}
      />

      {/* min-h-0 is load-bearing: without it this flex item's min-height:auto
          floors it at the grid's explicit pixel height, so on viewport shrink
          (e.g. moving the window to a smaller screen) the ResizeObserver in
          DashboardGrid re-measures the stale content height and the layout
          never reflows until refresh. */}
      <main className="flex-1 min-h-0">
        <DashboardGrid
          links={links.filter((l) => !l.isHeaderLink)}
          onLayoutChange={handleLayoutChange}
          onDelete={handleDelete}
          onViewModeChange={handleViewModeChange}
          onUpdateItem={handleUpdateLink}
          isEditing={isEditing}
          openInNewTab={settings.openInNewTab}
          groups={groups}
          onMoveItem={handleMoveLink}
          onSwap={handleSwap}
          onHeaderTargetChange={setIsHeaderTargeted}
        />
      </main>
      </div>

      <AddWidgetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleAddWidget}
      />

      <ThemeSettingsModal
        open={themeModalOpen}
        onOpenChange={setThemeModalOpen}
        settings={settings}
        updateSettings={updateSettings}
      />

      <AddLinkModal
        open={addLinkModalOpen}
        onClose={() => {
          if (preAddSnapshotRef.current && !isEditing) preAddSnapshotRef.current = null;
          setAddLinkModalOpen(false);
        }}
        onAfterAdd={enterEditModeAfterAdd}
        groups={groups}
      />

      <ClearDashboardModal
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        links={links}
        onConfirm={handleClearDashboard}
      />

      <FooterGuide />

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
