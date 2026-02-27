import { useState, useEffect } from 'react';
import { PageTree } from './PageTree';
import { SortablePageList } from './SortablePageList';
import { Workspace, Page } from '../../types';
import { api } from '../../services/api';
import { ShareModal } from '../ShareModal';
import { SettingsModal } from '../SettingsModal';
import { CreatePageModal } from './CreatePageModal';
import { SearchModal } from '../SearchModal';

interface SidebarProps {
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  token?: string | null;
}

type SidebarSection = 'pages' | 'favorites' | 'recent' | 'archive' | 'trash';

export function Sidebar({ selectedPageId, onSelectPage, token }: SidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [favorites, setFavorites] = useState<Page[]>([]);
  const [recent, setRecent] = useState<Page[]>([]);
  const [archived, setArchived] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [createWorkspaceName, setCreateWorkspaceName] = useState('');
  const [createWorkspaceIcon, setCreateWorkspaceIcon] = useState('📁');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [createPageParentId, setCreatePageParentId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<SidebarSection>('pages');

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (token) {
      loadWorkspaces();
    }
  }, [token]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadPages(selectedWorkspace.id);
      loadFavorites(selectedWorkspace.id);
      loadArchived(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    loadRecent();
  }, []);

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

  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces() || [];
      setWorkspaces(data);
      if (data.length > 0) {
        setSelectedWorkspace(data[0]);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async (workspaceId: string) => {
    try {
      const data = await api.getWorkspacePages(workspaceId) || [];
      setPages(data);
    } catch (err) {
      console.error('Failed to load pages:', err);
    }
  };

  const loadFavorites = async (workspaceId: string) => {
    try {
      const data = await api.getFavoritePages(workspaceId);
      setFavorites(data || []);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const loadRecent = async () => {
    try {
      const data = await api.getRecentPages(10);
      setRecent(data || []);
    } catch (err) {
      console.error('Failed to load recent:', err);
    }
  };

  const loadArchived = async (workspaceId: string) => {
    try {
      const data = await api.getArchivedPages(workspaceId);
      setArchived(data || []);
    } catch (err) {
      console.error('Failed to load archived:', err);
    }
  };

  const handleCreateWorkspaceClick = () => {
    setCreateWorkspaceName('');
    setCreateWorkspaceIcon('📁');
    setShowCreateWorkspaceModal(true);
  };

  const handleCreateWorkspace = async () => {
    if (!createWorkspaceName.trim()) return;

    setCreatingWorkspace(true);
    try {
      const workspace = await api.createWorkspace({ 
        name: createWorkspaceName.trim(),
        icon: createWorkspaceIcon,
      });
      setWorkspaces(prev => [...prev, workspace]);
      setSelectedWorkspace(workspace);
      setShowCreateWorkspaceModal(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleCreatePageClick = (parentId?: string) => {
    setCreatePageParentId(parentId);
    setShowCreatePageModal(true);
  };

  const handleCreatePage = async (pageType: 'text' | 'board') => {
    if (!selectedWorkspace) return;

    try {
      const page = await api.createPage({
        workspace_id: selectedWorkspace.id,
        parent_id: createPageParentId,
        title: 'Untitled',
        page_type: pageType,
      });
      setPages(prev => [...prev, page]);
      onSelectPage(page.id);
      setShowCreatePageModal(false);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleWorkspaceUpdate = (updated: Workspace) => {
    setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w));
    setSelectedWorkspace(updated);
  };

  const handleToggleFavorite = async (pageId: string) => {
    try {
      const updated = await api.toggleFavorite(pageId);
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_favorite: updated.is_favorite } : p));
      if (activeSection === 'favorites') {
        setFavorites(prev => prev.map(p => p.id === pageId ? updated : p).filter(p => p.is_favorite));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleArchive = async (pageId: string) => {
    try {
      await api.archivePage(pageId);
      setPages(prev => prev.filter(p => p.id !== pageId));
      loadArchived(selectedWorkspace?.id || '');
    } catch (err) {
      console.error('Failed to archive page:', err);
    }
  };

  const getCurrentPages = () => {
    switch (activeSection) {
      case 'favorites':
        return favorites;
      case 'recent':
        return recent;
      case 'archive':
        return archived;
      default:
        return filteredPages;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        <div className="space-y-2">
          <div className="h-8 skeleton rounded"></div>
          <div className="h-6 skeleton rounded w-3/4"></div>
          <div className="h-6 skeleton rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{selectedWorkspace?.icon || '📁'}</span>
          <select
            value={selectedWorkspace?.id || ''}
            onChange={(e) => {
              const ws = workspaces.find(w => w.id === e.target.value);
              setSelectedWorkspace(ws || null);
            }}
            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface font-medium"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex-1 px-2 py-1 text-xs text-text-secondary hover:bg-hover rounded flex items-center justify-center gap-1"
            title="Search (Ctrl+K)"
          >
            🔍 Search
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 px-2 py-1 text-xs text-text-secondary hover:bg-hover rounded flex items-center justify-center gap-1"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 px-2 py-1 text-xs text-text-secondary hover:bg-hover rounded flex items-center justify-center gap-1"
          >
            🔗 Share
          </button>
        </div>

        <button
          onClick={handleCreateWorkspaceClick}
          className="mt-2 w-full px-2 py-1 text-sm text-text-secondary hover:bg-hover rounded text-left flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>New Workspace</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search pages... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-border rounded bg-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setActiveSection('pages')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              activeSection === 'pages' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover'
            }`}
          >
            📄 Pages
          </button>
          <button
            onClick={() => setActiveSection('favorites')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              activeSection === 'favorites' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover'
            }`}
          >
            ⭐
          </button>
          <button
            onClick={() => setActiveSection('recent')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              activeSection === 'recent' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover'
            }`}
          >
            🕐
          </button>
          <button
            onClick={() => setActiveSection('archive')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              activeSection === 'archive' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover'
            }`}
          >
            📦
          </button>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase">
            {activeSection === 'pages' ? 'Pages' : 
             activeSection === 'favorites' ? 'Favorites' :
             activeSection === 'recent' ? 'Recent' :
             activeSection === 'archive' ? 'Archive' : 'Trash'}
          </span>
          {activeSection === 'pages' && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setCreatePageParentId(undefined);
                  setShowCreatePageModal(true);
                }}
                className="text-sm text-text-secondary hover:text-primary"
                title="New Text Page"
              >
                📄+
              </button>
              <button
                onClick={() => {
                  setCreatePageParentId(undefined);
                  setShowCreatePageModal(true);
                }}
                className="text-sm text-text-secondary hover:text-primary"
                title="New Board"
              >
                🎨+
              </button>
            </div>
          )}
        </div>
        
        {activeSection === 'pages' ? (
          <SortablePageList
            pages={filteredPages}
            selectedPageId={selectedPageId}
            onSelectPage={onSelectPage}
            onReorder={(newPages) => setPages(newPages)}
            onCreatePage={handleCreatePageClick}
            onToggleFavorite={handleToggleFavorite}
            onArchive={handleArchive}
          />
        ) : (
          <PageTree
            pages={getCurrentPages()}
            selectedPageId={selectedPageId}
            onSelectPage={onSelectPage}
            onCreatePage={undefined}
            onToggleFavorite={activeSection === 'favorites' ? handleToggleFavorite : undefined}
            onArchive={undefined}
            showActions={false}
          />
        )}
      </div>

      {showCreatePageModal && (
        <CreatePageModal
          onClose={() => setShowCreatePageModal(false)}
          onCreate={handleCreatePage}
        />
      )}

      {showShareModal && selectedWorkspace && (
        <ShareModal
          workspaceId={selectedWorkspace.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showSettingsModal && selectedWorkspace && (
        <SettingsModal
          workspace={selectedWorkspace}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={handleWorkspaceUpdate}
        />
      )}

      {showSearchModal && selectedWorkspace && (
        <SearchModal
          workspaceId={selectedWorkspace.id}
          onClose={() => setShowSearchModal(false)}
          onSelectPage={(pageId) => {
            onSelectPage(pageId);
            setShowSearchModal(false);
          }}
        />
      )}

      {/* Create Workspace Modal */}
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
                <input
                  type="text"
                  value={createWorkspaceName}
                  onChange={(e) => setCreateWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createWorkspaceName.trim()) {
                      handleCreateWorkspace();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateWorkspaceModal(false)}
                className="flex-1 px-4 py-2 text-text-secondary hover:bg-surface-hover rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!createWorkspaceName.trim() || creatingWorkspace}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingWorkspace ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
