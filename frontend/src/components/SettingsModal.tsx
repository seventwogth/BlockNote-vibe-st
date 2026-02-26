import { useState } from 'react';
import { Workspace } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from './ConfirmDialog';
import { useTheme } from '../hooks/useTheme';

interface SettingsModalProps {
  workspace: Workspace;
  onClose: () => void;
  onUpdate: (workspace: Workspace) => void;
  onDelete?: () => void;
}

export function SettingsModal({ workspace, onClose, onUpdate, onDelete }: SettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [icon, setIcon] = useState(workspace.icon || '📁');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'export' | 'danger'>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const { theme, setTheme } = useTheme();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, { name, icon });
      onUpdate(updated);
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportMarkdown = () => {
    const content = `# ${name}\n\nExported from BlockNote`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      console.error('Failed to delete workspace:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Workspace Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex border-b">
          {(['general', 'appearance', 'export', 'danger'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? tab === 'danger' 
                    ? 'border-b-2 border-red-500 text-red-600' 
                    : 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'danger' ? 'Danger Zone' : tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Workspace Icon</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIcon('📁')}
                    className={`text-2xl p-2 rounded ${icon === '📁' ? 'bg-surface ring-2 ring-primary' : 'hover:bg-surface'}`}
                  >
                    📁
                  </button>
                  <button
                    onClick={() => setIcon('💼')}
                    className={`text-2xl p-2 rounded ${icon === '💼' ? 'bg-surface ring-2 ring-primary' : 'hover:bg-surface'}`}
                  >
                    💼
                  </button>
                  <button
                    onClick={() => setIcon('📚')}
                    className={`text-2xl p-2 rounded ${icon === '📚' ? 'bg-surface ring-2 ring-primary' : 'hover:bg-surface'}`}
                  >
                    📚
                  </button>
                  <button
                    onClick={() => setIcon('🎯')}
                    className={`text-2xl p-2 rounded ${icon === '🎯' ? 'bg-surface ring-2 ring-primary' : 'hover:bg-surface'}`}
                  >
                    🎯
                  </button>
                  <button
                    onClick={() => setIcon('🚀')}
                    className={`text-2xl p-2 rounded ${icon === '🚀' ? 'bg-surface ring-2 ring-primary' : 'hover:bg-surface'}`}
                  >
                    🚀
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex-1 py-3 border rounded ${theme === 'light' ? 'bg-primary text-white' : 'hover:bg-surface'}`}
                  >
                    ☀️ Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex-1 py-3 border rounded ${theme === 'dark' ? 'bg-primary text-white' : 'hover:bg-surface'}`}
                  >
                    🌙 Dark
                  </button>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Current theme: {theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Export Options</label>
                <button
                  onClick={handleExportMarkdown}
                  className="w-full py-3 border border-border rounded hover:bg-surface flex items-center justify-center gap-2"
                >
                  📄 Export as Markdown
                </button>
              </div>
              <p className="text-xs text-gray-500">
                More export formats coming soon (PDF, HTML, etc.)
              </p>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-medium mb-2">Delete Workspace</h3>
                <p className="text-sm text-red-600 mb-4">
                  This will permanently delete the workspace and all its pages. This action cannot be undone.
                </p>
                <div className="mb-4">
                  <label className="block text-sm text-red-700 mb-1">
                    Type <strong>{workspace.name}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded focus:outline-none focus:border-red-500"
                    placeholder={workspace.name}
                  />
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={confirmName !== workspace.name}
                  className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          )}
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
