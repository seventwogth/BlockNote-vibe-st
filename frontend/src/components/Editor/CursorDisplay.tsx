interface UserPresence {
  user_id: string;
  user_name: string;
  color: string;
  cursor?: { x: number; y: number };
  is_typing: boolean;
}

interface CursorDisplayProps {
  presence: UserPresence[];
  currentUserId?: string;
}

export function CursorDisplay({ presence, currentUserId }: CursorDisplayProps) {
  const otherUsersWithCursors = presence.filter(
    p => p.user_id !== currentUserId && p.cursor
  );

  if (otherUsersWithCursors.length === 0) return null;

  return (
    <>
      {otherUsersWithCursors.map((user) => {
        if (!user.cursor) return null;
        
        return (
          <div
            key={user.user_id}
            className="fixed pointer-events-none z-40 transition-all duration-100 ease-out"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L16.2507 12.3673H5.65376Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <div
              className="absolute left-4 top-4 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.user_name}
            </div>
          </div>
        );
      })}
    </>
  );
}
