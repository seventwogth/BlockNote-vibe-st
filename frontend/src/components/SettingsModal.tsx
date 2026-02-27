import { useState, useEffect } from 'react';
import { Workspace, WorkspaceMember, User } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from './ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';

type SettingsTab = 'general' | 'appearance' | 'members' | 'notifications' | 'shortcuts' | 'import' | 'danger';

const WORKSPACE_ICONS = ['📁', '💼', '📚', '🎯', '🚀', '🌟', '💡', '🎨', '🏠', '🌈'];

const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘', 'K'], action: 'Open search' },
  { keys: ['⌘', 'S'], action: 'Save page' },
  { keys: ['⌘', 'B'], action: 'Bold text' },
  { keys: ['⌘', 'I'], action: 'Italic text' },
  { keys: ['⌘', 'U'], action: 'Underline text' },
  { keys: ['⌘', 'E'], action: 'Strikethrough' },
  { keys: ['⌘', 'Shift', 'H'], action: 'Highlight' },
  { keys: ['⌘', '/'], action: 'Open slash commands' },
  { keys: ['⌘', 'Shift', 'L'], action: 'Turn into link' },
  { keys: ['⌘', 'Shift', 'M'], action: 'Turn into code' },
  { keys: ['⌘', 'Enter'], action: 'Open mention popup' },
  { keys: ['⌘', 'Shift', '1'], action: 'Heading 1' },
  { keys: ['⌘', 'Shift', '2'], action: 'Heading 2' },
  { keys: ['⌘', 'Shift', '3'], action: 'Heading 3' },
  { keys: ['⌘', 'Shift', '4'], action: 'Toggle bullet list' },
  { keys: ['⌘', 'Shift', '5'], action: 'Toggle numbered list' },
  { keys: ['⌘', 'Shift', '6'], action: 'Toggle to-do' },
  { keys: ['⌘', 'Shift', '7'], action: 'Toggle quote' },
  { keys: ['⌘', 'Shift', '8'], action: 'Toggle callout' },
  { keys: ['⌘', 'Shift', '9'], action: 'Toggle divider' },
];

interface SettingsModalProps {
  workspace: Workspace;
  onClose: () => void;
  onUpdate: (workspace: Workspace) => void;
  onDelete?: () => void;
  currentUser?: User;
}

