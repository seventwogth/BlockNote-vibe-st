import { useState, useEffect } from 'react';
import { Workspace, User } from '../types';
import { useSettingsViewModel } from '../viewmodels/useSettingsViewModel';
import { ConfirmDialog } from './ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import { Button } from '../ui/components/Button/Button';
import { Input, Textarea } from '../ui/components/Input/Input';
import { Select } from '../ui/components/Dropdown/Dropdown';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/components/Card/Card';
import { Switch } from '../ui/components/Switch/Switch';
import { Badge } from '../ui/components/Badge/Badge';
import { Avatar } from '../ui/components/Avatar/Avatar';
import { Spinner } from '../ui/components/Spinner/Spinner';

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

export function SettingsModal({ workspace, onClose, onUpdate, currentUser }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const { theme, setTheme } = useTheme();

  const {
    name,
    setName,
    icon,
    setIcon,
    description,
    setDescription,
    members,
    membersLoading,
    saving,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    notifications,
    loadMembers,
    saveGeneral,
    inviteMember,
    removeMember,
    updateMemberRole,
    deleteWorkspace,
    exportMarkdown,
  } = useSettingsViewModel({ workspace });

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab, loadMembers]);

  useEffect(() => {
    if (showDeleteConfirm && confirmName === workspace.name) {
      handleDelete();
    }
  }, [confirmName]);

  const handleSave = async () => {
    const updated = await saveGeneral();
    if (updated) {
      onUpdate(updated);
    }
  };

  const handleDelete = async () => {
    await deleteWorkspace();
    setShowDeleteConfirm(false);
    window.location.reload();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'purple';
      case 'admin': return 'blue';
      case 'editor': return 'green';
      case 'viewer': return 'gray';
      default: return 'gray';
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
    { id: 'import', label: 'Import', icon: '📥' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-text">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-surface-hover transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace Icon</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Workspace Name</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter workspace name"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a description..."
                      rows={3}
                    />
                  </CardContent>
                </Card>

                <Button onClick={handleSave} loading={saving} fullWidth>
                  Save Changes
                </Button>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invite Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1"
                      />
                      <Select
                        value={inviteRole}
                        onChange={(value) => setInviteRole(value as 'editor' | 'viewer' | 'admin')}
                        options={[
                          { value: 'viewer', label: 'Viewer' },
                          { value: 'editor', label: 'Editor' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                      />
                      <Button onClick={inviteMember} disabled={!inviteEmail.trim()}>
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Team Members ({members.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {membersLoading ? (
                      <div className="flex justify-center py-8">
                        <Spinner />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar name={member.user?.name || member.user?.email} />
                              <div>
                                <div className="font-medium text-text">
                                  {member.user?.name || member.user?.email || 'Unknown'}
                                </div>
                                <div className="text-xs text-text-secondary">{member.user?.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.role === 'owner' ? (
                                <Badge variant={getRoleBadgeColor(member.role) as any}>
                                  {member.role}
                                </Badge>
                              ) : (
                                <Select
                                  value={member.role}
                                  onChange={(value) => updateMemberRole(member.user_id, value)}
                                  options={[
                                    { value: 'viewer', label: 'Viewer' },
                                    { value: 'editor', label: 'Editor' },
                                    { value: 'admin', label: 'Admin' },
                                  ]}
                                  className="text-xs"
                                />
                              )}
                              {member.role !== 'owner' && member.user_id !== currentUser?.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMember(member.user_id)}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Switch
                      label="Mentions"
                      description="Get notified when someone mentions you"
                      checked={notifications.emailOnMention}
                      onChange={() => {}}
                    />
                    <Switch
                      label="Comments"
                      description="Get notified of new comments"
                      checked={notifications.emailOnComment}
                      onChange={() => {}}
                    />
                    <Switch
                      label="Shared Pages"
                      description="Get notified when pages are shared with you"
                      checked={notifications.emailOnShare}
                      onChange={() => {}}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Browser Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Switch
                      label="Push Notifications"
                      description="Receive notifications even when the app is closed"
                      checked={notifications.browserNotifications}
                      onChange={() => {}}
                    />
                  </CardContent>
                </Card>
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
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
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
                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" fullWidth onClick={exportMarkdown}>
                      📄 Export as Markdown
                    </Button>
                    <Button variant="outline" fullWidth disabled>
                      📑 Export as PDF (Coming soon)
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Import Data</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" fullWidth disabled>
                      📝 Import from Notion (Coming soon)
                    </Button>
                    <Button variant="outline" fullWidth disabled>
                      📎 Import from Markdown (Coming soon)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <Card className="border-error/20 bg-error/5">
                  <CardHeader>
                    <CardTitle className="text-error">Delete Workspace</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-text-secondary mb-4">
                      This will permanently delete the workspace and all its pages. This action cannot be undone.
                    </p>
                    <div className="mb-4">
                      <label className="block text-sm text-text mb-1">
                        Type <strong>{workspace.name}</strong> to confirm
                      </label>
                      <Input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={workspace.name}
                      />
                    </div>
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={confirmName !== workspace.name}
                    >
                      Delete Workspace
                    </Button>
                  </CardContent>
                </Card>
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
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      </div>
    </div>
  );
}
