import { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const statusColors = {
  online: 'bg-success',
  offline: 'bg-gray-400',
  busy: 'bg-error',
  away: 'bg-warning',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt, name, size = 'md', status }: AvatarProps) {
  const initials = getInitials(name || alt);

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-surface`}
        />
      ) : (
        <div 
          className={`
            ${sizeMap[size]} rounded-full 
            bg-primary text-white flex items-center justify-center font-medium
            ring-2 ring-surface
          `}
        >
          {initials}
        </div>
      )}
      {status && (
        <span 
          className={`
            absolute bottom-0 right-0 block w-3 h-3 rounded-full ring-2 ring-surface
            ${statusColors[status]}
          `}
        />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  children: ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ children, max = 4, size = 'sm' }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const visible = childArray.slice(0, max);
  const remaining = childArray.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((child, index) => (
        <div key={index} className="ring-2 ring-surface rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div 
          className={`
            ${sizeMap[size]} rounded-full bg-surface-secondary 
            text-text-secondary flex items-center justify-center 
            font-medium ring-2 ring-surface
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
