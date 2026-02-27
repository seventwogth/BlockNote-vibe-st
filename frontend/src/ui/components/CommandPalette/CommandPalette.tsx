import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string[];
  action: () => void;
  disabled?: boolean;
}

interface CommandGroup {
  id: string;
  label?: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups?: CommandGroup[];
  placeholder?: string;
  emptyMessage?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  groups = [],
  placeholder = 'Type a command or search...',
  emptyMessage = 'No results found.',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatItems = groups.flatMap(group => group.items);
  const filteredItems = query
    ? flatItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : flatItems;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.disabled) return;
    item.action();
    onOpenChange(false);
  }, [onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [filteredItems, selectedIndex, handleSelect, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      <div className="relative w-full max-w-lg bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-border">
          <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-4 bg-transparent text-text placeholder:text-text-secondary focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-text-secondary bg-bg-tertiary rounded">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-secondary">
              {emptyMessage}
            </p>
          ) : (
            groups.map((group) => {
              const groupItems = group.items.filter(item =>
                !query || 
                item.label.toLowerCase().includes(query.toLowerCase()) ||
                item.description?.toLowerCase().includes(query.toLowerCase())
              );
              
              if (groupItems.length === 0) return null;
              
              return (
                <div key={group.id} className="mb-2">
                  {group.label && (
                    <div className="px-3 py-1.5 text-xs font-medium text-text-secondary uppercase">
                      {group.label}
                    </div>
                  )}
                  {groupItems.map((item) => {
                    const globalIndex = flatItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={item.id}
                        data-index={globalIndex}
                        onClick={() => handleSelect(item)}
                        disabled={item.disabled}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg
                          text-left transition-colors duration-75
                          ${isSelected ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface-hover'}
                          ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {item.icon && (
                          <span className="flex-shrink-0 w-5 h-5">
                            {item.icon}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.label}
                          </div>
                          {item.description && (
                            <div className="text-xs text-text-secondary truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <div className="flex-shrink-0 flex gap-1">
                            {item.shortcut.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-1.5 py-0.5 text-xs bg-bg-tertiary rounded"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
