import { useState, useEffect, useRef } from 'react';

interface SlashCommandMenuProps {
  x: number;
  y: number;
  onSelect: (command: string) => void;
  onClose: () => void;
}

interface Command {
  label: string;
  description: string;
  icon: string;
  command: string;
  category: string;
}

const commands: Command[] = [
  { label: 'Text', description: 'Just start writing with plain text', icon: 'T', command: 'text', category: 'Basic' },
  { label: 'Heading 1', description: 'Big section heading', icon: 'H1', command: 'heading1', category: 'Basic' },
  { label: 'Heading 2', description: 'Medium section heading', icon: 'H2', command: 'heading2', category: 'Basic' },
  { label: 'Heading 3', description: 'Small section heading', icon: 'H3', command: 'heading3', category: 'Basic' },
  { label: 'Bullet List', description: 'Create a simple bullet list', icon: '•', command: 'bullet', category: 'Lists' },
  { label: 'Numbered List', description: 'Create a numbered list', icon: '1.', command: 'numbered', category: 'Lists' },
  { label: 'To-do', description: 'Track tasks with a to-do list', icon: '☐', command: 'todo', category: 'Lists' },
  { label: 'Toggle', description: 'Hide and show content', icon: '▶', command: 'toggle', category: 'Lists' },
  { label: 'Quote', description: 'Capture a quote', icon: '"', command: 'quote', category: 'Basic' },
  { label: 'Code', description: 'Capture a code snippet', icon: '<>', command: 'code', category: 'Advanced' },
  { label: 'Divider', description: 'Visually divide blocks', icon: '—', command: 'divider', category: 'Basic' },
  { label: 'Callout', description: 'Make writing stand out', icon: '💡', command: 'callout', category: 'Advanced' },
  { label: 'Table', description: 'Add a table', icon: '▦', command: 'table', category: 'Advanced' },
  { label: 'Image', description: 'Upload or embed an image', icon: '🖼️', command: 'image', category: 'Media' },
  { label: 'Video', description: 'Embed a YouTube or video', icon: '▶️', command: 'video', category: 'Media' },
  { label: 'Audio', description: 'Embed an audio file', icon: '🎵', command: 'audio', category: 'Media' },
  { label: 'Math', description: 'LaTeX math equation', icon: '∑', command: 'math', category: 'Advanced' },
  { label: 'Bookmark', description: 'Save a link as a bookmark', icon: '🔖', command: 'bookmark', category: 'Advanced' },
  { label: 'Embed', description: 'Embed content (YouTube, Twitter, Figma)', icon: '📐', command: 'embed', category: 'Media' },
  { label: 'Footnote', description: 'Add a footnote reference', icon: '⁽¹⁾', command: 'footnote', category: 'Advanced' },
];

const categories = ['Basic', 'Lists', 'Media', 'Advanced'];

export function SlashCommandMenu({ x, y, onSelect, onClose }: SlashCommandMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter(cmd => {
    const matchesSearch = cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || cmd.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedCommands = categories.reduce((acc, category) => {
    const cmds = filteredCommands.filter(cmd => cmd.category === category);
    if (cmds.length > 0) {
      acc[category] = cmds;
    }
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].command);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, selectedCategory]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      if (rect.right > viewportWidth) {
        adjustedX = x - rect.width;
      }
      if (rect.bottom > viewportHeight) {
        adjustedY = y - rect.height;
      }
      
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  let globalIndex = 0;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-2 min-w-[320px] max-h-[400px] overflow-y-auto"
      style={{ left: x, top: y }}
    >
      <div className="px-2 pb-2 border-b border-border">
        <input
          type="text"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-sm outline-none bg-transparent"
          autoFocus
        />
      </div>
      
      <div className="flex gap-1 px-2 py-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
            !selectedCategory ? 'bg-primary text-white' : 'bg-surface hover:bg-hover'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
              selectedCategory === cat ? 'bg-primary text-white' : 'bg-surface hover:bg-hover'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="py-1">
        {filteredCommands.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">No results</div>
        ) : (
          Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-3 py-1 text-xs font-semibold text-text-secondary uppercase bg-gray-50">
                {category}
              </div>
              {cmds.map((cmd) => {
                const idx = globalIndex++;
                return (
                  <button
                    key={cmd.command}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 ${
                      idx === selectedIndex ? 'bg-hover' : 'hover:bg-hover'
                    }`}
                    onClick={() => onSelect(cmd.command)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-surface rounded text-text-secondary text-sm font-medium">
                      {cmd.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{cmd.label}</div>
                      <div className="text-xs text-text-secondary">{cmd.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
