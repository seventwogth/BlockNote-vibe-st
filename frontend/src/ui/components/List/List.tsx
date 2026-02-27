import { HTMLAttributes, forwardRef } from 'react';

interface ListProps extends HTMLAttributes<HTMLUListElement> {
  variant?: 'default' | 'unstyled';
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'divide-y divide-border',
  unstyled: '',
};

const gapStyles = {
  none: '',
  sm: 'space-y-1',
  md: 'space-y-2',
  lg: 'space-y-4',
};

export const List = forwardRef<HTMLUListElement, ListProps>(({
  variant = 'default',
  gap = 'none',
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <ul
      ref={ref}
      className={`
        ${variantStyles[variant]}
        ${gapStyles[gap]}
        ${variant === 'default' ? 'divide-y divide-border' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </ul>
  );
});

List.displayName = 'List';

interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
  active?: boolean;
  disabled?: boolean;
}

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(({
  active = false,
  disabled = false,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <li
      ref={ref}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md
        transition-colors duration-150
        ${active ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover text-text'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {children}
    </li>
  );
});

ListItem.displayName = 'ListItem';

interface ListItemIconProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ListItemIcon = forwardRef<HTMLDivElement, ListItemIconProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`flex-shrink-0 w-5 h-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

ListItemIcon.displayName = 'ListItemIcon';

interface ListItemTitleProps extends HTMLAttributes<HTMLSpanElement> {}

export const ListItemTitle = forwardRef<HTMLSpanElement, ListItemTitleProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={`font-medium text-sm ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});

ListItemTitle.displayName = 'ListItemTitle';

interface ListItemDescriptionProps extends HTMLAttributes<HTMLSpanElement> {}

export const ListItemDescription = forwardRef<HTMLSpanElement, ListItemDescriptionProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={`text-xs text-text-secondary ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});

ListItemDescription.displayName = 'ListItemDescription';

interface ListItemActionProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ListItemAction = forwardRef<HTMLDivElement, ListItemActionProps>(({
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`ml-auto flex-shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

ListItemAction.displayName = 'ListItemAction';
