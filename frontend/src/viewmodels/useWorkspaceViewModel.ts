import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Workspace, WorkspaceMember } from '../types';
import { useToast } from '../hooks/useToast';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  loading: boolean;
  error: string | null;
}

export function useWorkspaceViewModel(token: string | null) {
  const [state, setState] = useState<WorkspaceState>({
    workspaces: [],
    currentWorkspace: null,
    members: [],
    loading: false,
    error: null,
  });
  
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
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to load workspaces' 
      }));
      showToast('Failed to load workspaces', 'error');
    }
  }, [token, showToast]);

  const selectWorkspace = useCallback(async (workspace: Workspace) => {
    setState(prev => ({ ...prev, currentWorkspace: workspace }));
  }, []);

  const createWorkspace = useCallback(async (name: string, icon?: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const workspace = await api.createWorkspace({ name, icon });
      setState(prev => ({
        ...prev,
        workspaces: [...prev.workspaces, workspace],
        currentWorkspace: workspace,
        loading: false,
      }));
      showToast('Workspace created!', 'success');
      return workspace;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      showToast('Failed to create workspace', 'error');
      throw error;
    }
  }, [showToast]);

  const updateWorkspace = useCallback(async (id: string, data: { name?: string; icon?: string }) => {
    try {
      const updated = await api.updateWorkspace(id, data);
      setState(prev => ({
        ...prev,
        workspaces: prev.workspaces.map(w => w.id === id ? updated : w),
        currentWorkspace: prev.currentWorkspace?.id === id ? updated : prev.currentWorkspace,
      }));
      showToast('Workspace updated', 'success');
      return updated;
    } catch (error) {
      showToast('Failed to update workspace', 'error');
      throw error;
    }
  }, [showToast]);

  const deleteWorkspace = useCallback(async (id: string) => {
    try {
      await api.deleteWorkspace(id);
      setState(prev => ({
        ...prev,
        workspaces: prev.workspaces.filter(w => w.id !== id),
        currentWorkspace: prev.currentWorkspace?.id === id 
          ? prev.workspaces[0] || null 
          : prev.currentWorkspace,
      }));
      showToast('Workspace deleted', 'success');
    } catch (error) {
      showToast('Failed to delete workspace', 'error');
      throw error;
    }
  }, [showToast]);

  const loadMembers = useCallback(async (workspaceId: string) => {
    try {
      const workspace = await api.getWorkspaceWithMembers(workspaceId);
      setState(prev => ({ ...prev, members: workspace.members }));
    } catch (error) {
      showToast('Failed to load members', 'error');
    }
  }, [showToast]);

  const inviteMember = useCallback(async (email: string, role: string) => {
    if (!state.currentWorkspace) return;
    
    try {
      await api.inviteUser(state.currentWorkspace.id, email, role);
      await loadMembers(state.currentWorkspace.id);
      showToast('Invitation sent!', 'success');
    } catch (error) {
      showToast('Failed to send invitation', 'error');
      throw error;
    }
  }, [state.currentWorkspace, loadMembers, showToast]);

  const removeMember = useCallback(async (userId: string) => {
    if (!state.currentWorkspace) return;
    
    try {
      await api.removeMember(state.currentWorkspace.id, userId);
      await loadMembers(state.currentWorkspace.id);
      showToast('Member removed', 'success');
    } catch (error) {
      showToast('Failed to remove member', 'error');
      throw error;
    }
  }, [state.currentWorkspace, loadMembers, showToast]);

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!state.currentWorkspace) return;
    
    try {
      await api.updateMemberRole(state.currentWorkspace.id, userId, role);
      await loadMembers(state.currentWorkspace.id);
      showToast('Role updated', 'success');
    } catch (error) {
      showToast('Failed to update role', 'error');
      throw error;
    }
  }, [state.currentWorkspace, loadMembers, showToast]);

  useEffect(() => {
    if (token) {
      loadWorkspaces();
    }
  }, [token, loadWorkspaces]);

  return {
    ...state,
    loadWorkspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loadMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
}
