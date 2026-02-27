import { HTMLAttributes, forwardRef } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const variantStyles = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(({
  value = 0,
  max = 100,
  variant = 'default',
  size = 'md',
  showValue = false,
  className = '',
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      ref={ref}
      className={`w-full ${className}`}
      {...props}
    >
      <div
        className={`
          w-full bg-bg-tertiary rounded-full overflow-hidden
          ${sizeStyles[size]}
        `}
      >
        <div
          className={`
            h-full rounded-full transition-all duration-300
            ${variantStyles[variant]}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-text-secondary mt-1 block text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
});

Progress.displayName = 'Progress';

interface ProgressCircleProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const ProgressCircle = forwardRef<HTMLDivElement, ProgressCircleProps>(({
  value = 0,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  className = '',
  ...props
}, ref) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    default: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  };

  return (
    <div
      ref={ref}
      className={`relative inline-flex items-center justify-center ${className}`}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute text-xs font-medium text-text">
        {Math.round(percentage)}%
      </span>
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';
