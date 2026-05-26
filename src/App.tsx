import { useState, useCallback, useRef } from 'react';
import DashboardGrid from './components/DashboardGrid';
import AddWidgetModal from './components/AddWidgetModal';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import AddLinkModal from './components/AddLinkModal';
import AppHeader from './components/AppHeader';
import Toast from './components/Toast';
import { useLinks } from './hooks/useLinks';
import { useTheme } from './hooks/useTheme';
import { useHeaderDrag } from './hooks/useHeaderDrag';
import { useToast } from './hooks/useToast';
import { disambiguateSections } from './lib/disambiguateSections';
import { getLinksSync } from './lib/storage';
import type { LinkItem, Section } from './types';

interface AddWidgetInput {
  type: LinkItem['type'];
  defaults?: Partial<LinkItem>;
}

const EDIT_MODE_KEY = 'dashboardEditMode';
const ORIGINAL_LINKS_KEY = 'dashboardEditOriginalLinks';

function App() {
  const {
    links,
    replaceLinks,
    handleLayoutChange,
    handleDelete,
    handleViewModeChange,
    handleUpdateLink,
    handleMoveLink,
    handleHeaderLinkReorder,
    addWidget,
  } = useLinks();

  const { settings, updateSettings } = useTheme();
  const headerDrag = useHeaderDrag(handleHeaderLinkReorder);
  const { toast, showToast, dismissToast } = useToast();

  // Persist edit mode across refresh so a reload mid-edit doesn't drop the user
  // back into view mode (and lose their cancel snapshot). localStorage keeps it
  // synchronous so the first paint already shows the correct mode.
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    try { return localStorage.getItem(EDIT_MODE_KEY) === 'true'; } catch { return false; }
  });
  const [originalLinks, setOriginalLinks] = useState<LinkItem[]>(() => {
    try {
      const raw = localStorage.getItem(ORIGINAL_LINKS_KEY);
      return raw ? (JSON.parse(raw) as LinkItem[]) : [];
    } catch { return []; }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
  const [isHeaderTargeted, setIsHeaderTargeted] = useState(false);

  // Captured at the moment the user opens Add Link / Add Widget. We use this
  // (not the post-add storage state) for originalLinks so that Cancel reverts
  // the add itself, not just subsequent moves.
  const preAddSnapshotRef = useRef<LinkItem[] | null>(null);

  const enterEditModeWithSnapshot = useCallback((snapshot: LinkItem[]) => {
    setOriginalLinks(snapshot);
    setIsEditing(true);
    try {
      localStorage.setItem(EDIT_MODE_KEY, 'true');
      localStorage.setItem(ORIGINAL_LINKS_KEY, JSON.stringify(snapshot));
    } catch { /* quota / private mode */ }
  }, []);

  const enterEditMode = useCallback(() => {
    enterEditModeWithSnapshot(getLinksSync());
  }, [enterEditModeWithSnapshot]);

  // After an Add: enter edit mode using the PRE-add snapshot so Cancel
  // reverts the add too. If the user is already editing, originalLinks is
  // already set to the true pre-edit state — don't overwrite it.
  const enterEditModeAfterAdd = useCallback(() => {
    if (isEditing) {
      preAddSnapshotRef.current = null;
      return;
    }
    const snapshot = preAddSnapshotRef.current ?? getLinksSync();
    preAddSnapshotRef.current = null;
    enterEditModeWithSnapshot(snapshot);
  }, [isEditing, enterEditModeWithSnapshot]);

  const saveEditMode = useCallback(() => {
    setIsEditing(false);
    setOriginalLinks([]);
    try {
      localStorage.removeItem(EDIT_MODE_KEY);
      localStorage.removeItem(ORIGINAL_LINKS_KEY);
    } catch { /* ignore */ }
  }, []);

  const cancelEditMode = useCallback(() => {
    replaceLinks(originalLinks);
    setIsEditing(false);
    setOriginalLinks([]);
    try {
      localStorage.removeItem(EDIT_MODE_KEY);
      localStorage.removeItem(ORIGINAL_LINKS_KEY);
    } catch { /* ignore */ }
  }, [originalLinks, replaceLinks]);

  const handleAddWidget = useCallback(async (widget: AddWidgetInput) => {
    if (widget.type === 'google-search' && links.some((l) => l.type === 'google-search')) {
      showToast('Only one Google search widget is allowed.');
      return;
    }
    // Capture state BEFORE the add so cancel can undo the add itself.
    if (!isEditing) preAddSnapshotRef.current = getLinksSync();
    const saved = await addWidget(widget);
    if (!saved) {
      preAddSnapshotRef.current = null;
      showToast('No room for this widget. Resize or remove something to make space.');
      return;
    }
    enterEditModeAfterAdd();
  }, [addWidget, showToast, links, isEditing, enterEditModeAfterAdd]);

  const sections = disambiguateSections(
    links.filter((l): l is Section => l.type === 'section'),
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background transition-colors duration-200">
      <AppHeader
        links={links}
        isEditing={isEditing}
        settings={settings}
        onUpdateSettings={updateSettings}
        onMoveLink={handleMoveLink}
        onDelete={handleDelete}
        onUpdateLink={handleUpdateLink}
        headerDrag={headerDrag}
        onEnterEdit={enterEditMode}
        onSaveEdit={saveEditMode}
        onCancelEdit={cancelEditMode}
        onOpenAddLink={() => {
          if (!isEditing) preAddSnapshotRef.current = getLinksSync();
          setAddLinkModalOpen(true);
        }}
        onOpenAddWidget={() => setModalOpen(true)}
        onOpenTheme={() => setThemeModalOpen(true)}
        isDropTarget={isHeaderTargeted}
      />

      <main className="flex-1 p-2">
        <DashboardGrid
          links={links.filter((l) => !l.isHeaderLink)}
          onLayoutChange={handleLayoutChange}
          onDelete={handleDelete}
          onViewModeChange={handleViewModeChange}
          onUpdateLink={handleUpdateLink}
          isEditing={isEditing}
          openInNewTab={settings.openInNewTab}
          sections={sections}
          onMoveLink={handleMoveLink}
          onHeaderTargetChange={setIsHeaderTargeted}
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
        updateSettings={updateSettings}
      />

      <AddLinkModal
        open={addLinkModalOpen}
        onClose={() => {
          // If they cancel the modal without adding, drop the captured snapshot.
          if (preAddSnapshotRef.current && !isEditing) preAddSnapshotRef.current = null;
          setAddLinkModalOpen(false);
        }}
        onAfterAdd={enterEditModeAfterAdd}
        sections={sections}
      />

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
