import { useState } from 'react';
import { Workspace } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  workspace: Workspace;
  onClose: () => void;
  onUpdate: (workspace: Workspace) => void;
}

export function SettingsModal({ workspace, onClose, onUpdate }: SettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [icon, setIcon] = useState(workspace.icon || '📁');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'export'>('general');

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updatePage(workspace.id, { title: name, icon });
      onUpdate({ ...workspace, name, icon: icon || undefined });
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
          {(['general', 'appearance', 'export'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
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
                  <button className="flex-1 py-3 border rounded hover:bg-surface">
                    ☀️ Light
                  </button>
                  <button className="flex-1 py-3 border rounded hover:bg-surface">
                    🌙 Dark
                  </button>
                  <button className="flex-1 py-3 border rounded hover:bg-surface">
                    💻 System
                  </button>
                </div>
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
        </div>
      </div>
    </div>
  );
}
