import { useState, useCallback } from 'react';
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
import type { LinkItem, Section } from './types';

interface AddWidgetInput {
  type: LinkItem['type'];
  defaults?: Partial<LinkItem>;
}

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

  const [isEditing, setIsEditing] = useState(false);
  const [originalLinks, setOriginalLinks] = useState<LinkItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);
  const [isHeaderTargeted, setIsHeaderTargeted] = useState(false);

  const enterEditMode = useCallback(() => {
    setOriginalLinks([...links]);
    setIsEditing(true);
  }, [links]);

  const saveEditMode = useCallback(() => {
    setIsEditing(false);
  }, []);

  const cancelEditMode = useCallback(() => {
    replaceLinks(originalLinks);
    setIsEditing(false);
  }, [originalLinks, replaceLinks]);

  const handleAddWidget = useCallback(async (widget: AddWidgetInput) => {
    if (widget.type === 'google-search' && links.some((l) => l.type === 'google-search')) {
      showToast('Only one Google search widget is allowed.');
      return;
    }
    const saved = await addWidget(widget);
    if (!saved) {
      showToast('No room for this widget. Resize or remove something to make space.');
    }
  }, [addWidget, showToast, links]);

  const sections = links
    .filter((l): l is Section => l.type === 'section')
    .map((s) => ({ id: s.id, title: s.title }));

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
        onOpenAddLink={() => setAddLinkModalOpen(true)}
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
        onClose={() => setAddLinkModalOpen(false)}
        sections={sections}
      />

      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
