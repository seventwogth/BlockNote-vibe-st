import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Workspace, Page } from '../types';
import { useToast } from '../hooks/useToast';

interface SidebarState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  pages: Page[];
  favorites: Page[];
  recent: Page[];
  archived: Page[];
  loading: boolean;
  error: string | null;
}

type SidebarSection = 'pages' | 'favorites' | 'recent' | 'archive' | 'trash';

interface UseSidebarViewModelProps {
  token: string | null;
}

export function useSidebarViewModel({ token }: UseSidebarViewModelProps) {
  const [state, setState] = useState<SidebarState>({
    workspaces: [],
    currentWorkspace: null,
    pages: [],
    favorites: [],
    recent: [],
    archived: [],
    loading: true,
    error: null,
  });

  const [activeSection, setActiveSection] = useState<SidebarSection>('pages');
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  const loadWorkspaces = useCallback(async () => {
    if (!token) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const workspaces = await api.getWorkspaces() || [];
      setState(prev => ({
        ...prev,
        workspaces,
        currentWorkspace: workspaces[0] || null,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: 'Failed to load workspaces' }));
      showToast('Failed to load workspaces', 'error');
    }
  }, [token, showToast]);

  const loadPages = useCallback(async (workspaceId: string) => {
    try {
      const pages = await api.getWorkspacePages(workspaceId) || [];
      setState(prev => ({ ...prev, pages }));
    } catch (error) {
      showToast('Failed to load pages', 'error');
    }
  }, [showToast]);

  const loadFavorites = useCallback(async (workspaceId: string) => {
    try {
      const favorites = await api.getFavoritePages(workspaceId);
      setState(prev => ({ ...prev, favorites: favorites || [] }));
    } catch (error) {
      showToast('Failed to load favorites', 'error');
    }
  }, [showToast]);

  const loadRecent = useCallback(async () => {
    try {
      const recent = await api.getRecentPages(10);
      setState(prev => ({ ...prev, recent: recent || [] }));
    } catch (error) {
      showToast('Failed to load recent', 'error');
    }
  }, [showToast]);

  const loadArchived = useCallback(async (workspaceId: string) => {
    try {
      const archived = await api.getArchivedPages(workspaceId);
      setState(prev => ({ ...prev, archived: archived || [] }));
    } catch (error) {
      showToast('Failed to load archived', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (token) {
      loadWorkspaces();
    }
  }, [token, loadWorkspaces]);

  useEffect(() => {
    if (state.currentWorkspace) {
      loadPages(state.currentWorkspace.id);
      loadFavorites(state.currentWorkspace.id);
      loadArchived(state.currentWorkspace.id);
    }
  }, [state.currentWorkspace, loadPages, loadFavorites, loadArchived]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const selectWorkspace = useCallback((workspace: Workspace) => {
    setState(prev => ({ ...prev, currentWorkspace: workspace }));
  }, []);

  const createWorkspace = useCallback(async (name: string, icon?: string) => {
    try {
      const workspace = await api.createWorkspace({ name, icon });
      setState(prev => ({
        ...prev,
        workspaces: [...prev.workspaces, workspace],
        currentWorkspace: workspace,
      }));
      showToast('Workspace created!', 'success');
      return workspace;
    } catch (error) {
      showToast('Failed to create workspace', 'error');
      throw error;
    }
  }, [showToast]);

  const createPage = useCallback(async (pageType: 'text' | 'board', parentId?: string) => {
    if (!state.currentWorkspace) return;

    try {
      const page = await api.createPage({
        workspace_id: state.currentWorkspace.id,
        parent_id: parentId,
        title: 'Untitled',
        page_type: pageType,
      });
      setState(prev => ({ ...prev, pages: [...prev.pages, page] }));
      showToast('Page created!', 'success');
      return page;
    } catch (error) {
      showToast('Failed to create page', 'error');
      throw error;
    }
  }, [state.currentWorkspace, showToast]);

  const toggleFavorite = useCallback(async (pageId: string) => {
    try {
      const updated = await api.toggleFavorite(pageId);
      setState(prev => ({
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, is_favorite: updated.is_favorite } : p),
        favorites: updated.is_favorite
          ? [...prev.favorites, { ...updated, is_favorite: true }]
          : prev.favorites.filter(p => p.id !== pageId),
      }));
    } catch (error) {
      showToast('Failed to toggle favorite', 'error');
    }
  }, [showToast]);

  const archivePage = useCallback(async (pageId: string) => {
    if (!state.currentWorkspace) return;

    try {
      await api.archivePage(pageId);
      setState(prev => ({
        ...prev,
        pages: prev.pages.filter(p => p.id !== pageId),
      }));
      loadArchived(state.currentWorkspace.id);
      showToast('Page archived', 'success');
    } catch (error) {
      showToast('Failed to archive page', 'error');
    }
  }, [state.currentWorkspace, loadArchived, showToast]);

  const deletePage = useCallback(async (pageId: string) => {
    try {
      await api.deletePage(pageId);
      setState(prev => ({
        ...prev,
        pages: prev.pages.filter(p => p.id !== pageId),
      }));
      showToast('Page deleted', 'success');
    } catch (error) {
      showToast('Failed to delete page', 'error');
    }
  }, [showToast]);

  const reorderPages = useCallback(async (newPages: import('../types').Page[]) => {
    setState(prev => ({ ...prev, pages: newPages }));
  }, []);

  const filteredPages = state.pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCurrentPages = useCallback(() => {
    switch (activeSection) {
      case 'favorites':
        return state.favorites;
      case 'recent':
        return state.recent;
      case 'archive':
        return state.archived;
      default:
        return filteredPages;
    }
  }, [activeSection, state.favorites, state.recent, state.archived, filteredPages]);

  return {
    ...state,
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
    deletePage,
    reorderPages,
    loadWorkspaces,
    loadPages,
    loadFavorites,
    loadRecent,
    loadArchived,
    getCurrentPages,
  };
}
