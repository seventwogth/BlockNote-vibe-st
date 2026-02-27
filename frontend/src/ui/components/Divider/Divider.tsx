import { HTMLAttributes, forwardRef } from 'react';

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  variant?: 'default' | 'dashed' | 'dotted';
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

const variantStyles = {
  default: 'border-border',
  dashed: 'border-dashed border-border',
  dotted: 'border-dotted border-border',
};

export const Divider = forwardRef<HTMLHRElement, DividerProps>(({
  variant = 'default',
  orientation = 'horizontal',
  label,
  className = '',
  ...props
}, ref) => {
  if (orientation === 'vertical') {
    return (
      <div
        ref={ref}
        className={`
          w-px h-full bg-border
          ${variant === 'dashed' ? 'border-l border-dashed' : ''}
          ${variant === 'dotted' ? 'border-l border-dotted' : ''}
          mx-2
          ${className}
        `}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        ref={ref as any}
        className={`flex items-center gap-4 ${className}`}
        {...props}
      >
        <div className={`flex-1 h-px bg-border ${variant !== 'default' ? 'border-dashed border-t-0 border-x-0 border-border' : ''}`} />
        <span className="text-xs text-text-secondary font-medium">{label}</span>
        <div className={`flex-1 h-px bg-border ${variant !== 'default' ? 'border-dashed border-t-0 border-x-0 border-border' : ''}`} />
      </div>
    );
  }

  return (
    <hr
      ref={ref}
      className={`
        border-0 h-px bg-border my-4
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  );
});

Divider.displayName = 'Divider';

interface DividerVerticalProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const verticalSizes = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
};

export const DividerVertical = forwardRef<HTMLDivElement, DividerVerticalProps>(({
  size = 'md',
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`w-px bg-border mx-1 ${verticalSizes[size]} ${className}`}
      {...props}
    />
  );
});

DividerVertical.displayName = 'DividerVertical';
