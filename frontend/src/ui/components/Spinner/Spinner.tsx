interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const colorMap = {
  primary: 'text-primary',
  white: 'text-white',
  gray: 'text-text-secondary',
};

export function Spinner({ size = 'md', color = 'primary' }: SpinnerProps) {
  return (
    <svg 
      className={`animate-spin ${sizeMap[size]} ${colorMap[color]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  );
}

interface LoadingProps {
  text?: string;
  overlay?: boolean;
}

export function Loading({ text = 'Loading...', overlay }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <Spinner size="lg" />
      {text && <p className="text-sm text-text-secondary">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-surface/80 flex items-center justify-center z-10">
        {content}
      </div>
    );
  }

  return content;
}

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
}

export function Skeleton({ width = '100%', height = '1rem', rounded = 'md' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-surface-secondary ${rounded}`}
      style={{ width, height }}
    />
  );
}