export function SettingsModal({ workspace, onClose, onUpdate, onDelete, currentUser }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  
  // General tab state
  const [name, setName] = useState(workspace.name);
  const [icon, setIcon] = useState(workspace.icon || '📁');
  const [description, setDescription] = useState(workspace.description || '');
  
  // Members tab state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [inviting, setInviting] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState({
    emailOnMention: true,
    emailOnComment: true,
    emailOnShare: false,
    browserNotifications: true,
  });

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
    { id: 'import', label: 'Import', icon: '📥' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ];

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab]);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const workspaceData = await api.getWorkspaceWithMembers(workspace.id);
      setMembers(workspaceData.members);
    } catch (err) {
      console.error('Failed to load members:', err);
      showToast('Failed to load members', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, { name, icon, description });
      onUpdate(updated);
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      await api.inviteUser(workspace.id, inviteEmail, inviteRole);
      setInviteEmail('');
      await loadMembers();
      showToast('Invitation sent', 'success');
    } catch (err) {
      showToast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeMember(workspace.id, userId);
      await loadMembers();
      showToast('Member removed', 'success');
    } catch (err) {
      showToast('Failed to remove member', 'error');
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.updateMemberRole(workspace.id, userId, role);
      await loadMembers();
      showToast('Role updated', 'success');
    } catch (err) {
      showToast('Failed to update role', 'error');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (confirmName !== workspace.name) return;
    try {
      await api.deleteWorkspace(workspace.id);
      setShowDeleteConfirm(false);
      if (onDelete) {
        onDelete();
      } else {
        window.location.reload();
      }
    } catch (err) {
      showToast('Failed to delete workspace', 'error');
    }
  };

  const handleExportMarkdown = async () => {
    showToast('Preparing export...', 'info');
    // In a real app, this would fetch all pages and export them
    const content = `# ${name}\n\nExported from BlockNote`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export complete', 'success');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'editor': return 'bg-green-100 text-green-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-surface-hover transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-border p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.id
                    ? tab.id === 'danger'
                      ? 'bg-error/10 text-error'
                      : 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-3">Workspace Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {WORKSPACE_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setIcon(emoji)}
                        className={`text-2xl p-2 rounded-lg transition-colors ${
                          icon === emoji
                            ? 'bg-primary/10 ring-2 ring-primary'
                            : 'hover:bg-surface-hover'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Workspace Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                    placeholder="Add a description..."
                  />
                </div>

                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="w-full py-2.5 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-3">Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 border rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">☀️</div>
                      <div className="font-medium text-text">Light</div>
                      <div className="text-xs text-text-secondary">Bright and clean</div>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 border rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">🌙</div>
                      <div className="font-medium text-text">Dark</div>
                      <div className="text-xs text-text-secondary">Easy on the eyes</div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-surface-secondary rounded-lg">
                  <p className="text-sm text-text-secondary">
                    Current theme: <span className="font-medium text-text">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-text mb-3">Invite Members</h3>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:border-primary"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer' | 'admin')}
                      className="px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:border-primary"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {inviting ? '...' : 'Invite'}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="font-medium text-text mb-3">Team Members ({members.length})</h3>
                  {membersLoading ? (
                    <div className="text-center py-8 text-text-secondary">Loading...</div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                              {member.user?.name?.[0] || member.user?.email?.[0] || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-text">
                                {member.user?.name || member.user?.email || 'Unknown'}
                              </div>
                              <div className="text-xs text-text-secondary">{member.user?.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.role === 'owner' ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                                {member.role}
                              </span>
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                className="px-2 py-1 text-xs border border-border rounded bg-surface text-text focus:outline-none focus:border-primary"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                            {member.role !== 'owner' && member.user_id !== currentUser?.id && (
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="p-1 text-text-secondary hover:text-error transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-text mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg cursor-pointer">
                      <div>
                        <div className="font-medium text-text">Mentions</div>
                        <div className="text-xs text-text-secondary">Get notified when someone mentions you</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailOnMention}
                        onChange={(e) => setNotifications({ ...notifications, emailOnMention: e.target.checked })}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg cursor-pointer">
                      <div>
                        <div className="font-medium text-text">Comments</div>
                        <div className="text-xs text-text-secondary">Get notified of new comments</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailOnComment}
                        onChange={(e) => setNotifications({ ...notifications, emailOnComment: e.target.checked })}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg cursor-pointer">
                      <div>
                        <div className="font-medium text-text">Shared Pages</div>
                        <div className="text-xs text-text-secondary">Get notified when pages are shared with you</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailOnShare}
                        onChange={(e) => setNotifications({ ...notifications, emailOnShare: e.target.checked })}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-text mb-4">Browser Notifications</h3>
                  <label className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg cursor-pointer">
                    <div>
                      <div className="font-medium text-text">Push Notifications</div>
                      <div className="text-xs text-text-secondary">Receive notifications even when the app is closed</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.browserNotifications}
                      onChange={(e) => setNotifications({ ...notifications, browserNotifications: e.target.checked })}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Use keyboard shortcuts to speed up your workflow.
                </p>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                    >
                      <span className="text-text">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-text-secondary"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-text mb-3">Export Data</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full p-4 border border-border rounded-lg hover:bg-surface-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-2xl">📄</span>
                      <div className="text-left">
                        <div className="font-medium text-text">Export as Markdown</div>
                        <div className="text-xs text-text-secondary">Download all pages as Markdown files</div>
                      </div>
                    </button>
                    <button
                      disabled
                      className="w-full p-4 border border-border rounded-lg opacity-50 flex items-center gap-3 cursor-not-allowed"
                    >
                      <span className="text-2xl">📑</span>
                      <div className="text-left">
                        <div className="font-medium text-text">Export as PDF</div>
                        <div className="text-xs text-text-secondary">Coming soon</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-text mb-3">Import Data</h3>
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full p-4 border border-border rounded-lg opacity-50 flex items-center gap-3 cursor-not-allowed"
                    >
                      <span className="text-2xl">📝</span>
                      <div className="text-left">
                        <div className="font-medium text-text">Import from Notion</div>
                        <div className="text-xs text-text-secondary">Coming soon</div>
                      </div>
                    </button>
                    <button
                      disabled
                      className="w-full p-4 border border-border rounded-lg opacity-50 flex items-center gap-3 cursor-not-allowed"
                    >
                      <span className="text-2xl">📎</span>
                      <div className="text-left">
                        <div className="font-medium text-text">Import from Markdown</div>
                        <div className="text-xs text-text-secondary">Coming soon</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                  <h3 className="font-medium text-error mb-2">Delete Workspace</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    This will permanently delete the workspace and all its pages. This action cannot be undone.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm text-text mb-1">
                      Type <strong>{workspace.name}</strong> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      className="w-full px-3 py-2 border border-error/30 rounded-md bg-surface text-text focus:outline-none focus:border-error"
                      placeholder={workspace.name}
                    />
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={confirmName !== workspace.name}
                    className="w-full py-2.5 bg-error text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete Workspace"
          message={`Are you sure you want to delete "${workspace.name}"? This will permanently delete the workspace and all its pages.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteWorkspace}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      </div>
    </div>
  );
}
