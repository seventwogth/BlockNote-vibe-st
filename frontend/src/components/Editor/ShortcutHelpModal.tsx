interface Shortcut {
  keys: string;
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: 'Ctrl + /', description: 'Show keyboard shortcuts' },
      { keys: '?', description: 'Show keyboard shortcuts' },
      { keys: 'Ctrl + K', description: 'Quick search' },
      { keys: 'Ctrl + S', description: 'Save page' },
      { keys: 'Ctrl + \\', description: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Text Formatting',
    shortcuts: [
      { keys: 'Ctrl + B', description: 'Bold' },
      { keys: 'Ctrl + I', description: 'Italic' },
      { keys: 'Ctrl + U', description: 'Underline' },
      { keys: 'Ctrl + Shift + S', description: 'Strikethrough' },
      { keys: 'Ctrl + E', description: 'Inline code' },
      { keys: 'Ctrl + Shift + H', description: 'Highlight' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: 'Ctrl + Z', description: 'Undo' },
      { keys: 'Ctrl + Shift + Z', description: 'Redo' },
      { keys: 'Ctrl + D', description: 'Duplicate block' },
      { keys: 'Ctrl + Shift + D', description: 'Delete block' },
      { keys: '/', description: 'Open slash commands' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl + /', description: 'Focus mode' },
      { keys: '↑ / ↓', description: 'Navigate blocks' },
      { keys: 'Enter', description: 'New line / Open block' },
      { keys: 'Tab', description: 'Indent / Outdent' },
    ],
  },
];

interface ShortcutHelpModalProps {
  onClose: () => void;
}

export function ShortcutHelpModal({ onClose }: ShortcutHelpModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
          <h2 className="text-lg font-semibold text-text dark:text-white">Keyboard Shortcuts</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text dark:text-gray-400 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-3">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut) => (
                    <div 
                      key={shortcut.keys}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-text dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-0.5 text-xs bg-surface dark:bg-gray-700 border border-border dark:border-gray-600 rounded text-text-secondary dark:text-gray-400 font-mono">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border dark:border-gray-700 text-center">
          <p className="text-xs text-text-secondary dark:text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-surface dark:bg-gray-700 border border-border dark:border-gray-600 rounded text-xs">?</kbd> or <kbd className="px-1.5 py-0.5 bg-surface dark:bg-gray-700 border border-border dark:border-gray-600 rounded text-xs">Ctrl + /</kbd> to toggle this menu
          </p>
        </div>
      </div>
    </div>
  );
}
