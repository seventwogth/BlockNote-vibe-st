import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MentionsPopupProps {
  query: string;
  position: { x: number; y: number };
  onSelect: (user: User) => void;
  onClose: () => void;
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com' },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com' },
];

export function MentionsPopup({ query, position, onSelect, onClose }: MentionsPopupProps) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = MOCK_USERS.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredUsers(filtered);
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredUsers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[selectedIndex]) {
          onSelect(filteredUsers[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[240px] max-h-[200px] overflow-y-auto"
      style={{ left: position.x, top: position.y }}
    >
      {filteredUsers.length === 0 ? (
        <div className="px-3 py-2 text-sm text-text-secondary">No users found</div>
      ) : (
        filteredUsers.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
              index === selectedIndex ? 'bg-hover' : 'hover:bg-hover'
            }`}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                {getInitials(user.name)}
              </div>
            )}
            <div>
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-text-secondary">{user.email}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function useMentions(inputRef: React.RefObject<HTMLDivElement | null>) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });

  const handleInput = (_e: React.FormEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = range.startContainer.textContent || '';
    
    const cursorPos = range.startOffset;
    const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
    
    if (lastAtPos !== -1) {
      const textAfterAt = text.slice(lastAtPos + 1, cursorPos);
      if (!textAfterAt.includes(' ') && textAfterAt.length > 0) {
        const rect = range.getBoundingClientRect();
        setMentionQuery(textAfterAt);
        setMentionPosition({ x: rect.left, y: rect.bottom + 4 });
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (user: User) => {
    if (!inputRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = range.startContainer.textContent || '';
    const cursorPos = range.startOffset;
    const lastAtPos = text.lastIndexOf('@', cursorPos - 1);

    if (lastAtPos !== -1) {
      const textNode = range.startContainer;
      textNode.textContent = text.slice(0, lastAtPos) + `@${user.name} ` + text.slice(cursorPos);
    }

    setShowMentions(false);
  };

  return {
    showMentions,
    mentionQuery,
    mentionPosition,
    handleInput,
    insertMention,
    closeMentions: () => setShowMentions(false),
  };
}
