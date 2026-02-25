interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">📝</span>
        <span className="font-semibold text-text-primary">BlockNote</span>
      </div>
      
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-secondary">
            {user.name || user.email}
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
