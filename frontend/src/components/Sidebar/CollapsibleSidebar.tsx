import { useState, useEffect } from 'react';
import { Workspace, Page } from '../../types';
import { api } from '../../services/api';

interface SidebarProps {
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  token?: string | null;
}

type SidebarSection = 'pages' | 'favorites' | 'recent' | 'archive' | 'trash';

interface CollapsibleSidebarProps extends SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function CollapsibleSidebar({ 
  selectedPageId, 
  onSelectPage, 
  token,
  isCollapsed,
  onToggleCollapse 
}: CollapsibleSidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [favorites, setFavorites] = useState<Page[]>([]);
  const [recent, setRecent] = useState<Page[]>([]);
  const [archived, setArchived] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<SidebarSection>('pages');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPageType, setCreatePageType] = useState<'text' | 'board'>('text');
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);

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

  const handleCreateWorkspace = async () => {
    const name = prompt('Enter workspace name:');
    if (!name) return;
    try {
      const workspace = await api.createWorkspace({ name });
      setWorkspaces(prev => [...prev, workspace]);
      setSelectedWorkspace(workspace);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const handleCreatePage = async () => {
    if (!selectedWorkspace) return;
    try {
      const page = await api.createPage({
        workspace_id: selectedWorkspace.id,
        parent_id: createParentId,
        title: 'Untitled',
        page_type: createPageType,
      });
      setPages(prev => [...prev, page]);
      onSelectPage(page.id);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
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

  const togglePageExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const renderPageTree = (pageList: Page[], level = 0): React.ReactNode => {
    return pageList
      .filter(p => !p.parent_id || level > 0)
      .map(page => {
        const children = pageList.filter(p => p.parent_id === page.id);
        const isExpanded = expandedPages.has(page.id);
        const hasChildren = children.length > 0;

        return (
          <div key={page.id}>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-hover group ${
                selectedPageId === page.id ? 'bg-hover' : ''
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => onSelectPage(page.id)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePageExpand(page.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center text-xs text-text-secondary hover:bg-surface rounded"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
              {!hasChildren && <span className="w-4" />}
              
              <span className="text-sm truncate flex-1">
                {page.icon || '📄'} {page.title || 'Untitled'}
              </span>
              
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(page.id);
                  }}
                  className="p-1 text-xs hover:bg-surface rounded"
                  title={page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {page.is_favorite ? '⭐' : '☆'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateParentId(page.id);
                    setCreatePageType('text');
                    setShowCreateModal(true);
                  }}
                  className="p-1 text-xs hover:bg-surface rounded"
                  title="Add subpage"
                >
                  +
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(page.id);
                  }}
                  className="p-1 text-xs hover:bg-surface rounded"
                  title="Archive"
                >
                  📦
                </button>
              </div>
            </div>
            
            {hasChildren && isExpanded && (
              <div>
                {renderPageTree(children, level + 1)}
              </div>
            )}
          </div>
        );
      });
  };

  const getCurrentPages = () => {
    switch (activeSection) {
      case 'favorites': return favorites;
      case 'recent': return recent;
      case 'archive': return archived;
      default: return filteredPages;
    }
  };

  const sectionIcons: Record<SidebarSection, string> = {
    pages: '📄',
    favorites: '⭐',
    recent: '🕐',
    archive: '📦',
    trash: '🗑️',
  };

  const sectionLabels: Record<SidebarSection, string> = {
    pages: 'Pages',
    favorites: 'Favorites',
    recent: 'Recent',
    archive: 'Archive',
    trash: 'Trash',
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
      {!isCollapsed && (
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
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleCreateWorkspace}
            className="mt-2 w-full px-2 py-1 text-sm text-text-secondary hover:bg-hover rounded text-left"
          >
            + New Workspace
          </button>
        </div>
      )}

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-border rounded bg-surface focus:outline-none focus:border-primary"
            />
          </div>
          
          <div className="flex gap-1 mb-2">
            {(['pages', 'favorites', 'recent', 'archive'] as SidebarSection[]).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex-1 px-2 py-1 text-xs rounded ${
                  activeSection === section ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover'
                }`}
                title={sectionLabels[section]}
              >
                {sectionIcons[section]}
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">
              {sectionLabels[activeSection]}
            </span>
            {activeSection === 'pages' && (
              <button
                onClick={() => {
                  setCreateParentId(undefined);
                  setShowCreateModal(true);
                }}
                className="text-sm text-text-secondary hover:text-primary"
                title="New Page"
              >
                +
              </button>
            )}
          </div>
          
          {activeSection === 'pages' ? (
            <div className="space-y-0.5">
              {renderPageTree(filteredPages)}
            </div>
          ) : (
            <div className="space-y-0.5">
              {getCurrentPages().map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-hover ${
                    selectedPageId === page.id ? 'bg-hover' : ''
                  }`}
                  onClick={() => onSelectPage(page.id)}
                >
                  <span className="text-sm truncate">
                    {page.icon || '📄'} {page.title || 'Untitled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center py-4 gap-4">
          {(['pages', 'favorites', 'recent', 'archive'] as SidebarSection[]).map((section) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                onToggleCollapse();
              }}
              className={`p-2 rounded ${activeSection === section ? 'bg-primary text-white' : 'hover:bg-hover text-text-secondary'}`}
              title={sectionLabels[section]}
            >
              <span className="text-xl">{sectionIcons[section]}</span>
            </button>
          ))}
          
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded hover:bg-hover text-text-secondary mt-auto"
            title="Expand sidebar"
          >
            <span className="text-xl">→</span>
          </button>
        </div>
      )}

      {!isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary hover:bg-hover"
          title="Collapse sidebar"
        >
          ←
        </button>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-lg p-4 w-64">
            <h3 className="text-sm font-medium mb-3">Create new page</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setCreatePageType('text');
                  handleCreatePage();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded flex items-center gap-2"
              >
                <span>📄</span> Text Page
              </button>
              <button
                onClick={() => {
                  setCreatePageType('board');
                  handleCreatePage();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded flex items-center gap-2"
              >
                <span>🎨</span> Board
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-3 w-full px-3 py-2 text-sm text-text-secondary hover:bg-hover rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
