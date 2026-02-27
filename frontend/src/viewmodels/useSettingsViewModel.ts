import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Workspace, WorkspaceMember } from '../types';
import { useToast } from '../hooks/useToast';

interface SettingsState {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  loading: boolean;
  saving: boolean;
  membersLoading: boolean;
  error: string | null;
}

interface UseSettingsViewModelProps {
  workspace: Workspace;
}

export function useSettingsViewModel({ workspace }: UseSettingsViewModelProps) {
  const [state, setState] = useState<SettingsState>({
    workspace,
    members: [],
    loading: false,
    saving: false,
    membersLoading: false,
    error: null,
  });

  const { showToast } = useToast();

  const [name, setName] = useState(workspace.name);
  const [icon, setIcon] = useState(workspace.icon || '📁');
  const [description, setDescription] = useState(workspace.description || '');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');

  const [notifications, setNotifications] = useState({
    emailOnMention: true,
    emailOnComment: true,
    emailOnShare: false,
    browserNotifications: true,
  });

  useEffect(() => {
    setState(prev => ({ ...prev, workspace }));
    setName(workspace.name);
    setIcon(workspace.icon || '📁');
    setDescription(workspace.description || '');
  }, [workspace]);

  const loadMembers = useCallback(async () => {
    if (!state.workspace) return;
    
    setState(prev => ({ ...prev, membersLoading: true }));
    try {
      const workspaceData = await api.getWorkspaceWithMembers(state.workspace.id);
      setState(prev => ({ ...prev, members: workspaceData.members, membersLoading: false }));
    } catch (error) {
      showToast('Failed to load members', 'error');
      setState(prev => ({ ...prev, membersLoading: false }));
    }
  }, [state.workspace, showToast]);

  const saveGeneral = useCallback(async () => {
    if (!state.workspace) return;

    setState(prev => ({ ...prev, saving: true }));
    try {
      const updated = await api.updateWorkspace(state.workspace.id, { name, icon, description });
      setState(prev => ({ ...prev, workspace: updated, saving: false }));
      showToast('Settings saved', 'success');
      return updated;
    } catch (error) {
      showToast('Failed to save settings', 'error');
      setState(prev => ({ ...prev, saving: false }));
      throw error;
    }
  }, [state.workspace, name, icon, description, showToast]);

  const inviteMember = useCallback(async () => {
    if (!state.workspace || !inviteEmail.trim()) return;

    try {
      await api.inviteUser(state.workspace.id, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadMembers();
      showToast('Invitation sent', 'success');
    } catch (error) {
      showToast('Failed to send invitation', 'error');
      throw error;
    }
  }, [state.workspace, inviteEmail, inviteRole, loadMembers, showToast]);

  const removeMember = useCallback(async (userId: string) => {
    if (!state.workspace) return;

    try {
      await api.removeMember(state.workspace.id, userId);
      await loadMembers();
      showToast('Member removed', 'success');
    } catch (error) {
      showToast('Failed to remove member', 'error');
      throw error;
    }
  }, [state.workspace, loadMembers, showToast]);

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!state.workspace) return;

    try {
      await api.updateMemberRole(state.workspace.id, userId, role);
      await loadMembers();
      showToast('Role updated', 'success');
    } catch (error) {
      showToast('Failed to update role', 'error');
      throw error;
    }
  }, [state.workspace, loadMembers, showToast]);

  const deleteWorkspace = useCallback(async () => {
    if (!state.workspace) return;

    try {
      await api.deleteWorkspace(state.workspace.id);
      showToast('Workspace deleted', 'success');
      return true;
    } catch (error) {
      showToast('Failed to delete workspace', 'error');
      throw error;
    }
  }, [state.workspace, showToast]);

  const updateNotifications = useCallback((key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  }, []);

  const exportMarkdown = useCallback(async () => {
    showToast('Preparing export...', 'info');
    const content = `# ${name}\n\nExported from BlockNote`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export complete', 'success');
  }, [name, showToast]);

  return {
    workspace: state.workspace,
    members: state.members,
    loading: state.loading,
    saving: state.saving,
    membersLoading: state.membersLoading,
    error: state.error,
    
    name,
    setName,
    icon,
    setIcon,
    description,
    setDescription,
    
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    
    notifications,
    updateNotifications,
    
    loadMembers,
    saveGeneral,
    inviteMember,
    removeMember,
    updateMemberRole,
    deleteWorkspace,
    exportMarkdown,
  };
}
