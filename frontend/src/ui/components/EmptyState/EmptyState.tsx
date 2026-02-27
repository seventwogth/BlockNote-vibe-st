import { ReactNode } from 'react';
import { Button } from '../Button/Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="text-5xl mb-4 opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-text mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          {description}
        </p>
      )}
      <div className="flex gap-3">
        {secondaryAction && (
          <Button 
            variant="secondary" 
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button 
            variant="primary" 
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'form';
  count?: number;
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const variants = {
    card: (
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="h-4 bg-surface-secondary rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-surface-secondary rounded w-1/2 animate-pulse" />
        <div className="h-20 bg-surface-secondary rounded animate-pulse" />
      </div>
    ),
    list: (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 bg-surface-secondary rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-secondary rounded w-1/3 animate-pulse" />
            <div className="h-2 bg-surface-secondary rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    ),
    table: (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-surface-secondary h-10 flex items-center px-4 gap-4">
          <div className="h-3 bg-surface-secondary rounded w-20 animate-pulse" />
          <div className="h-3 bg-surface-secondary rounded w-32 animate-pulse" />
          <div className="h-3 bg-surface-secondary rounded w-24 animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-t border-border flex items-center px-4 gap-4">
            <div className="h-3 bg-surface-secondary rounded w-20 animate-pulse" />
            <div className="h-3 bg-surface-secondary rounded w-32 animate-pulse" />
            <div className="h-3 bg-surface-secondary rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
    ),
    form: (
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="h-3 bg-surface-secondary rounded w-16 animate-pulse" />
          <div className="h-10 bg-surface-secondary rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-surface-secondary rounded w-20 animate-pulse" />
          <div className="h-10 bg-surface-secondary rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-surface-secondary rounded w-24 animate-pulse" />
          <div className="h-24 bg-surface-secondary rounded animate-pulse" />
        </div>
      </div>
    ),
  };

  return (
    <div className={count > 1 ? 'space-y-4' : ''}>
      {[...Array(count)].map((_, i) => (
        <div key={i}>{variants[variant]}</div>
      ))}
    </div>
  );
}
