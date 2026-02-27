import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Page, PageWithContent } from '../types';

export function usePage(pageId: string | null) {
  const [page, setPage] = useState<PageWithContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (!pageId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const pageData = await api.getPage(pageId);
      setPage(pageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const updatePage = async (data: { title?: string; icon?: string }) => {
    if (!pageId) return;
    
    try {
      const updated = await api.updatePage(pageId, data);
      setPage(prev => prev ? { ...prev, ...updated } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page');
    }
  };

  const saveContent = async (content: Uint8Array) => {
    if (!pageId) return;
    
    try {
      await api.updatePageContent(pageId, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    }
  };

  return {
    page,
    loading,
    error,
    updatePage,
    saveContent,
    reload: loadPage,
  };
}

export function usePages(workspaceId: string | null) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getWorkspacePages(workspaceId);
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const createPage = async (parentId?: string, pageType: 'text' = 'text') => {
    if (!workspaceId) return;
    
    try {
      const page = await api.createPage({
        workspace_id: workspaceId,
        parent_id: parentId,
        title: 'Untitled',
        page_type: pageType,
      });
      setPages(prev => [...prev, page]);
      return page;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
      return null;
    }
  };

  return {
    pages,
    loading,
    error,
    createPage,
    reload: loadPages,
  };
}
