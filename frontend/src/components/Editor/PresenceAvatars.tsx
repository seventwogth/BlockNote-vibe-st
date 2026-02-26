import { useMemo } from 'react';

interface UserPresence {
  user_id: string;
  user_name: string;
  color: string;
  cursor?: { x: number; y: number };
  is_typing: boolean;
}

interface PresenceAvatarsProps {
  presence: UserPresence[];
  currentUserId?: string;
  maxVisible?: number;
}

export function PresenceAvatars({ presence, currentUserId, maxVisible = 5 }: PresenceAvatarsProps) {
  const otherUsers = useMemo(() => 
    presence.filter(p => p.user_id !== currentUserId),
    [presence, currentUserId]
  );

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const overflowCount = Math.max(0, otherUsers.length - maxVisible);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTypingUsers = () => {
    return otherUsers.filter(p => p.is_typing).map(p => p.user_name);
  };

  const typingUsers = getTypingUsers();

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.user_id}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
              title={user.user_name}
            >
              {getInitials(user.user_name)}
            </div>
            {user.is_typing && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
              </div>
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {user.user_name}
              {user.is_typing && ' (typing...)'}
            </div>
          </div>
        ))}
        {overflowCount > 0 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white shadow-sm"
            title={`+${overflowCount} more`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
      
      {typingUsers.length > 0 && (
        <span className="text-xs text-text-secondary ml-2">
          {typingUsers.length === 1 
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`
          }
        </span>
      )}
    </div>
  );
}
