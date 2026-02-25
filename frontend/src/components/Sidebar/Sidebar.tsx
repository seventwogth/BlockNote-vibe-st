import { useState, useEffect } from 'react';
import { PageTree } from './PageTree';
import { Workspace, Page } from '../../types';
import { api } from '../../services/api';

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

  const handleCreatePage = async (parentId?: string) => {
    if (!selectedWorkspace) return;

    try {
      const page = await api.createPage({
        workspace_id: selectedWorkspace.id,
        parent_id: parentId,
        title: 'Untitled',
      });
      setPages(prev => [...prev, page]);
      onSelectPage(page.id);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
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
      <div className="p-2">
        <select
          value={selectedWorkspace?.id || ''}
          onChange={(e) => {
            const ws = workspaces.find(w => w.id === e.target.value);
            setSelectedWorkspace(ws || null);
          }}
          className="w-full px-2 py-1 text-sm border border-border rounded bg-white"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleCreateWorkspace}
          className="mt-2 w-full px-2 py-1 text-sm text-text-secondary hover:bg-hover rounded text-left"
        >
          + New Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase">
            Pages
          </span>
          <button
            onClick={() => handleCreatePage()}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            +
          </button>
        </div>
        
        <PageTree
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={handleCreatePage}
        />
      </div>
    </div>
  );
}
