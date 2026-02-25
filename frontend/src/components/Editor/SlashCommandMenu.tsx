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
}

const commands: Command[] = [
  { label: 'Text', description: 'Just start writing with plain text', icon: 'T', command: 'text' },
  { label: 'Heading 1', description: 'Big section heading', icon: 'H1', command: 'heading1' },
  { label: 'Heading 2', description: 'Medium section heading', icon: 'H2', command: 'heading2' },
  { label: 'Heading 3', description: 'Small section heading', icon: 'H3', command: 'heading3' },
  { label: 'Bullet List', description: 'Create a simple bullet list', icon: '•', command: 'bullet' },
  { label: 'Numbered List', description: 'Create a numbered list', icon: '1.', command: 'numbered' },
  { label: 'To-do', description: 'Track tasks with a to-do list', icon: '☐', command: 'todo' },
  { label: 'Quote', description: 'Capture a quote', icon: '"', command: 'quote' },
  { label: 'Code', description: 'Capture a code snippet', icon: '<>', command: 'code' },
  { label: 'Divider', description: 'Visually divide blocks', icon: '—', command: 'divider' },
  { label: 'Callout', description: 'Make writing stand out', icon: '💡', command: 'callout' },
];

export function SlashCommandMenu({ x, y, onSelect, onClose }: SlashCommandMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

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
  }, [search]);

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

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-2 min-w-[280px] max-h-[300px] overflow-y-auto"
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
      <div className="py-1">
        {filteredCommands.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">No results</div>
        ) : (
          filteredCommands.map((cmd, idx) => (
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
          ))
        )}
      </div>
    </div>
  );
}
