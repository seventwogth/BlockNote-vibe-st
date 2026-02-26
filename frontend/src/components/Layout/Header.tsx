import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">📝</span>
        <span className="font-semibold text-text">BlockNote</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-text hover:bg-hover rounded-lg transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-hover rounded-lg transition-colors"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {getInitials(user.name || user.email)}
                </div>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-text truncate">{user.name || 'User'}</p>
                  <p className="text-sm text-text-secondary truncate">{user.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    toggleTheme();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text hover:bg-hover flex items-center gap-3"
                >
                  {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>

                <button
                  className="w-full px-4 py-2 text-left text-sm text-text hover:bg-hover flex items-center gap-3"
                >
                  ⚙️ Settings
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
