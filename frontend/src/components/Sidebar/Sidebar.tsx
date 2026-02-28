import React, { useState, useEffect } from 'react';
import { PageTree } from './PageTree';
import { Workspace } from '../../types';
import { ShareModal } from '../ShareModal';
import { SettingsModal } from '../SettingsModal';
import { CreatePageModal } from './CreatePageModal';
import { SearchModal } from '../SearchModal';
import { useSidebarViewModel } from '../../viewmodels/useSidebarViewModel';
import { Button } from '../../ui/components/Button/Button';
import { Input } from '../../ui/components/Input/Input';
import { 
  Sidebar as UISidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarSection,
  SidebarItem,
  SidebarGroup
} from '../../ui/components/Sidebar/Sidebar';
import { Spinner } from '../../ui/components/Spinner/Spinner';

interface SidebarProps {
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  token?: string | null;
  onWorkspaceSelect?: (workspaceId: string) => void;
}

type SidebarSectionType = 'pages' | 'favorites' | 'recent' | 'archive' | 'trash';

export function Sidebar({ selectedPageId, onSelectPage, token, onWorkspaceSelect }: SidebarProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [createWorkspaceName, setCreateWorkspaceName] = useState('');
  const [createWorkspaceIcon, setCreateWorkspaceIcon] = useState('📁');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [createPageParentId, setCreatePageParentId] = useState<string | undefined>(undefined);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const {
    workspaceList,
    currentWorkspace,
    loading,
    activeSection,
    setActiveSection,
    searchQuery,
    setSearchQuery,
    filteredPages,
    selectWorkspace,
    createWorkspace,
    createPage,
    toggleFavorite,
    archivePage,
    getCurrentPages,
  } = useSidebarViewModel({ token: token || null });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateWorkspaceClick = () => {
    setCreateWorkspaceName('');
    setCreateWorkspaceIcon('📁');
    setShowCreateWorkspaceModal(true);
  };

  const handleCreateWorkspace = async () => {
    if (!createWorkspaceName.trim()) return;

    setCreatingWorkspace(true);
    try {
      await createWorkspace(createWorkspaceName.trim(), createWorkspaceIcon);
      setShowCreateWorkspaceModal(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleCreatePageClick = (parentId?: string) => {
    setCreatePageParentId(parentId || undefined);
    setShowCreatePageModal(true);
  };

  const handleCreatePage = async () => {
    const page = await createPage('text', createPageParentId);
    if (page) {
      onSelectPage(page.id);
      setShowCreatePageModal(false);
    }
  };

  const handleCreateFolder = async () => {
    const page = await createPage('folder', createPageParentId);
    if (page) {
      setExpandedFolders(prev => new Set(prev).add(page.id));
      setShowCreatePageModal(false);
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleWorkspaceUpdate = (updated: Workspace) => {
    selectWorkspace(updated);
  };

  if (loading) {
    return (
      <div className="p-4">
        <Spinner />
      </div>
    );
  }

  const sections: { id: SidebarSectionType; label: string; icon: string }[] = [
    { id: 'pages', label: 'Pages', icon: '📄' },
    { id: 'favorites', label: 'Favorites', icon: '⭐' },
    { id: 'recent', label: 'Recent', icon: '🕐' },
    { id: 'archive', label: 'Archive', icon: '📦' },
  ];

  const sectionLabels: Record<SidebarSectionType, string> = {
    pages: 'Pages',
    favorites: 'Favorites',
    recent: 'Recent',
    archive: 'Archive',
    trash: 'Trash',
  };

  return (
    <UISidebar>
      <SidebarHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentWorkspace?.icon || '📁'}</span>
            <select
              value={currentWorkspace?.id || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const ws = workspaceList.find(w => w.id === e.target.value);
                if (ws) {
                  selectWorkspace(ws);
                  onWorkspaceSelect?.(ws.id);
                }
              }}
              className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface font-medium"
            >
              {workspaceList.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <Button variant="ghost" size="sm" fullWidth onClick={() => setShowSearchModal(true)}>
              🔍 Search
            </Button>
            <Button variant="ghost" size="sm" fullWidth onClick={() => setShowSettingsModal(true)}>
              ⚙️
            </Button>
            <Button variant="ghost" size="sm" fullWidth onClick={() => setShowShareModal(true)}>
              🔗
            </Button>
          </div>

          <Button variant="ghost" size="sm" fullWidth onClick={handleCreateWorkspaceClick}>
            + New Workspace
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-2 pb-2">
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <SidebarSection>
          <SidebarGroup>
            {sections.map((section) => (
              <SidebarItem
                key={section.id}
                active={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
                icon={<span>{section.icon}</span>}
              >
                {section.label}
              </SidebarItem>
            ))}
          </SidebarGroup>
        </SidebarSection>

        <SidebarSection>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">
              {sectionLabels[activeSection]}
            </span>
            {activeSection === 'pages' && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleCreatePageClick()}>
                  📄+
                </Button>
              </div>
            )}
          </div>
          
          {activeSection === 'pages' ? (
            <PageTree
              pages={filteredPages}
              selectedPageId={selectedPageId}
              onSelectPage={(pageId) => {
                const page = filteredPages.find(p => p.id === pageId);
                if (page?.page_type === 'folder') {
                  onSelectPage(pageId);
                } else {
                  onSelectPage(pageId);
                }
              }}
              expandedFolders={expandedFolders}
              onToggleExpand={toggleFolderExpand}
              onCreatePage={handleCreatePageClick}
              onToggleFavorite={toggleFavorite}
              onArchive={archivePage}
            />
          ) : (
            <PageTree
              pages={getCurrentPages()}
              selectedPageId={selectedPageId}
              onSelectPage={(pageId) => {
                const page = getCurrentPages().find(p => p.id === pageId);
                if (page?.page_type === 'folder') {
                  onSelectPage(pageId);
                } else {
                  onSelectPage(pageId);
                }
              }}
              expandedFolders={expandedFolders}
              onToggleExpand={toggleFolderExpand}
              onCreatePage={undefined}
              onToggleFavorite={activeSection === 'favorites' ? toggleFavorite : undefined}
              onArchive={undefined}
              showActions={false}
            />
          )}
        </SidebarSection>
      </SidebarContent>

      {showCreatePageModal && (
        <CreatePageModal
          onClose={() => setShowCreatePageModal(false)}
          onCreatePage={handleCreatePage}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {showShareModal && currentWorkspace && (
        <ShareModal
          workspaceId={currentWorkspace.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showSettingsModal && currentWorkspace && (
        <SettingsModal
          workspace={currentWorkspace}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={handleWorkspaceUpdate}
        />
      )}

      {showSearchModal && currentWorkspace && (
        <SearchModal
          workspaceId={currentWorkspace.id}
          onClose={() => setShowSearchModal(false)}
          onSelectPage={(pageId) => {
            onSelectPage(pageId);
            setShowSearchModal(false);
          }}
        />
      )}

      {showCreateWorkspaceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Create Workspace</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['📁', '💼', '📚', '🎯', '🚀', '🌟', '💡', '🎨', '🏠', '🌈'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setCreateWorkspaceIcon(icon)}
                      className={`text-xl p-2 rounded-lg transition-colors ${
                        createWorkspaceIcon === icon
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Workspace Name</label>
                <Input
                  value={createWorkspaceName}
                  onChange={(e) => setCreateWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createWorkspaceName.trim()) {
                      handleCreateWorkspace();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" fullWidth onClick={() => setShowCreateWorkspaceModal(false)}>
                Cancel
              </Button>
              <Button 
                fullWidth 
                onClick={handleCreateWorkspace} 
                disabled={!createWorkspaceName.trim() || creatingWorkspace}
                loading={creatingWorkspace}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </UISidebar>
  );
}
