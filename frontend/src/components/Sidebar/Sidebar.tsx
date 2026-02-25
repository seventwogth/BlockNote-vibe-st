import { useState, useEffect } from 'react';
import { PageTree } from './PageTree';
import { Workspace, Page } from '../../types';
import { api } from '../../services/api';
import { ShareModal } from '../ShareModal';
import { SettingsModal } from '../SettingsModal';
import { CreatePageModal } from './CreatePageModal';

interface SidebarProps {
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  token?: string | null;
}

export function Sidebar({ selectedPageId, onSelectPage, token }: SidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [createPageParentId, setCreatePageParentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (token) {
      loadWorkspaces();
    }
  }, [token]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadPages(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

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

  if (loading) {
    return (
      <div className="p-4 text-text-secondary text-sm">
        Loading...
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
            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-white font-medium"
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
          onClick={handleCreateWorkspace}
          className="mt-2 w-full px-2 py-1 text-sm text-text-secondary hover:bg-hover rounded text-left"
        >
          + New Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex items-center justify-between mb-2 mt-2">
          <span className="text-xs font-semibold text-text-secondary uppercase">
            Pages
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handleCreatePageClick()}
              className="text-sm text-text-secondary hover:text-text-primary"
              title="New Text Page"
            >
              📄+
            </button>
            <button
              onClick={() => handleCreatePageClick()}
              className="text-sm text-text-secondary hover:text-text-primary"
              title="New Board"
            >
              🎨+
            </button>
          </div>
        </div>
        
        <PageTree
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={handleCreatePageClick}
        />
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
    </div>
  );
}
