import { useState, useEffect } from 'react';
import { WorkspaceWithMembers } from '../types';
import { api } from '../services/api';

interface ShareModalProps {
  workspaceId: string;
  onClose: () => void;
}

export function ShareModal({ workspaceId, onClose }: ShareModalProps) {
  const [workspace, setWorkspace] = useState<WorkspaceWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);

  const loadWorkspace = async () => {
    try {
      const data = await api.getWorkspaceWithMembers(workspaceId);
      setWorkspace(data);
    } catch (err) {
      setError('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);

    try {
      await api.inviteUser(workspaceId, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(workspaceId, memberId);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await api.updateMemberRole(workspaceId, memberId, newRole);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Share "{workspace?.name}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleInvite} className="flex gap-2 mb-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email to invite"
              className="flex-1 px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {inviting ? '...' : 'Invite'}
            </button>
          </form>

          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 rounded text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workspace?.members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-2 rounded hover:bg-surface"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                      {member.user?.name?.[0] || member.user?.email?.[0] || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {member.user?.name || member.user?.email}
                      </div>
                      <div className="text-xs text-gray-500">{member.user?.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <span className={`px-2 py-1 rounded text-xs ${getRoleColor(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    ) : (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                          className="px-2 py-1 text-xs border border-border rounded"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
